use crate::execution::runner;
use crate::models::run::TestRunEvent;
use crate::state::AppState;
use tauri::ipc::Channel;
use tauri::State;
use tokio_util::sync::CancellationToken;

#[derive(serde::Deserialize)]
pub struct RunTestsParams {
    pub project_path: String,
    /// Scheme + optional single test target to run (when running by targets).
    pub scheme_targets: Vec<SchemeTarget>,
    pub packages: Vec<PackageTarget>,
    pub stop_on_first_failure: bool,
    /// When running by test plan: scheme + test plan name per run.
    pub test_plan_runs: Vec<TestPlanRun>,
    /// Optional destination for xcodebuild (e.g. simulator UDID -> "id=UDID").
    pub destination: Option<String>,
}

#[derive(serde::Deserialize)]
pub struct SchemeTarget {
    pub scheme: String,
    pub only_testing_target: Option<String>,
}

#[derive(serde::Deserialize)]
pub struct TestPlanRun {
    pub scheme: String,
    pub test_plan_name: String,
}

#[derive(serde::Deserialize)]
pub struct PackageTarget {
    pub path: String,
    pub filter: Option<String>,
}

#[tauri::command]
pub async fn run_tests(
    state: State<'_, AppState>,
    params: RunTestsParams,
    on_event: Channel<TestRunEvent>,
) -> Result<String, String> {
    let run_id = uuid::Uuid::new_v4().to_string();
    let _ = on_event.send(TestRunEvent::RunStarted {
        run_id: run_id.clone(),
    });

    // Set up cancellation
    let cancel_token = CancellationToken::new();
    {
        let mut active = state.active_run_id.lock().await;
        *active = Some(run_id.clone());
        let mut token = state.cancellation_token.lock().await;
        *token = Some(cancel_token.clone());
    }

    let result_run_id = run_id.clone();

    // Create temp directory for result bundles
    let temp_dir = std::env::temp_dir()
        .join("xcode-test-runner")
        .join(&run_id);
    std::fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp dir: {}", e))?;

    let mut overall_success = true;

    // Run xcodebuild tests for each scheme target (by-target mode)
    for st in &params.scheme_targets {
        if cancel_token.is_cancelled() {
            break;
        }

        let key = match &st.only_testing_target {
            Some(t) => format!("{}|{}", st.scheme, t),
            None => st.scheme.clone(),
        };

        let build_args = crate::execution::xcodebuild::build_args(
            &params.project_path,
            &st.scheme,
            &temp_dir.to_string_lossy(),
            params.stop_on_first_failure,
            st.only_testing_target.as_deref(),
            None,
            params.destination.as_deref(),
        );

        let success = runner::spawn_and_stream(
            "xcodebuild",
            &build_args.args,
            &params.project_path,
            &on_event,
            cancel_token.clone(),
        )
        .await?;

        let _ = on_event.send(TestRunEvent::TargetCompleted {
            key: key.clone(),
            success,
        });
        if !success {
            overall_success = false;
        }
    }

    // Run xcodebuild tests for each test plan
    for tp in &params.test_plan_runs {
        if cancel_token.is_cancelled() {
            break;
        }

        let key = format!("plan:{}:{}", tp.scheme, tp.test_plan_name);

        let build_args = crate::execution::xcodebuild::build_args(
            &params.project_path,
            &tp.scheme,
            &temp_dir.to_string_lossy(),
            params.stop_on_first_failure,
            None,
            Some(&tp.test_plan_name),
            params.destination.as_deref(),
        );

        let success = runner::spawn_and_stream(
            "xcodebuild",
            &build_args.args,
            &params.project_path,
            &on_event,
            cancel_token.clone(),
        )
        .await?;

        let _ = on_event.send(TestRunEvent::TargetCompleted {
            key,
            success,
        });
        if !success {
            overall_success = false;
        }
    }

    // Run swift test for each package
    for pkg in &params.packages {
        if cancel_token.is_cancelled() {
            break;
        }

        let key = match &pkg.filter {
            Some(f) => format!("{}|{}", pkg.path, f),
            None => pkg.path.clone(),
        };

        let args =
            crate::execution::swift_test::build_args(&pkg.path, pkg.filter.as_deref());

        let success = runner::spawn_and_stream(
            "swift",
            &args,
            &pkg.path,
            &on_event,
            cancel_token.clone(),
        )
        .await?;

        let _ = on_event.send(TestRunEvent::TargetCompleted {
            key,
            success,
        });
        if !success {
            overall_success = false;
        }
    }

    // Send completion event
    let _ = on_event.send(TestRunEvent::RunFinished {
        run_id: result_run_id.clone(),
        success: overall_success,
    });

    // Clear active run
    {
        let mut active = state.active_run_id.lock().await;
        *active = None;
        let mut token = state.cancellation_token.lock().await;
        *token = None;
    }

    Ok(result_run_id)
}

#[tauri::command]
pub async fn cancel_run(state: State<'_, AppState>) -> Result<(), String> {
    let token = state.cancellation_token.lock().await;
    if let Some(cancel) = token.as_ref() {
        cancel.cancel();
        Ok(())
    } else {
        Err("No active run to cancel".into())
    }
}
