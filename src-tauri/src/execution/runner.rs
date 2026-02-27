use crate::models::run::TestRunEvent;
use tauri::ipc::Channel;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio_util::sync::CancellationToken;

/// Spawn a child process and stream its output through the Tauri channel
pub async fn spawn_and_stream(
    program: &str,
    args: &[String],
    working_dir: &str,
    channel: &Channel<TestRunEvent>,
    cancel_token: CancellationToken,
) -> Result<bool, String> {
    let mut child = Command::new(program)
        .args(args)
        .current_dir(working_dir)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn process: {}", e))?;

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

    let channel_stdout = channel.clone();
    let channel_stderr = channel.clone();
    let cancel_stdout = cancel_token.clone();
    let cancel_stderr = cancel_token.clone();

    // Stream stdout
    let stdout_handle = tokio::spawn(async move {
        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();
        loop {
            tokio::select! {
                _ = cancel_stdout.cancelled() => break,
                line = lines.next_line() => {
                    match line {
                        Ok(Some(line)) => {
                            let _ = channel_stdout.send(TestRunEvent::Stdout { line });
                        }
                        Ok(None) => break,
                        Err(_) => break,
                    }
                }
            }
        }
    });

    // Stream stderr
    let stderr_handle = tokio::spawn(async move {
        let reader = BufReader::new(stderr);
        let mut lines = reader.lines();
        loop {
            tokio::select! {
                _ = cancel_stderr.cancelled() => break,
                line = lines.next_line() => {
                    match line {
                        Ok(Some(line)) => {
                            let _ = channel_stderr.send(TestRunEvent::Stderr { line });
                        }
                        Ok(None) => break,
                        Err(_) => break,
                    }
                }
            }
        }
    });

    // Wait for process or cancellation
    let success = tokio::select! {
        _ = cancel_token.cancelled() => {
            // Kill the process
            let _ = child.kill().await;
            false
        }
        status = child.wait() => {
            match status {
                Ok(s) => s.success(),
                Err(e) => {
                    let _ = channel.send(TestRunEvent::Error {
                        message: format!("Process error: {}", e),
                    });
                    false
                }
            }
        }
    };

    // Wait for stream tasks to finish
    let _ = stdout_handle.await;
    let _ = stderr_handle.await;

    Ok(success)
}
