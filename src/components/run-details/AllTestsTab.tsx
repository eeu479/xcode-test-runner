import { useState } from "react";
import SearchInput from "../common/SearchInput";
import { formatDuration } from "../../lib/formatters";
import type { TestCase } from "../../hooks/useRunHistory";

interface AllTestsTabProps {
  testCases: TestCase[];
}

const statusIcon: Record<string, { symbol: string; color: string }> = {
  passed: { symbol: "✓", color: "var(--success)" },
  failed: { symbol: "✗", color: "var(--danger)" },
  skipped: { symbol: "-", color: "var(--text-tertiary)" },
};

export default function AllTestsTab({ testCases }: AllTestsTabProps) {
  const [search, setSearch] = useState("");

  const filtered = testCases.filter(
    (testCase) =>
      testCase.test_name.toLowerCase().includes(search.toLowerCase()) ||
      testCase.suite_name.toLowerCase().includes(search.toLowerCase()),
  );

  const grouped = new Map<string, TestCase[]>();
  for (const testCase of filtered) {
    const existing = grouped.get(testCase.suite_name) ?? [];
    existing.push(testCase);
    grouped.set(testCase.suite_name, existing);
  }

  return (
    <div className="page-scroll">
      <div className="stack">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Filter tests..."
        />

        {Array.from(grouped.entries()).map(([suiteName, tests]) => (
          <section key={suiteName} className="stack" style={{ gap: 8 }}>
            <h3 className="section-title">
              {suiteName} ({tests.length})
            </h3>
            <div className="list">
              {tests.map((testCase) => {
                const icon = statusIcon[testCase.status] ?? statusIcon.skipped;
                return (
                  <div
                    key={`${testCase.suite_name}.${testCase.test_name}`}
                    className="list-item"
                    style={{ cursor: "default" }}
                  >
                    <div className="flex items-center gap-2">
                      <span style={{ color: icon.color, fontWeight: 700 }}>{icon.symbol}</span>
                      <span style={{ color: "var(--text-primary)" }}>{testCase.test_name}</span>
                    </div>
                    <span className="code muted" style={{ fontSize: 12 }}>
                      {testCase.duration_ms != null ? formatDuration(testCase.duration_ms) : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {filtered.length === 0 && (
          <div className="card muted" style={{ textAlign: "center", padding: "24px 20px" }}>
            {search ? "No tests match your filter." : "No test results."}
          </div>
        )}
      </div>
    </div>
  );
}
