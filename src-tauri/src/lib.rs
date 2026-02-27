mod commands;
mod discovery;
mod execution;
mod models;
mod parsing;
mod persistence;
mod state;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(
                    "sqlite:xcode_test_runner.db",
                    persistence::db::get_migrations(),
                )
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::discovery::discover_project,
            commands::execution::run_tests,
            commands::execution::cancel_run,
            commands::simulators::list_simulators,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
