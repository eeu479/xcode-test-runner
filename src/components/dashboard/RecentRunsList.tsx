import { useNavigate } from "react-router-dom";
import Badge from "../common/Badge";
import { formatDuration, formatTimestamp } from "../../lib/formatters";
import type { TestRun } from "../../hooks/useRunHistory";

interface RecentRunsListProps {
  runs: TestRun[];
}

export default function RecentRunsList({ runs }: RecentRunsListProps) {
  const navigate = useNavigate();

  if (runs.length === 0) {
    return (
      <div className="card muted" style={{ textAlign: "center", padding: "28px 20px" }}>
        No test runs yet. Select a project and run your first test.
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
            <Badge
              variant={
                run.status === "passed"
                  ? "success"
                  : run.status === "failed"
                    ? "danger"
                    : "neutral"
              }
            >
              {run.status}
            </Badge>
            <span className="truncate" style={{ color: "var(--text-primary)", fontWeight: 500 }}>
              {run.scope}
            </span>
          </div>

          <div className="flex items-center gap-4" style={{ color: "var(--text-secondary)", fontSize: 12 }}>
            <span>{run.total_tests} tests</span>
            {run.duration_ms != null && <span>{formatDuration(run.duration_ms)}</span>}
            <span className="muted">{formatTimestamp(run.started_at)}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
