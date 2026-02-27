use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestRun {
    pub id: String,
    pub status: RunStatus,
    pub project_path: String,
    pub scope: String,
    pub started_at: String,
    pub finished_at: Option<String>,
    pub duration_ms: Option<i64>,
    pub total_tests: i32,
    pub passed_tests: i32,
    pub failed_tests: i32,
    pub skipped_tests: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum RunStatus {
    Running,
    Passed,
    Failed,
    Cancelled,
}

impl std::fmt::Display for RunStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RunStatus::Running => write!(f, "running"),
            RunStatus::Passed => write!(f, "passed"),
            RunStatus::Failed => write!(f, "failed"),
            RunStatus::Cancelled => write!(f, "cancelled"),
        }
    }
}

impl RunStatus {
    pub fn from_str(s: &str) -> Self {
        match s {
            "passed" => RunStatus::Passed,
            "failed" => RunStatus::Failed,
            "cancelled" => RunStatus::Cancelled,
            _ => RunStatus::Running,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestCase {
    pub id: Option<i64>,
    pub run_id: String,
    pub suite_name: String,
    pub test_name: String,
    pub status: TestStatus,
    pub duration_ms: Option<i64>,
    pub failure_message: Option<String>,
    pub file_path: Option<String>,
    pub line_number: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TestStatus {
    Passed,
    Failed,
    Skipped,
}

impl std::fmt::Display for TestStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TestStatus::Passed => write!(f, "passed"),
            TestStatus::Failed => write!(f, "failed"),
            TestStatus::Skipped => write!(f, "skipped"),
        }
    }
}

impl TestStatus {
    pub fn from_str(s: &str) -> Self {
        match s {
            "passed" => TestStatus::Passed,
            "failed" => TestStatus::Failed,
            _ => TestStatus::Skipped,
        }
    }
}

/// Events sent through the Tauri channel during test execution
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum TestRunEvent {
    RunStarted {
        run_id: String,
    },
    Stdout { line: String },
    Stderr { line: String },
    TestCompleted {
        name: String,
        suite: String,
        status: String,
        duration_ms: i64,
    },
    Progress {
        tests_run: i32,
        tests_total: i32,
    },
    RunFinished {
        run_id: String,
        success: bool,
    },
    TargetCompleted {
        key: String,
        success: bool,
    },
    Error {
        message: String,
    },
}
