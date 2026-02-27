use std::path::PathBuf;

pub struct XcodebuildArgs {
    pub args: Vec<String>,
    pub result_bundle_path: PathBuf,
}

/// True if s looks like a simulator UDID (e.g. 36 chars, hex with dashes).
fn looks_like_udid(s: &str) -> bool {
    s.len() == 36
        && s.chars().filter(|&c| c == '-').count() == 4
        && s.chars()
            .all(|c| c.is_ascii_hexdigit() || c == '-')
}

/// Build xcodebuild test arguments for a scheme, with optional single test target or test plan.
pub fn build_args(
    project_path: &str,
    scheme: &str,
    result_bundle_dir: &str,
    _stop_on_first_failure: bool,
    only_testing_target: Option<&str>,
    test_plan_name: Option<&str>,
    destination: Option<&str>,
) -> XcodebuildArgs {
    let result_bundle_path = PathBuf::from(result_bundle_dir).join(format!("{}.xcresult", scheme));

    let mut args = vec![
        "test".to_string(),
        "-scheme".to_string(),
        scheme.to_string(),
        "-resultBundlePath".to_string(),
        result_bundle_path.to_string_lossy().to_string(),
    ];

    // Check for workspace vs project
    let path = std::path::Path::new(project_path);
    if let Some(ws) = find_ext(path, "xcworkspace") {
        args.extend(["-workspace".to_string(), ws]);
    } else if let Some(proj) = find_ext(path, "xcodeproj") {
        args.extend(["-project".to_string(), proj]);
    }

    if let Some(plan) = test_plan_name {
        args.extend(["-testPlan".to_string(), plan.to_string()]);
    }

    if let Some(target) = only_testing_target {
        args.push(format!("-only-testing:{}", target));
    }

    if let Some(dest) = destination {
        if !dest.is_empty() {
            let value = if looks_like_udid(dest) {
                format!("id={}", dest)
            } else {
                dest.to_string()
            };
            args.extend(["-destination".to_string(), value]);
        }
    }

    // Note: xcodebuild has no native "stop on first failure" flag; stop_on_first_failure
    // could be implemented by parsing output and killing the process (future enhancement).

    XcodebuildArgs {
        args,
        result_bundle_path,
    }
}

fn find_ext(dir: &std::path::Path, ext: &str) -> Option<String> {
    std::fs::read_dir(dir).ok()?.flatten().find_map(|entry| {
        let p = entry.path();
        if p.extension().is_some_and(|e| e == ext) {
            Some(p.to_string_lossy().to_string())
        } else {
            None
        }
    })
}
