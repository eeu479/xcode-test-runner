use crate::models::run::TestRunEvent;
use tauri::ipc::Channel;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio_util::sync::CancellationToken;

/// Programs we run in a PTY so they use line buffering (avoids concealed output during
/// long phases like "Running pre build actions" when stdout is a pipe).
const PTY_WRAPPED_PROGRAMS: &[&str] = &["xcodebuild", "swift"];

/// Build (program, args) for spawning. On macOS, xcodebuild and swift are run via
/// `script -q /dev/null` so the child sees a TTY and flushes output line-by-line.
fn resolve_command(program: &str, args: &[String]) -> (String, Vec<String>) {
    if PTY_WRAPPED_PROGRAMS.contains(&program) {
        let mut wrapped = vec![
            "-q".to_string(),
            "/dev/null".to_string(),
            "--".to_string(),
            program.to_string(),
        ];
        wrapped.extend(args.iter().cloned());
        ("script".to_string(), wrapped)
    } else {
        (program.to_string(), args.to_vec())
    }
}

/// Spawn a child process and stream its output through the Tauri channel.
/// For xcodebuild and swift, the process is run inside a PTY (via `script` on macOS)
/// so output is not fully buffered and appears during long phases (e.g. pre-build).
pub async fn spawn_and_stream(
    program: &str,
    args: &[String],
    working_dir: &str,
    channel: &Channel<TestRunEvent>,
    cancel_token: CancellationToken,
) -> Result<bool, String> {
    let (resolved_program, resolved_args) = resolve_command(program, args);

    let mut child = Command::new(&resolved_program)
        .args(&resolved_args)
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

    // Wait for process or cancellation. When using script, killing it terminates the
    // inner process (xcodebuild/swift) via PTY closure.
    let success = tokio::select! {
        _ = cancel_token.cancelled() => {
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
