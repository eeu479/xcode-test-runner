use crate::models::project::SwiftPackage;
use std::path::Path;
use std::process::Command;

/// Discover Swift packages with test targets using `swift package describe --type json`
pub fn discover_packages(project_path: &str) -> Result<Vec<SwiftPackage>, String> {
    let path = Path::new(project_path);
    let mut packages = Vec::new();

    // Check root for Package.swift
    if path.join("Package.swift").exists() {
        if let Ok(pkg) = describe_package(project_path) {
            packages.push(pkg);
        }
    }

    // Check subdirectories for Package.swift
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            let sub_path = entry.path();
            if sub_path.is_dir() && sub_path.join("Package.swift").exists() {
                let sub_str = sub_path.to_string_lossy().to_string();
                if let Ok(pkg) = describe_package(&sub_str) {
                    packages.push(pkg);
                }
            }
        }
    }

    Ok(packages)
}

fn describe_package(package_path: &str) -> Result<SwiftPackage, String> {
    let output = Command::new("swift")
        .args(["package", "describe", "--type", "json"])
        .current_dir(package_path)
        .output()
        .map_err(|e| format!("Failed to run swift package describe: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("swift package describe failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    parse_package_description(&stdout, package_path)
}

fn parse_package_description(json_str: &str, package_path: &str) -> Result<SwiftPackage, String> {
    let value: serde_json::Value =
        serde_json::from_str(json_str).map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let name = value
        .get("name")
        .and_then(|n| n.as_str())
        .unwrap_or("Unknown")
        .to_string();

    let mut test_targets = Vec::new();

    if let Some(serde_json::Value::Array(targets)) = value.get("targets") {
        for target in targets {
            let target_type = target.get("type").and_then(|t| t.as_str()).unwrap_or("");
            if target_type == "test" {
                if let Some(target_name) = target.get("name").and_then(|n| n.as_str()) {
                    test_targets.push(target_name.to_string());
                }
            }
        }
    }

    Ok(SwiftPackage {
        name,
        path: package_path.to_string(),
        test_targets,
    })
}
