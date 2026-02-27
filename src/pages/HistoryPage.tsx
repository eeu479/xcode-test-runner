import { useState } from "react";
import RunTimeline from "../components/history/RunTimeline";
import TrendWidgets from "../components/history/TrendWidgets";
import TopBar from "../components/layout/TopBar";
import { useCurrentProject } from "../hooks/useProjects";
import { useHistory } from "../hooks/useRunHistory";

type DateFilter = "today" | "7d" | "30d" | "all";

export default function HistoryPage() {
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [showFailuresOnly, setShowFailuresOnly] = useState(false);
  const { data: currentProject } = useCurrentProject();
  const { data: allRuns = [] } = useHistory(200, currentProject?.id ?? null);

  const now = Date.now();
  const filtered = allRuns.filter((run) => {
    if (showFailuresOnly && run.status !== "failed") {
      return false;
    }

    if (dateFilter !== "all") {
      const runTime = new Date(run.started_at).getTime();
      const cutoff =
        dateFilter === "today"
          ? now - 24 * 60 * 60 * 1000
          : dateFilter === "7d"
            ? now - 7 * 24 * 60 * 60 * 1000
            : now - 30 * 24 * 60 * 60 * 1000;
      if (runTime < cutoff) {
        return false;
      }
    }

    return true;
  });

  return (
    <>
      <TopBar title="History & Trends" />
      <div className="page-scroll">
        <div className="stack">
          <TrendWidgets runs={allRuns} />

          <div className="card flex items-center gap-3 flex-wrap">
            {(["today", "7d", "30d", "all"] as const).map((filterKey) => (
              <button
                key={filterKey}
                onClick={() => setDateFilter(filterKey)}
                className={`btn ${dateFilter === filterKey ? "btn-chip-active" : ""}`}
              >
                {filterKey === "all" ? "All" : filterKey === "today" ? "Today" : filterKey}
              </button>
            ))}

            <div className="flex-1" />

            <label
              className="flex items-center gap-2"
              style={{ color: "var(--text-secondary)", fontSize: 12, cursor: "pointer" }}
            >
              <input
                type="checkbox"
                checked={showFailuresOnly}
                onChange={(event) => setShowFailuresOnly(event.target.checked)}
              />
              Failures only
            </label>
          </div>

          <RunTimeline runs={filtered} />
        </div>
      </div>
    </>
  );
}
