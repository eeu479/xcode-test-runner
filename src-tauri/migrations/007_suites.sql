-- Custom test suites: named sets of scheme/package targets per project.
CREATE TABLE IF NOT EXISTS suites (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    scheme_keys TEXT NOT NULL,
    package_keys TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_suites_project_id ON suites(project_id);
