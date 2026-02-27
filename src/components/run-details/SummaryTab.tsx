import { formatDuration, formatTargetKey } from "../../lib/formatters";
import type { TestCase, TestRun } from "../../hooks/useRunHistory";

interface SummaryTabProps {
  run: TestRun;
  testCases: TestCase[];
}

export default function SummaryTab({ run, testCases }: SummaryTabProps) {
  const slowest = [...testCases]
    .filter((testCase) => testCase.duration_ms != null)
    .sort((a, b) => (b.duration_ms ?? 0) - (a.duration_ms ?? 0))
    .slice(0, 5);

  const targetResults = run.target_results ?? [];

  return (
    <div className="page-scroll">
      <div className="stack">
        {targetResults.length > 0 && (
          <section className="stack" style={{ gap: 8 }}>
            <h3 className="section-title">By target</h3>
            <div className="list">
              {targetResults.map(({ key, success }) => (
                <div
                  key={key}
                  className="list-item"
                  style={{ cursor: "default", alignItems: "center" }}
                >
                  <span style={{ color: "var(--text-primary)" }}>
                    {formatTargetKey(key)}
                  </span>
                  <span
                    style={{
                      fontWeight: 600,
                      color: success ? "var(--success)" : "var(--danger)",
                    }}
                  >
                    {success ? "Passed" : "Failed"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Total", value: run.total_tests, color: "var(--text-primary)" },
            { label: "Passed", value: run.passed_tests, color: "var(--success)" },
            { label: "Failed", value: run.failed_tests, color: "var(--danger)" },
            { label: "Skipped", value: run.skipped_tests, color: "var(--text-tertiary)" },
          ].map((item) => (
            <div key={item.label} className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: item.color }}>{item.value}</div>
              <div className="section-title" style={{ marginTop: 2 }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>

        {slowest.length > 0 && (
          <section className="stack" style={{ gap: 8 }}>
            <h3 className="section-title">Slowest Tests</h3>
            <div className="list">
              {slowest.map((testCase) => (
                <div
                  key={`${testCase.suite_name}.${testCase.test_name}`}
                  className="list-item"
                  style={{ cursor: "default" }}
                >
                  <span style={{ color: "var(--text-primary)" }}>
                    <span style={{ color: "var(--text-secondary)" }}>
                      {testCase.suite_name}.
                    </span>
                    {testCase.test_name}
                  </span>
                  <span className="code" style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                    {testCase.duration_ms != null ? formatDuration(testCase.duration_ms) : "-"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
