use crate::models::project::TestPlan;
use std::path::Path;

/// Discover .xctestplan files under the project path (root and one level of subdirs).
pub fn discover_test_plans(project_path: &str) -> Vec<TestPlan> {
    let root = Path::new(project_path);
    let mut plans = Vec::new();

    // Root directory
    collect_xctestplans_in_dir(root, &mut plans);

    // One level of subdirectories
    if let Ok(entries) = std::fs::read_dir(root) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                collect_xctestplans_in_dir(&p, &mut plans);
            }
        }
    }

    plans
}

fn collect_xctestplans_in_dir(dir: &Path, out: &mut Vec<TestPlan>) {
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_file() {
                if let Some(ext) = p.extension() {
                    if ext == "xctestplan" {
                        let path_str = p.to_string_lossy().to_string();
                        let name = p
                            .file_stem()
                            .and_then(|s| s.to_str())
                            .unwrap_or("Unknown")
                            .to_string();
                        out.push(TestPlan { name, path: path_str });
                    }
                }
            }
        }
    }
}
