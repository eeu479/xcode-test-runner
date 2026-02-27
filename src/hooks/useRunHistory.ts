import { useQuery } from "@tanstack/react-query";
import { getRuns, getRun, getTestCases } from "../lib/db";
import type { DbTestRun, DbTestCase } from "../lib/db";

export type TestRun = DbTestRun;
export type TestCase = DbTestCase;

export function useRuns(projectId?: string | null) {
  return useQuery<TestRun[]>({
    queryKey: ["runs", projectId ?? "all"],
    queryFn: () => getRuns(50, projectId ?? undefined),
  });
}

export function useRun(runId: string | undefined) {
  return useQuery<TestRun | null>({
    queryKey: ["run", runId],
    queryFn: () => getRun(runId!),
    enabled: !!runId,
  });
}

export function useTestDetails(runId: string | undefined) {
  return useQuery<TestCase[]>({
    queryKey: ["testDetails", runId],
    queryFn: () => getTestCases(runId!),
    enabled: !!runId,
  });
}

export function useHistory(limit = 50, projectId?: string | null) {
  return useQuery<TestRun[]>({
    queryKey: ["history", limit, projectId ?? "all"],
    queryFn: () => getRuns(limit, projectId ?? undefined),
  });
}
