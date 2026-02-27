import { formatDuration } from "../../lib/formatters";
import type { TestRun } from "../../hooks/useRunHistory";

interface TrendWidgetsProps {
  runs: TestRun[];
}

export default function TrendWidgets({ runs }: TrendWidgetsProps) {
  if (runs.length === 0) {
    return null;
  }

  const completedRuns = runs.filter(
    (run) => run.status === "passed" || run.status === "failed",
  );

  const durations = completedRuns
    .map((run) => run.duration_ms)
    .filter((duration): duration is number => duration != null);

  const avgDuration =
    durations.length > 0
      ? Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length)
      : null;

  const failedRuns = completedRuns.filter((run) => run.status === "failed").length;
  const failureRate =
    completedRuns.length > 0
      ? Math.round((failedRuns / completedRuns.length) * 100)
      : 0;

  const widgets = [
    {
      label: "Avg Duration",
      value: avgDuration != null ? formatDuration(avgDuration) : "-",
      subtitle: `Last ${completedRuns.length} runs`,
      color: "var(--text-primary)",
    },
    {
      label: "Failure Rate",
      value: `${failureRate}%`,
      subtitle: `${failedRuns} of ${completedRuns.length} runs`,
      color:
        failureRate > 50
          ? "var(--danger)"
          : failureRate > 0
            ? "var(--warning)"
            : "var(--success)",
    },
    {
      label: "Total Runs",
      value: runs.length.toString(),
      subtitle: "All time",
      color: "var(--text-primary)",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {widgets.map((widget) => (
        <div key={widget.label} className="card">
          <div className="section-title" style={{ marginBottom: 6 }}>
            {widget.label}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: widget.color }}>{widget.value}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            {widget.subtitle}
          </div>
        </div>
      ))}
    </div>
  );
}
