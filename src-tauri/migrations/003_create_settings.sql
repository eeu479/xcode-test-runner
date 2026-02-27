CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
);

-- Default settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('project_path', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('default_scope', 'all');
INSERT OR IGNORE INTO settings (key, value) VALUES ('stop_on_first_failure', 'false');
INSERT OR IGNORE INTO settings (key, value) VALUES ('notify_on_completion', 'true');
INSERT OR IGNORE INTO settings (key, value) VALUES ('notify_only_on_failure', 'false');
INSERT OR IGNORE INTO settings (key, value) VALUES ('retain_last_runs', '50');
