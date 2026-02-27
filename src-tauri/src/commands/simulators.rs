use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct SimulatorDevice {
    pub udid: String,
    pub name: String,
    pub runtime: String,
}

/// Runtime key e.g. "com.apple.CoreSimulator.SimRuntime.iOS-17-0" -> "iOS 17.0"
fn runtime_label(key: &str) -> String {
    let prefix = "com.apple.CoreSimulator.SimRuntime.";
    key.strip_prefix(prefix)
        .map(|s| s.replace('-', "."))
        .unwrap_or_else(|| key.to_string())
}

#[tauri::command]
pub async fn list_simulators() -> Result<Vec<SimulatorDevice>, String> {
    let output = tokio::process::Command::new("xcrun")
        .args(["simctl", "list", "devices", "available", "-j"])
        .output()
        .await
        .map_err(|e| format!("Failed to run xcrun simctl: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("xcrun simctl failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let root: serde_json::Value = serde_json::from_str(&stdout)
        .map_err(|e| format!("Invalid JSON from simctl: {}", e))?;

    let devices = root
        .get("devices")
        .and_then(|v| v.as_object())
        .ok_or("Missing 'devices' in simctl output")?;

    let mut result = Vec::new();
    for (runtime_key, list) in devices {
        let list = match list.as_array() {
            Some(a) => a,
            None => continue,
        };
        let runtime = runtime_label(runtime_key);
        for item in list {
            let obj = match item.as_object() {
                Some(o) => o,
                None => continue,
            };
            let is_available = obj
                .get("isAvailable")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            if !is_available {
                continue;
            }
            let udid = obj
                .get("udid")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let name = obj
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            if udid.is_empty() || name.is_empty() {
                continue;
            }
            result.push(SimulatorDevice {
                udid,
                name,
                runtime: runtime.clone(),
            });
        }
    }

    result.sort_by(|a, b| a.runtime.cmp(&b.runtime).then_with(|| a.name.cmp(&b.name)));
    Ok(result)
}
