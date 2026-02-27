import { Link, useNavigate } from "react-router-dom";
import ProgressBar from "../components/common/ProgressBar";
import ActionButtons from "../components/dashboard/ActionButtons";
import LiveOutputTerminal from "../components/dashboard/LiveOutputTerminal";
import RecentRunsList from "../components/dashboard/RecentRunsList";
import StatusTile from "../components/dashboard/StatusTile";
import TopBar from "../components/layout/TopBar";
import { useStoredDiscovery } from "../hooks/useDiscovery";
import { useCurrentProject } from "../hooks/useProjects";
import { useRuns } from "../hooks/useRunHistory";
import { useSuites } from "../hooks/useSuites";
import { useTestExecution } from "../hooks/useTestExecution";
import { formatDuration, formatTargetKey, formatTimestamp } from "../lib/formatters";
import { useExecutionStore, type TargetRunStatus } from "../stores/executionStore";
import { useSelectionStore } from "../stores/selectionStore";
import type { DbSuite } from "../lib/db";
import type { TestRun } from "../hooks/useRunHistory";

function lastRunForSuite(runs: TestRun[], suiteName: string): TestRun | null {
  const scope = `Suite: ${suiteName}`;
  return runs.find((r) => r.scope === scope) ?? null;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: currentProject } = useCurrentProject();
  const { data: runs = [] } = useRuns(currentProject?.id ?? null);
  const { suites } = useSuites(currentProject?.id ?? null);
  const { runTests, cancelRun } = useTestExecution();
  const execution = useExecutionStore();
  const selection = useSelectionStore();

  const projectPath = currentProject?.path ?? "";
  const { data: discovered } = useStoredDiscovery(currentProject?.id ?? null);
  const lastRun = runs[0] ?? null;
  const runMode = selection.runMode;
  const hasTargetSelection =
    selection.selectedSchemeTargets.size > 0 ||
    selection.selectedPackageTargets.size > 0;
  const hasTestPlanSelection = selection.selectedTestPlans.size > 0;
  const hasSelection =
    runMode === "targets" ? hasTargetSelection : hasTestPlanSelection;

  const defaultScheme = discovered?.schemes[0]?.name ?? "";

  const handleRunAll = () => {
    if (!projectPath) return;
    if (runMode === "targets") {
      const allSchemeKeys =
        discovered?.schemes.flatMap((s) =>
          (s.test_targets?.length ?? 0) > 0
            ? (s.test_targets ?? []).map((t) => `${s.name}|${t}`)
            : [s.name],
        ) ?? [];
      const allPackageKeys =
        discovered?.swift_packages.flatMap((p) =>
          p.test_targets.length > 0
            ? p.test_targets.map((t) => `${p.path}|${t}`)
            : [p.path],
        ) ?? [];
      runTests(projectPath, false, currentProject?.id, {
        mode: "all",
        allSchemeTargets: allSchemeKeys,
        allPackageTargets: allPackageKeys,
      });
    } else {
      const allTestPlanRuns =
        discovered?.test_plans.map((p) => ({
          scheme: defaultScheme,
          test_plan_name: p.name,
        })) ?? [];
      runTests(projectPath, false, currentProject?.id, {
        mode: "all",
        defaultSchemeForTestPlans: defaultScheme,
        allTestPlanRuns,
      });
    }
  };

  const handleRunSelected = () => {
    if (projectPath && hasSelection) {
      runTests(projectPath, false, currentProject?.id, {
        defaultSchemeForTestPlans:
          runMode === "testPlans" ? defaultScheme : undefined,
      });
    }
  };

  const handleRerunFailed = () => {
    if (projectPath) {
      runTests(projectPath, false, currentProject?.id);
    }
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

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="page-scroll">
        <div className="stack">
          {/* Suites: primary quick-run area */}
          {currentProject?.id && (
            <section className="stack" style={{ gap: 8 }}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="section-title">Suites</h2>
                <Link to="/targets" className="btn" style={{ fontSize: 12 }}>
                  Manage in Targets & Suites →
                </Link>
              </div>
              {suites.length > 0 ? (
                <div className="dashboard-suites-grid">
                  {suites.map((suite) => {
                    const suiteLastRun = lastRunForSuite(runs, suite.name);
                    return (
                      <div
                        key={suite.id}
                        className="card dashboard-suite-card"
                      >
                        <div className="flex items-center justify-between gap-3 min-w-0">
                          <span
                            className="truncate"
                            style={{
                              fontWeight: 600,
                              color: "var(--text-primary)",
                            }}
                          >
                            {suite.name}
                          </span>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleRunSuite(suite)}
                            disabled={execution.isRunning}
                          >
                            Run
                          </button>
                        </div>
                        <div
                          className="muted"
                          style={{ fontSize: 12, marginTop: 6 }}
                        >
                          {suiteLastRun ? (
                            <>
                              <span
                                style={{
                                  color:
                                    suiteLastRun.status === "passed"
                                      ? "var(--success)"
                                      : "var(--danger)",
                                  fontWeight: 500,
                                }}
                              >
                                {suiteLastRun.status === "passed"
                                  ? "Passed"
                                  : "Failed"}
                              </span>
                              {" · "}
                              {suiteLastRun.duration_ms != null &&
                                formatDuration(suiteLastRun.duration_ms)}
                              {" · "}
                              {formatTimestamp(suiteLastRun.started_at)}
                            </>
                          ) : (
                            "Not run yet"
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="card muted dashboard-suite-empty">
                  <p style={{ margin: 0, color: "var(--text-secondary)" }}>
                    No suites yet. Create one from Targets & Suites to run
                    multiple schemes or packages with one click.
                  </p>
                  <Link to="/targets" className="btn btn-primary" style={{ marginTop: 12 }}>
                    Go to Targets & Suites
                  </Link>
                </div>
              )}
            </section>
          )}

          {/* Run by selection */}
          <section className="stack" style={{ gap: 8 }}>
            <h2 className="section-title">Quick actions</h2>
            <ActionButtons
              onRunAll={handleRunAll}
              onRunSelected={handleRunSelected}
              onRerunFailed={handleRerunFailed}
              onCancel={cancelRun}
              hasSelection={hasSelection}
            />
          </section>

          {execution.isRunning && execution.targetKeys.length > 0 && (
            <section className="stack" style={{ gap: 8 }}>
              <h3 className="section-title">Targets</h3>
              <div className="list">
                {execution.targetKeys.map((key) => {
                  const status: TargetRunStatus =
                    execution.targetStatuses[key] ?? "pending";
                  const statusStyle =
                    status === "passed"
                      ? { color: "var(--success)", fontWeight: 600 }
                      : status === "failed"
                        ? { color: "var(--danger)", fontWeight: 600 }
                        : status === "running"
                          ? { color: "var(--accent)", fontWeight: 600 }
                          : { color: "var(--text-tertiary)" };
                  return (
                    <div
                      key={key}
                      className="list-item"
                      style={{ cursor: "default", alignItems: "center" }}
                    >
                      <span
                        style={{
                          color: "var(--text-primary)",
                        }}
                      >
                        {formatTargetKey(key)}
                      </span>
                      <span style={statusStyle}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {execution.isRunning && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                  Running tests
                </span>
                <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                  {execution.testsRun} / {execution.testsTotal || "?"}
                </span>
              </div>
              <ProgressBar
                value={execution.testsRun}
                max={execution.testsTotal || 100}
              />
              <div
                className="flex gap-4"
                style={{ marginTop: 10, fontSize: 12 }}
              >
                <span style={{ color: "var(--success)" }}>
                  {
                    execution.liveResults.filter(
                      (result) => result.status === "passed",
                    ).length
                  }{" "}
                  passed
                </span>
                <span style={{ color: "var(--danger)" }}>
                  {
                    execution.liveResults.filter(
                      (result) => result.status === "failed",
                    ).length
                  }{" "}
                  failed
                </span>
              </div>
            </div>
          )}

          {execution.isRunning && (
            <LiveOutputTerminal lines={execution.outputLines} />
          )}

          <div className="grid gap-4 md:grid-cols-4">
            <StatusTile
              label="Last Run"
              value={lastRun?.status ?? "-"}
              color={
                lastRun?.status === "passed"
                  ? "var(--success)"
                  : lastRun?.status === "failed"
                    ? "var(--danger)"
                    : undefined
              }
            />
            <StatusTile
              label="Total Tests"
              value={lastRun?.total_tests ?? "-"}
            />
            <StatusTile
              label="Failures"
              value={lastRun?.failed_tests ?? "-"}
              color={
                lastRun && lastRun.failed_tests > 0
                  ? "var(--danger)"
                  : undefined
              }
            />
            <StatusTile
              label="Duration"
              value={
                lastRun?.duration_ms != null
                  ? formatDuration(lastRun.duration_ms)
                  : "-"
              }
            />
          </div>

          <section className="stack" style={{ gap: 8 }}>
            <h2 className="section-title">Recent Runs</h2>
            <RecentRunsList runs={runs.slice(0, 10)} />
          </section>
        </div>
      </div>

      <style>{`
        .dashboard-suites-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 12px;
        }
        .dashboard-suite-card {
          padding: 14px 16px;
        }
        .dashboard-suite-empty {
          padding: 20px;
          text-align: center;
        }
      `}</style>
    </>
  );
}
