import { open } from "@tauri-apps/plugin-dialog";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SearchInput from "../components/common/SearchInput";
import TopBar from "../components/layout/TopBar";
import TargetCheckbox from "../components/targets/TargetCheckbox";
import { useStoredDiscovery, useScanProject } from "../hooks/useDiscovery";
import { useAddProject, useCurrentProject } from "../hooks/useProjects";
import { useSuites } from "../hooks/useSuites";
import { useTestExecution } from "../hooks/useTestExecution";
import { useSelectionStore, type RunMode } from "../stores/selectionStore";
import type { DbSuite } from "../lib/db";

type TestKind = "ui" | "unit";

function projectNameFromPath(path: string): string {
  const segments = path.split("/").filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : "New project";
}

function classifyTestKind(name: string): TestKind {
  const normalized = name.toLowerCase();
  const isUi =
    normalized.includes("uitest") ||
    normalized.includes("ui test") ||
    normalized.endsWith("ui") ||
    normalized.includes("_ui");
  return isUi ? "ui" : "unit";
}

function testKindLabel(kind: TestKind): string {
  return kind === "ui" ? "UI Tests" : "Unit Tests";
}

export default function TargetsPage() {
  const [search, setSearch] = useState("");
  const [createSuiteOpen, setCreateSuiteOpen] = useState(false);
  const [createSuiteName, setCreateSuiteName] = useState("");
  const [editSuite, setEditSuite] = useState<DbSuite | null>(null);
  const [editSuiteName, setEditSuiteName] = useState("");
  const [editSuiteSchemeKeys, setEditSuiteSchemeKeys] = useState<Set<string>>(new Set());
  const [editSuitePackageKeys, setEditSuitePackageKeys] = useState<Set<string>>(new Set());
  const [deleteSuiteId, setDeleteSuiteId] = useState<string | null>(null);

  const navigate = useNavigate();
  const { data: currentProject } = useCurrentProject();
  const addProject = useAddProject();
  const projectPath = currentProject?.path ?? null;
  const { data: project, isLoading, error } = useStoredDiscovery(
    currentProject?.id ?? null,
  );
  const scanMutation = useScanProject();
  const isScanning = scanMutation.isPending;
  const scanError = scanMutation.error;
  const { suites, createSuite, updateSuite, deleteSuite } = useSuites(
    currentProject?.id ?? null,
  );
  const { runTests } = useTestExecution();

  const {
    selectedSchemeTargets,
    selectedPackageTargets,
    selectedTestPlans,
    runMode,
    toggleSchemeTarget,
    togglePackageTarget,
    toggleTestPlan,
    setRunMode,
    selectAllTargets,
    selectAllTestPlans,
    clearAll,
    clearTargets,
    clearTestPlans,
  } = useSelectionStore();

  const handleAddProject = async () => {
    console.debug("[projects] targets add project:open dialog");
    const selected = await open({ directory: true, multiple: false });
    console.debug("[projects] targets add project:dialog result", { selected });
    if (selected) {
      const path = selected as string;
      console.debug("[projects] targets add project:mutate", { path });
      addProject.mutate({ name: projectNameFromPath(path), path });
    } else {
      console.debug("[projects] targets add project:cancelled");
    }
  };

  const allSchemes = project?.schemes ?? [];
  const allPackages = project?.swift_packages ?? [];
  const allTestPlans = project?.test_plans ?? [];

  const defaultSchemeForTestPlans = allSchemes[0]?.name ?? "";

  // Build flat list of scheme rows: each scheme gets one row per test target, or one row if no targets
  const schemeRows: { key: string; label: string; subtitle: string }[] = [];
  for (const scheme of allSchemes) {
    const targets = scheme.test_targets ?? [];
    if (targets.length === 0) {
      schemeRows.push({
        key: scheme.name,
        label: scheme.name,
        subtitle: "Scheme (no test targets in shared scheme)",
      });
    } else {
      for (const target of targets) {
        schemeRows.push({
          key: `${scheme.name}|${target}`,
          label: `${scheme.name} » ${target}`,
          subtitle: testKindLabel(classifyTestKind(target)),
        });
      }
    }
  }

  const packageRows: { key: string; label: string; subtitle: string }[] = [];
  for (const pkg of allPackages) {
    for (const target of pkg.test_targets) {
      packageRows.push({
        key: `${pkg.path}|${target}`,
        label: `${pkg.name} » ${target}`,
        subtitle: testKindLabel(classifyTestKind(target)),
      });
    }
    if (pkg.test_targets.length === 0) {
      packageRows.push({
        key: pkg.path,
        label: pkg.name,
        subtitle: "No test targets",
      });
    }
  }

  const filteredSchemeRows = schemeRows.filter(
    (r) =>
      r.label.toLowerCase().includes(search.toLowerCase()) ||
      r.subtitle.toLowerCase().includes(search.toLowerCase()),
  );
  const filteredPackageRows = packageRows.filter(
    (r) =>
      r.label.toLowerCase().includes(search.toLowerCase()) ||
      r.subtitle.toLowerCase().includes(search.toLowerCase()),
  );
  const filteredTestPlans = allTestPlans.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const allSchemeKeys = schemeRows.map((r) => r.key);
  const allPackageKeys = packageRows.map((r) => r.key);
  const allTestPlanKeys = allTestPlans.map((p) => p.name);

  const handleSelectAllTargets = () => {
    selectAllTargets(allSchemeKeys, allPackageKeys);
  };

  const handleSelectAllTestPlans = () => {
    selectAllTestPlans(allTestPlanKeys);
  };

  const handleScan = () => {
    if (currentProject) {
      scanMutation.mutate({
        projectId: currentProject.id,
        path: currentProject.path,
      });
    }
  };

  const notScannedYet =
    !!projectPath && !isLoading && !error && project == null;

  const hasTargetSelection =
    selectedSchemeTargets.size > 0 || selectedPackageTargets.size > 0;
  const canCreateSuite = runMode === "targets" && hasTargetSelection && !!currentProject?.id;

  const handleCreateSuiteOpen = () => {
    setCreateSuiteName("");
    setCreateSuiteOpen(true);
  };

  const handleCreateSuiteSubmit = async () => {
    const name = createSuiteName.trim();
    if (!name || !currentProject?.id) return;
    await createSuite({
      name,
      scheme_keys: Array.from(selectedSchemeTargets),
      package_keys: Array.from(selectedPackageTargets),
    });
    setCreateSuiteOpen(false);
    setCreateSuiteName("");
  };

  const handleRunSuite = async (suite: DbSuite) => {
    if (!projectPath || !currentProject?.id) return;
    const runId = await runTests(projectPath, false, currentProject.id, {
      overrideSchemeTargets: suite.scheme_keys,
      overridePackageTargets: suite.package_keys,
      scopeLabel: `Suite: ${suite.name}`,
    });
    navigate(`/run/${runId}`);
  };

  const handleEditSuiteOpen = (suite: DbSuite) => {
    setEditSuite(suite);
    setEditSuiteName(suite.name);
    setEditSuiteSchemeKeys(new Set(suite.scheme_keys));
    setEditSuitePackageKeys(new Set(suite.package_keys));
  };

  const handleEditSuiteSubmit = async () => {
    if (!editSuite) return;
    const name = editSuiteName.trim();
    await updateSuite({
      id: editSuite.id,
      updates: {
        name: name || editSuite.name,
        scheme_keys: Array.from(editSuiteSchemeKeys),
        package_keys: Array.from(editSuitePackageKeys),
      },
    });
    setEditSuite(null);
  };

  const handleDeleteSuiteConfirm = async (id: string) => {
    await deleteSuite(id);
    setDeleteSuiteId(null);
  };

  return (
    <>
      <TopBar title="Targets & Suites">
        <button onClick={handleAddProject} className="btn">
          Add project...
        </button>
      </TopBar>

      <div className="page-scroll">
        {!projectPath ? (
          <div
            className="card"
            style={{ textAlign: "center", padding: "34px 20px" }}
          >
            <p className="muted" style={{ marginBottom: 10 }}>
              No project selected.
            </p>
            <button onClick={handleAddProject} className="btn btn-primary">
              Add project...
            </button>
          </div>
        ) : isLoading ? (
          <div
            className="card muted"
            style={{ textAlign: "center", padding: "28px 20px" }}
          >
            Loading...
          </div>
        ) : notScannedYet ? (
          <div
            className="card"
            style={{ textAlign: "center", padding: "34px 20px" }}
          >
            <p className="muted" style={{ marginBottom: 10 }}>
              Scan this project to discover test targets and test plans.
            </p>
            <button
              onClick={handleScan}
              className="btn btn-primary"
              disabled={isScanning}
            >
              {isScanning ? "Scanning..." : "Scan"}
            </button>
            {scanError && (
              <p
                style={{
                  marginTop: 12,
                  color: "var(--danger)",
                  fontSize: 13,
                }}
              >
                {String(scanError)}
              </p>
            )}
          </div>
        ) : error ? (
          <div
            className="card"
            style={{
              color: "var(--danger)",
              borderColor: "rgba(194, 64, 29, 0.45)",
              backgroundColor: "rgba(194, 64, 29, 0.09)",
            }}
          >
            {String(error)}
          </div>
        ) : (
          <div className="stack">
            <div className="card targets-toolbar">
              <div className="targets-toolbar-row">
                <div className="targets-search">
                  <SearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Filter targets..."
                  />
                </div>
                <div className="targets-run-mode">
                  <span className="muted" style={{ fontSize: 12 }}>
                    Run by:
                  </span>
                  {(["targets", "testPlans"] as RunMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={`btn ${runMode === mode ? "btn-primary" : ""}`}
                      onClick={() => setRunMode(mode)}
                    >
                      {mode === "targets" ? "Targets" : "Test plans"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="targets-actions">
                {runMode === "targets" ? (
                  <>
                    <button onClick={handleSelectAllTargets} className="btn">
                      Select All
                    </button>
                    <button onClick={clearTargets} className="btn">
                      Clear
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={handleSelectAllTestPlans} className="btn">
                      Select All
                    </button>
                    <button onClick={clearTestPlans} className="btn">
                      Clear
                    </button>
                  </>
                )}
                <button onClick={clearAll} className="btn">
                  Clear All
                </button>
                {canCreateSuite && (
                  <button
                    onClick={handleCreateSuiteOpen}
                    className="btn btn-primary"
                  >
                    Save as suite...
                  </button>
                )}
              </div>
            </div>

            {runMode === "targets" && (
              <>
                {suites.length > 0 && (
                  <section className="stack" style={{ gap: 8 }}>
                    <h2 className="section-title">Saved suites</h2>
                    <div className="list">
                      {suites.map((suite) => (
                        <div
                          key={suite.id}
                          className="list-item"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 600,
                              color: "var(--text-primary)",
                            }}
                          >
                            {suite.name}
                          </span>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => handleRunSuite(suite)}
                            >
                              Run
                            </button>
                            <button
                              type="button"
                              className="btn"
                              onClick={() => handleEditSuiteOpen(suite)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn"
                              onClick={() => setDeleteSuiteId(suite.id)}
                              style={{ color: "var(--danger)" }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {filteredSchemeRows.length > 0 && (
                  <section className="stack" style={{ gap: 8 }}>
                    <h2 className="section-title">Xcode project (by target)</h2>
                    <div className="list">
                      {filteredSchemeRows.map((row) => (
                        <TargetCheckbox
                          key={row.key}
                          label={row.label}
                          subtitle={row.subtitle}
                          checked={selectedSchemeTargets.has(row.key)}
                          onCheckedChange={() => toggleSchemeTarget(row.key)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {filteredPackageRows.length > 0 && (
                  <section className="stack" style={{ gap: 8 }}>
                    <h2 className="section-title">
                      Swift packages (by target)
                    </h2>
                    <div className="list">
                      {filteredPackageRows.map((row) => (
                        <TargetCheckbox
                          key={row.key}
                          label={row.label}
                          subtitle={row.subtitle}
                          checked={selectedPackageTargets.has(row.key)}
                          onCheckedChange={() => togglePackageTarget(row.key)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {filteredSchemeRows.length === 0 &&
                  filteredPackageRows.length === 0 && (
                    <div
                      className="card muted"
                      style={{ textAlign: "center", padding: "24px 20px" }}
                    >
                      {search
                        ? "No targets match your filter."
                        : "No test targets found in this project."}
                    </div>
                  )}
              </>
            )}

            {runMode === "testPlans" && (
              <>
                {allSchemes.length > 0 && (
                  <p className="muted" style={{ fontSize: 12 }}>
                    Test plans will run with scheme:{" "}
                    <strong>{defaultSchemeForTestPlans || "—"}</strong>
                  </p>
                )}
                {filteredTestPlans.length > 0 ? (
                  <section className="stack" style={{ gap: 8 }}>
                    <h2 className="section-title">Test plans</h2>
                    <div className="list">
                      {filteredTestPlans.map((plan) => (
                        <TargetCheckbox
                          key={plan.path}
                          label={plan.name}
                          subtitle={".xctestplan"}
                          checked={selectedTestPlans.has(plan.name)}
                          onCheckedChange={() => toggleTestPlan(plan.name)}
                        />
                      ))}
                    </div>
                  </section>
                ) : (
                  <div
                    className="card muted"
                    style={{ textAlign: "center", padding: "24px 20px" }}
                  >
                    {search
                      ? "No test plans match your filter."
                      : "No .xctestplan files found in this project."}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Create suite modal */}
      {createSuiteOpen && (
        <div
          className="card"
          style={{
            position: "fixed",
            inset: 0,
            margin: "auto",
            maxWidth: 400,
            maxHeight: "80vh",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <h3 className="section-title">Create suite from selection</h3>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="muted" style={{ fontSize: 12 }}>
              Name
            </span>
            <input
              type="text"
              value={createSuiteName}
              onChange={(e) => setCreateSuiteName(e.target.value)}
              placeholder="e.g. Smoke tests"
              className="code"
              style={{ padding: 8, borderRadius: 6 }}
              autoFocus
            />
          </label>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn"
              onClick={() => setCreateSuiteOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreateSuiteSubmit}
              disabled={!createSuiteName.trim()}
            >
              Create
            </button>
          </div>
        </div>
      )}
      {createSuiteOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            zIndex: 99,
          }}
          onClick={() => setCreateSuiteOpen(false)}
          aria-hidden
        />
      )}

      {/* Edit suite modal */}
      {editSuite && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.4)",
              zIndex: 99,
            }}
            onClick={() => setEditSuite(null)}
            aria-hidden
          />
          <div
            className="card"
            style={{
              position: "fixed",
              inset: 0,
              margin: "auto",
              maxWidth: 520,
              maxHeight: "85vh",
              zIndex: 100,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              overflow: "hidden",
            }}
          >
            <h3 className="section-title">Edit suite</h3>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="muted" style={{ fontSize: 12 }}>
                Name
              </span>
              <input
                type="text"
                value={editSuiteName}
                onChange={(e) => setEditSuiteName(e.target.value)}
                className="code"
                style={{ padding: 8, borderRadius: 6 }}
              />
            </label>
            <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
              {schemeRows.length > 0 && (
                <div className="stack" style={{ gap: 6 }}>
                  <span className="muted" style={{ fontSize: 12 }}>
                    Xcode targets
                  </span>
                  <div className="list">
                    {schemeRows.map((row) => (
                      <TargetCheckbox
                        key={row.key}
                        label={row.label}
                        subtitle={row.subtitle}
                        checked={editSuiteSchemeKeys.has(row.key)}
                        onCheckedChange={() => {
                          setEditSuiteSchemeKeys((prev) => {
                            const next = new Set(prev);
                            if (next.has(row.key)) next.delete(row.key);
                            else next.add(row.key);
                            return next;
                          });
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              {packageRows.length > 0 && (
                <div className="stack" style={{ gap: 6 }}>
                  <span className="muted" style={{ fontSize: 12 }}>
                    Swift packages
                  </span>
                  <div className="list">
                    {packageRows.map((row) => (
                      <TargetCheckbox
                        key={row.key}
                        label={row.label}
                        subtitle={row.subtitle}
                        checked={editSuitePackageKeys.has(row.key)}
                        onCheckedChange={() => {
                          setEditSuitePackageKeys((prev) => {
                            const next = new Set(prev);
                            if (next.has(row.key)) next.delete(row.key);
                            else next.add(row.key);
                            return next;
                          });
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn"
                onClick={() => setEditSuite(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleEditSuiteSubmit}
              >
                Save
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete suite confirm */}
      {deleteSuiteId && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.4)",
              zIndex: 99,
            }}
            onClick={() => setDeleteSuiteId(null)}
            aria-hidden
          />
          <div
            className="card"
            style={{
              position: "fixed",
              inset: 0,
              margin: "auto",
              maxWidth: 360,
              zIndex: 100,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <p style={{ color: "var(--text-primary)" }}>
              Delete this suite? This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn"
                onClick={() => setDeleteSuiteId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                style={{ color: "var(--danger)" }}
                onClick={() => handleDeleteSuiteConfirm(deleteSuiteId)}
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
