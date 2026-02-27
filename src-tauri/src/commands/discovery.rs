use crate::discovery::{swift_package, test_plan, xcode_project};
use crate::models::project::{ProjectInfo, ScanProgressEvent};
use tauri::Emitter;

const SCAN_PROGRESS_EVENT: &str = "scan-progress";

fn emit_progress(app: &tauri::AppHandle, phase: &str, message: &str) {
    let _ = app.emit(
        SCAN_PROGRESS_EVENT,
        ScanProgressEvent {
            phase: phase.to_string(),
            message: message.to_string(),
        },
    );
}

#[tauri::command]
pub async fn discover_project(
    path: String,
    app: tauri::AppHandle,
) -> Result<ProjectInfo, String> {
    emit_progress(&app, "schemes", "Discovering schemes...");
    let schemes = xcode_project::discover_schemes(&path)?;

    emit_progress(&app, "packages", "Discovering Swift packages...");
    let swift_packages = swift_package::discover_packages(&path)?;

    emit_progress(&app, "test_plans", "Discovering test plans...");
    let test_plans = test_plan::discover_test_plans(&path);

    Ok(ProjectInfo {
        path,
        schemes,
        swift_packages,
        test_plans,
    })
}
