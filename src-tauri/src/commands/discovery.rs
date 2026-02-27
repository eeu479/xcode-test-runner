use crate::discovery::{swift_package, test_plan, xcode_project};
use crate::models::project::ProjectInfo;

#[tauri::command]
pub fn discover_project(path: String) -> Result<ProjectInfo, String> {
    let schemes = xcode_project::discover_schemes(&path)?;
    let swift_packages = swift_package::discover_packages(&path)?;
    let test_plans = test_plan::discover_test_plans(&path);

    Ok(ProjectInfo {
        path,
        schemes,
        swift_packages,
        test_plans,
    })
}
