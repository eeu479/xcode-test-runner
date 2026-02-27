import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load("sqlite:xcode_test_runner.db");
  }
  return db;
}

export interface DbProject {
  id: string;
  name: string;
  path: string;
  created_at: string;
}

export interface DbTestRun {
  id: string;
  status: string;
  project_path: string;
  project_id: string | null;
  scope: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  skipped_tests: number;
  raw_log: string | null;
  target_results: TargetResult[] | null;
}

export interface TargetResult {
  key: string;
  success: boolean;
}

export interface DbSuite {
  id: string;
  project_id: string;
  name: string;
  scheme_keys: string[];
  package_keys: string[];
  created_at: string;
}

export interface DbTestCase {
  id: number;
  run_id: string;
  suite_name: string;
  test_name: string;
  status: string;
  duration_ms: number | null;
  failure_message: string | null;
  file_path: string | null;
  line_number: number | null;
}

/** Stored discovery result for a project (schemes, packages, test plans). */
export interface ProjectInfo {
  path: string;
  schemes: { name: string; test_targets: string[] }[];
  swift_packages: { name: string; path: string; test_targets: string[] }[];
  test_plans: { name: string; path: string }[];
}

export async function insertRun(run: {
  id: string;
  project_path: string;
  project_id?: string | null;
  scope: string;
  started_at: string;
}): Promise<void> {
  const d = await getDb();
  await d.execute(
    "INSERT INTO test_runs (id, status, project_path, project_id, scope, started_at) VALUES ($1, $2, $3, $4, $5, $6)",
    [
      run.id,
      "running",
      run.project_path,
      run.project_id ?? null,
      run.scope,
      run.started_at,
    ],
  );
}

export async function updateRunCompletion(run: {
  id: string;
  status: string;
  finished_at: string;
  duration_ms: number;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  skipped_tests: number;
  raw_log?: string;
  target_results?: TargetResult[];
}): Promise<void> {
  const d = await getDb();
  const targetResultsJson =
    run.target_results != null
      ? JSON.stringify(run.target_results)
      : null;
  await d.execute(
    "UPDATE test_runs SET status=$1, finished_at=$2, duration_ms=$3, total_tests=$4, passed_tests=$5, failed_tests=$6, skipped_tests=$7, raw_log=$8, target_results=$9 WHERE id=$10",
    [
      run.status,
      run.finished_at,
      run.duration_ms,
      run.total_tests,
      run.passed_tests,
      run.failed_tests,
      run.skipped_tests,
      run.raw_log ?? null,
      targetResultsJson,
      run.id,
    ],
  );
}

export async function insertTestCase(tc: {
  run_id: string;
  suite_name: string;
  test_name: string;
  status: string;
  duration_ms: number | null;
  failure_message: string | null;
}): Promise<void> {
  const d = await getDb();
  await d.execute(
    "INSERT INTO test_cases (run_id, suite_name, test_name, status, duration_ms, failure_message) VALUES ($1, $2, $3, $4, $5, $6)",
    [
      tc.run_id,
      tc.suite_name,
      tc.test_name,
      tc.status,
      tc.duration_ms,
      tc.failure_message,
    ],
  );
}

export async function getRuns(
  limit = 50,
  projectId?: string | null,
): Promise<DbTestRun[]> {
  const d = await getDb();
  let rows: (DbTestRun & { target_results?: string | null })[];
  if (projectId) {
    rows = await d.select<(DbTestRun & { target_results?: string | null })[]>(
      "SELECT * FROM test_runs WHERE project_id = $1 ORDER BY started_at DESC LIMIT $2",
      [projectId, limit],
    );
  } else {
    rows = await d.select<(DbTestRun & { target_results?: string | null })[]>(
      "SELECT * FROM test_runs ORDER BY started_at DESC LIMIT $1",
      [limit],
    );
  }
  return rows.map(parseRunRow);
}

function parseRunRow(row: DbTestRun & { target_results?: string | null }): DbTestRun {
  let target_results: TargetResult[] | null = null;
  if (row.target_results != null && row.target_results !== "") {
    try {
      target_results = JSON.parse(row.target_results) as TargetResult[];
    } catch {
      // ignore
    }
  }
  const { target_results: _tr, ...rest } = row;
  return { ...rest, target_results };
}

export async function getRun(id: string): Promise<DbTestRun | null> {
  const d = await getDb();
  const rows = await d.select<(DbTestRun & { target_results?: string | null })[]>(
    "SELECT * FROM test_runs WHERE id = $1",
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  return parseRunRow(row);
}

export async function getTestCases(runId: string): Promise<DbTestCase[]> {
  const d = await getDb();
  return d.select<DbTestCase[]>(
    "SELECT * FROM test_cases WHERE run_id = $1 ORDER BY suite_name, test_name",
    [runId],
  );
}

export async function getProjects(): Promise<DbProject[]> {
  const d = await getDb();
  return d.select<DbProject[]>(
    "SELECT id, name, path, created_at FROM projects ORDER BY created_at DESC",
  );
}

export async function getProject(id: string): Promise<DbProject | null> {
  const d = await getDb();
  const rows = await d.select<DbProject[]>(
    "SELECT id, name, path, created_at FROM projects WHERE id = $1",
    [id],
  );
  return rows[0] ?? null;
}

export async function getProjectByPath(
  path: string,
): Promise<DbProject | null> {
  const d = await getDb();
  const rows = await d.select<DbProject[]>(
    "SELECT id, name, path, created_at FROM projects WHERE path = $1",
    [path],
  );
  return rows[0] ?? null;
}

export async function insertProject(project: {
  id: string;
  name: string;
  path: string;
}): Promise<void> {
  const d = await getDb();
  const created_at = new Date().toISOString();
  await d.execute(
    "INSERT INTO projects (id, name, path, created_at) VALUES ($1, $2, $3, $4)",
    [project.id, project.name, project.path, created_at],
  );
}

export async function updateProject(
  id: string,
  updates: { name?: string; path?: string },
): Promise<void> {
  const d = await getDb();
  if (updates.name !== undefined) {
    await d.execute("UPDATE projects SET name = $1 WHERE id = $2", [
      updates.name,
      id,
    ]);
  }
  if (updates.path !== undefined) {
    await d.execute("UPDATE projects SET path = $1 WHERE id = $2", [
      updates.path,
      id,
    ]);
  }
}

export async function deleteProject(id: string): Promise<void> {
  const d = await getDb();
  await d.execute("DELETE FROM project_discovery WHERE project_id = $1", [id]);
  await d.execute("DELETE FROM suites WHERE project_id = $1", [id]);
  await d.execute("DELETE FROM projects WHERE id = $1", [id]);
}

export async function getSuites(projectId: string): Promise<DbSuite[]> {
  const d = await getDb();
  const rows = await d.select<
    { id: string; project_id: string; name: string; scheme_keys: string; package_keys: string; created_at: string }[]
  >(
    "SELECT id, project_id, name, scheme_keys, package_keys, created_at FROM suites WHERE project_id = $1 ORDER BY created_at DESC",
    [projectId],
  );
  return rows.map((r) => ({
    id: r.id,
    project_id: r.project_id,
    name: r.name,
    scheme_keys: JSON.parse(r.scheme_keys) as string[],
    package_keys: JSON.parse(r.package_keys) as string[],
    created_at: r.created_at,
  }));
}

export async function getSuite(id: string): Promise<DbSuite | null> {
  const d = await getDb();
  const rows = await d.select<
    { id: string; project_id: string; name: string; scheme_keys: string; package_keys: string; created_at: string }[]
  >(
    "SELECT id, project_id, name, scheme_keys, package_keys, created_at FROM suites WHERE id = $1",
    [id],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    project_id: r.project_id,
    name: r.name,
    scheme_keys: JSON.parse(r.scheme_keys) as string[],
    package_keys: JSON.parse(r.package_keys) as string[],
    created_at: r.created_at,
  };
}

export async function insertSuite(suite: {
  id: string;
  project_id: string;
  name: string;
  scheme_keys: string[];
  package_keys: string[];
}): Promise<void> {
  const d = await getDb();
  const created_at = new Date().toISOString();
  await d.execute(
    "INSERT INTO suites (id, project_id, name, scheme_keys, package_keys, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
    [
      suite.id,
      suite.project_id,
      suite.name,
      JSON.stringify(suite.scheme_keys),
      JSON.stringify(suite.package_keys),
      created_at,
    ],
  );
}

export async function updateSuite(
  id: string,
  updates: { name?: string; scheme_keys?: string[]; package_keys?: string[] },
): Promise<void> {
  const d = await getDb();
  if (updates.name !== undefined) {
    await d.execute("UPDATE suites SET name = $1 WHERE id = $2", [
      updates.name,
      id,
    ]);
  }
  if (updates.scheme_keys !== undefined) {
    await d.execute("UPDATE suites SET scheme_keys = $1 WHERE id = $2", [
      JSON.stringify(updates.scheme_keys),
      id,
    ]);
  }
  if (updates.package_keys !== undefined) {
    await d.execute("UPDATE suites SET package_keys = $1 WHERE id = $2", [
      JSON.stringify(updates.package_keys),
      id,
    ]);
  }
}

export async function deleteSuite(id: string): Promise<void> {
  const d = await getDb();
  await d.execute("DELETE FROM suites WHERE id = $1", [id]);
}

export async function getProjectDiscovery(
  projectId: string,
): Promise<ProjectInfo | null> {
  const d = await getDb();
  const rows = await d.select<
    {
      project_id: string;
      path: string;
      schemes: string;
      swift_packages: string;
      test_plans: string;
    }[]
  >(
    "SELECT project_id, path, schemes, swift_packages, test_plans FROM project_discovery WHERE project_id = $1",
    [projectId],
  );
  const row = rows[0];
  if (!row) return null;
  try {
    return {
      path: row.path,
      schemes: JSON.parse(row.schemes) as ProjectInfo["schemes"],
      swift_packages: JSON.parse(
        row.swift_packages,
      ) as ProjectInfo["swift_packages"],
      test_plans: JSON.parse(row.test_plans) as ProjectInfo["test_plans"],
    };
  } catch {
    return null;
  }
}

export async function saveProjectDiscovery(
  projectId: string,
  path: string,
  data: ProjectInfo,
): Promise<void> {
  const d = await getDb();
  const scanned_at = new Date().toISOString();
  await d.execute(
    `INSERT OR REPLACE INTO project_discovery (project_id, path, schemes, swift_packages, test_plans, scanned_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      projectId,
      path,
      JSON.stringify(data.schemes),
      JSON.stringify(data.swift_packages),
      JSON.stringify(data.test_plans),
      scanned_at,
    ],
  );
}

export async function getSetting(key: string): Promise<string | null> {
  const d = await getDb();
  const rows = await d.select<{ key: string; value: string }[]>(
    "SELECT value FROM settings WHERE key = $1",
    [key],
  );
  return rows[0]?.value ?? null;
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const d = await getDb();
  const rows = await d.select<{ key: string; value: string }[]>(
    "SELECT key, value FROM settings",
  );
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

export async function updateSetting(key: string, value: string): Promise<void> {
  const d = await getDb();
  await d.execute(
    "INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2)",
    [key, value],
  );
}

export async function cleanupOldRuns(retainCount: number): Promise<void> {
  const d = await getDb();
  await d.execute(
    "DELETE FROM test_runs WHERE id NOT IN (SELECT id FROM test_runs ORDER BY started_at DESC LIMIT $1)",
    [retainCount],
  );
}
