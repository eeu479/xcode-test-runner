use tauri_plugin_sql::{Migration, MigrationKind};

pub fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create test_runs table",
            sql: include_str!("../../migrations/001_create_runs.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create test_cases table",
            sql: include_str!("../../migrations/002_create_test_results.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create settings table",
            sql: include_str!("../../migrations/003_create_settings.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "add projects table and project_id on test_runs",
            sql: include_str!("../../migrations/004_projects.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "add default_simulator setting",
            sql: include_str!("../../migrations/005_add_default_simulator.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "add project_discovery table",
            sql: include_str!("../../migrations/006_project_discovery.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "add suites table",
            sql: include_str!("../../migrations/007_suites.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "add target_results to test_runs",
            sql: include_str!("../../migrations/008_run_target_results.sql"),
            kind: MigrationKind::Up,
        },
    ]
}
