-- Projects table: multiple project roots with display name and path
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
);

-- Link runs to project (nullable for backfill)
ALTER TABLE test_runs ADD COLUMN project_id TEXT REFERENCES projects(id);

-- Current project setting (empty = none selected)
INSERT OR IGNORE INTO settings (key, value) VALUES ('current_project_id', '');

-- Data migration: create one project from existing project_path and set as current
INSERT INTO projects (id, name, path, created_at)
SELECT lower(hex(randomblob(16))), 'Default project', value, datetime('now')
FROM settings WHERE key = 'project_path' AND value != ''
LIMIT 1;

UPDATE settings SET value = (
    SELECT id FROM projects WHERE path = (SELECT value FROM settings WHERE key = 'project_path' LIMIT 1) LIMIT 1
) WHERE key = 'current_project_id' AND (SELECT value FROM settings WHERE key = 'project_path' LIMIT 1) != '';

UPDATE test_runs SET project_id = (
    SELECT id FROM projects WHERE path = test_runs.project_path LIMIT 1
) WHERE project_id IS NULL AND project_path = (SELECT value FROM settings WHERE key = 'project_path' LIMIT 1);
