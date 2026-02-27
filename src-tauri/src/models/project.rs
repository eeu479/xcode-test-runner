use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectInfo {
    pub path: String,
    pub schemes: Vec<Scheme>,
    pub swift_packages: Vec<SwiftPackage>,
    pub test_plans: Vec<TestPlan>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Scheme {
    pub name: String,
    /// Test target names from the scheme's Testables (from .xcscheme).
    /// Empty if scheme has no shared xcscheme or no testables.
    pub test_targets: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestPlan {
    pub name: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwiftPackage {
    pub name: String,
    pub path: String,
    pub test_targets: Vec<String>,
}

/// Progress event sent during project discovery for UI feedback.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanProgressEvent {
    pub phase: String,
    pub message: String,
}
