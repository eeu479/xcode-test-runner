import Badge from "../common/Badge";
import { formatDuration, formatTimestamp } from "../../lib/formatters";
import type { TestRun } from "../../hooks/useRunHistory";

interface RunHeaderProps {
  run: TestRun;
}

export default function RunHeader({ run }: RunHeaderProps) {
  return (
    <div className="run-header">
      <div className="run-header-main">
        <Badge
          variant={
            run.status === "passed"
              ? "success"
              : run.status === "failed"
                ? "danger"
                : run.status === "running"
                  ? "warning"
                  : "neutral"
          }
        >
          {run.status.toUpperCase()}
        </Badge>
        <span className="truncate" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
          {run.scope}
        </span>
      </div>

      <div className="run-header-meta">
        <span>{run.total_tests} tests</span>
        {run.duration_ms != null && <span>{formatDuration(run.duration_ms)}</span>}
        <span className="muted">{formatTimestamp(run.started_at)}</span>
      </div>
    </div>
  );
}
