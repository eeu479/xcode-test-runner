import { useNavigate } from "react-router-dom";
import Badge from "../common/Badge";
import { formatDuration, formatTimestamp } from "../../lib/formatters";
import type { TestRun } from "../../hooks/useRunHistory";

interface RunTimelineProps {
  runs: TestRun[];
}

export default function RunTimeline({ runs }: RunTimelineProps) {
  const navigate = useNavigate();

  if (runs.length === 0) {
    return (
      <div className="card muted" style={{ textAlign: "center", padding: "28px 20px" }}>
        No runs recorded yet.
      </div>
    );
  }

  return (
    <div className="list">
      {runs.map((run) => (
        <button
          key={run.id}
          onClick={() => navigate(`/run/${run.id}`)}
          className="list-item"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{
                backgroundColor:
                  run.status === "passed"
                    ? "var(--success)"
                    : run.status === "failed"
                      ? "var(--danger)"
                      : "var(--text-tertiary)",
              }}
            />
            <span className="truncate" style={{ color: "var(--text-primary)", fontWeight: 500 }}>
              {run.scope}
            </span>
            <Badge
              variant={
                run.status === "passed"
                  ? "success"
                  : run.status === "failed"
                    ? "danger"
                    : "neutral"
              }
            >
              {run.passed_tests}/{run.total_tests}
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-[12px] shrink-0">
            {run.failed_tests > 0 && <span style={{ color: "var(--danger)" }}>{run.failed_tests} failed</span>}
            {run.duration_ms != null && (
              <span style={{ color: "var(--text-secondary)" }}>{formatDuration(run.duration_ms)}</span>
            )}
            <span className="muted">{formatTimestamp(run.started_at)}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
