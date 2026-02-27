import * as Tabs from "@radix-ui/react-tabs";
import { useParams } from "react-router-dom";
import LiveOutputTerminal from "../components/dashboard/LiveOutputTerminal";
import AllTestsTab from "../components/run-details/AllTestsTab";
import FailuresTab from "../components/run-details/FailuresTab";
import LogsTab from "../components/run-details/LogsTab";
import RunHeader from "../components/run-details/RunHeader";
import SummaryTab from "../components/run-details/SummaryTab";
import TopBar from "../components/layout/TopBar";
import { useRun, useTestDetails } from "../hooks/useRunHistory";
import { useExecutionStore } from "../stores/executionStore";

export default function RunDetailsPage() {
  const { runId } = useParams<{ runId: string }>();
  const { data: run, isLoading: runLoading } = useRun(runId);
  const { data: testCases = [], isLoading: casesLoading } = useTestDetails(runId);
  const execution = useExecutionStore();

  if (runLoading || casesLoading) {
    return (
      <>
        <TopBar title="Run Details" />
        <div className="page-scroll muted" style={{ display: "grid", placeItems: "center" }}>
          Loading...
        </div>
      </>
    );
  }

  if (!run) {
    return (
      <>
        <TopBar title="Run Details" />
        <div className="page-scroll muted" style={{ display: "grid", placeItems: "center" }}>
          Run not found.
        </div>
      </>
    );
  }

  const failureCount = testCases.filter((testCase) => testCase.status === "failed").length;
  const hasLiveOutput =
    execution.runId === run.id && execution.outputLines.length > 0;

  return (
    <>
      <TopBar title="Run Details" />
      <RunHeader run={run} />

      <Tabs.Root defaultValue="summary" className="run-details-tabs">
        <Tabs.List className="run-tabs-list">
          <Tabs.Trigger className="btn" value="summary">
            Summary
          </Tabs.Trigger>
          <Tabs.Trigger className="btn" value="failures">
            Failures{failureCount > 0 ? ` (${failureCount})` : ""}
          </Tabs.Trigger>
          <Tabs.Trigger className="btn" value="all-tests">
            All Tests
          </Tabs.Trigger>
          <Tabs.Trigger className="btn" value="logs">
            Logs
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="summary" className="flex-1 min-h-0 overflow-auto">
          <SummaryTab run={run} testCases={testCases} />
        </Tabs.Content>
        <Tabs.Content value="failures" className="flex-1 min-h-0 overflow-auto">
          <FailuresTab testCases={testCases} />
        </Tabs.Content>
        <Tabs.Content value="all-tests" className="flex-1 min-h-0 overflow-auto">
          <AllTestsTab testCases={testCases} />
        </Tabs.Content>
        <Tabs.Content value="logs" className="flex-1 min-h-0 overflow-hidden">
          {hasLiveOutput ? (
            <div className="page-scroll">
              <LiveOutputTerminal lines={execution.outputLines} />
            </div>
          ) : (
            <LogsTab log={run.raw_log ?? ""} />
          )}
        </Tabs.Content>
      </Tabs.Root>

      <style>{`
        [data-state="active"].btn {
          background: var(--accent);
          border-color: var(--accent);
          color: #f6fffc;
        }
      `}</style>
    </>
  );
}
