import type { TestCase } from "../../hooks/useRunHistory";

interface FailuresTabProps {
  testCases: TestCase[];
}

export default function FailuresTab({ testCases }: FailuresTabProps) {
  const failures = testCases.filter((testCase) => testCase.status === "failed");

  if (failures.length === 0) {
    return (
      <div className="page-scroll">
        <div className="card muted" style={{ textAlign: "center", padding: "28px 20px" }}>
          No failures. All tests passed.
        </div>
      </div>
    );
  }

  return (
    <div className="page-scroll">
      <div className="list">
        {failures.map((testCase) => (
          <div key={`${testCase.suite_name}.${testCase.test_name}`} className="list-item" style={{ cursor: "default", alignItems: "start", flexDirection: "column" }}>
            <div className="flex items-center gap-2" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: "var(--danger)" }}
              />
              {testCase.suite_name}.{testCase.test_name}
            </div>

            {testCase.failure_message && (
              <pre
                className="code selectable"
                style={{
                  marginTop: 8,
                  padding: 10,
                  width: "100%",
                  borderRadius: 10,
                  whiteSpace: "pre-wrap",
                  overflowX: "auto",
                  backgroundColor: "rgba(194, 64, 29, 0.08)",
                  color: "var(--danger)",
                  fontSize: 12,
                }}
              >
                {testCase.failure_message}
              </pre>
            )}

            {testCase.file_path && (
              <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                {testCase.file_path}
                {testCase.line_number != null ? `:${testCase.line_number}` : ""}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
