use crate::models::run::TestRunEvent;
use regex::Regex;
use std::sync::LazyLock;

// Pattern: Test Case '-[SuiteName testMethod]' passed (0.001 seconds).
static TEST_CASE_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"Test Case '-\[(\S+)\s+(\S+)\]' (passed|failed) \((\d+\.\d+) seconds\)\."
    ).unwrap()
});

// Pattern: Test Suite 'SuiteName' passed at ...
static TEST_SUITE_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"Test Suite '(\S+)' (passed|failed) at").unwrap()
});

/// Parse a single line of xcodebuild stdout and return an event if applicable
pub fn parse_line(line: &str) -> Option<TestRunEvent> {
    if let Some(caps) = TEST_CASE_RE.captures(line) {
        let suite = caps.get(1)?.as_str().to_string();
        let name = caps.get(2)?.as_str().to_string();
        let status = caps.get(3)?.as_str().to_string();
        let seconds: f64 = caps.get(4)?.as_str().parse().ok()?;
        let duration_ms = (seconds * 1000.0) as i64;

        return Some(TestRunEvent::TestCompleted {
            name,
            suite,
            status,
            duration_ms,
        });
    }

    // We could parse suite-level events too, but individual test cases
    // are more useful for real-time feedback
    let _ = TEST_SUITE_RE.is_match(line);

    None
}
