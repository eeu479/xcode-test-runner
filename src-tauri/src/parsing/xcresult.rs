use crate::models::run::{TestCase, TestStatus};
use std::process::Command;

/// Parse an xcresult bundle into structured test cases using xcresulttool
pub fn parse_xcresult(bundle_path: &str) -> Result<Vec<TestCase>, String> {
    let output = Command::new("xcrun")
        .args([
            "xcresulttool",
            "get",
            "--format",
            "json",
            "--path",
            bundle_path,
        ])
        .output()
        .map_err(|e| format!("Failed to run xcresulttool: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("xcresulttool failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    parse_xcresult_json(&stdout)
}

fn parse_xcresult_json(json_str: &str) -> Result<Vec<TestCase>, String> {
    let value: serde_json::Value =
        serde_json::from_str(json_str).map_err(|e| format!("Failed to parse xcresult JSON: {}", e))?;

    let mut test_cases = Vec::new();
    extract_test_cases(&value, &mut test_cases, "");
    Ok(test_cases)
}

fn extract_test_cases(value: &serde_json::Value, cases: &mut Vec<TestCase>, run_id: &str) {
    // xcresulttool output structure varies by Xcode version
    // This handles the common nested actions → testPlanRunSummaries → testableSummaries pattern
    if let Some(actions) = value.get("actions").and_then(|a| a.get("_values")).and_then(|v| v.as_array()) {
        for action in actions {
            if let Some(test_ref) = action.get("actionResult").and_then(|r| r.get("testsRef")) {
                let _ = test_ref; // Would need to follow the reference with another xcresulttool call
            }
        }
    }

    // Direct test summaries parsing
    if let Some(summaries) = value.get("testPlanRunSummaries").and_then(|s| s.get("_values")).and_then(|v| v.as_array()) {
        for summary in summaries {
            if let Some(testable_summaries) = summary.get("testableSummaries").and_then(|t| t.get("_values")).and_then(|v| v.as_array()) {
                for testable in testable_summaries {
                    extract_from_testable(testable, cases, run_id);
                }
            }
        }
    }
}

fn extract_from_testable(testable: &serde_json::Value, cases: &mut Vec<TestCase>, run_id: &str) {
    let suite_name = testable
        .get("targetName")
        .and_then(|n| n.get("_value"))
        .and_then(|v| v.as_str())
        .unwrap_or("Unknown")
        .to_string();

    if let Some(tests) = testable.get("tests").and_then(|t| t.get("_values")).and_then(|v| v.as_array()) {
        for test_group in tests {
            extract_test_items(test_group, cases, run_id, &suite_name);
        }
    }
}

fn extract_test_items(
    item: &serde_json::Value,
    cases: &mut Vec<TestCase>,
    run_id: &str,
    suite_name: &str,
) {
    // Check if this is a leaf test case
    if let Some(name) = item.get("name").and_then(|n| n.get("_value")).and_then(|v| v.as_str()) {
        let status_str = item
            .get("testStatus")
            .and_then(|s| s.get("_value"))
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");

        let duration = item
            .get("duration")
            .and_then(|d| d.get("_value"))
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse::<f64>().ok())
            .map(|d| (d * 1000.0) as i64);

        let status = match status_str {
            "Success" => TestStatus::Passed,
            "Failure" => TestStatus::Failed,
            _ => TestStatus::Skipped,
        };

        let failure_message = if status == TestStatus::Failed {
            item.get("failureSummaries")
                .and_then(|f| f.get("_values"))
                .and_then(|v| v.as_array())
                .and_then(|arr| arr.first())
                .and_then(|f| f.get("message"))
                .and_then(|m| m.get("_value"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        } else {
            None
        };

        // Only add leaf tests (not groups)
        if item.get("subtests").is_none() {
            cases.push(TestCase {
                id: None,
                run_id: run_id.to_string(),
                suite_name: suite_name.to_string(),
                test_name: name.to_string(),
                status,
                duration_ms: duration,
                failure_message,
                file_path: None,
                line_number: None,
            });
        }
    }

    // Recurse into subtests
    if let Some(subtests) = item.get("subtests").and_then(|s| s.get("_values")).and_then(|v| v.as_array()) {
        for subtest in subtests {
            extract_test_items(subtest, cases, run_id, suite_name);
        }
    }
}
