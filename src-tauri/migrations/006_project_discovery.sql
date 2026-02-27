-- Store discovery result (schemes, Swift packages, test plans) per project.
-- Populated when user clicks Scan on Targets & Suites.
CREATE TABLE IF NOT EXISTS project_discovery (
    project_id TEXT PRIMARY KEY NOT NULL REFERENCES projects(id),
    path TEXT NOT NULL,
    schemes TEXT NOT NULL,
    swift_packages TEXT NOT NULL,
    test_plans TEXT NOT NULL,
    scanned_at TEXT NOT NULL
);
