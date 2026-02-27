use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub project_path: String,
    pub default_scope: String,
    pub stop_on_first_failure: bool,
    pub notify_on_completion: bool,
    pub notify_only_on_failure: bool,
    pub retain_last_runs: i32,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            project_path: String::new(),
            default_scope: "all".into(),
            stop_on_first_failure: false,
            notify_on_completion: true,
            notify_only_on_failure: false,
            retain_last_runs: 50,
        }
    }
}
