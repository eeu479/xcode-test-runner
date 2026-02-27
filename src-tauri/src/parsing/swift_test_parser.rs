use crate::models::run::TestRunEvent;
use regex::Regex;
use std::sync::LazyLock;

// Pattern: Test Case 'SuiteName.testMethod' passed (0.001 seconds)
static SWIFT_TEST_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"Test Case '([^.]+)\.(\S+)' (passed|failed) \((\d+\.\d+) seconds\)"
    ).unwrap()
});

/// Parse a single line of swift test stdout and return an event if applicable
pub fn parse_line(line: &str) -> Option<TestRunEvent> {
    if let Some(caps) = SWIFT_TEST_RE.captures(line) {
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

    None
}
