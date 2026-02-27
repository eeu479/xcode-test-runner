import { create } from "zustand";

export interface OutputLine {
  timestamp: number;
  text: string;
  kind: "stdout" | "stderr" | "system";
}

export interface LiveTestResult {
  name: string;
  status: "passed" | "failed" | "skipped";
  durationMs: number;
}

export type TargetRunStatus = "pending" | "running" | "passed" | "failed";

interface ExecutionState {
  isRunning: boolean;
  runId: string | null;
  outputLines: OutputLine[];
  liveResults: LiveTestResult[];
  testsRun: number;
  testsTotal: number;
  targetKeys: string[];
  targetStatuses: Record<string, TargetRunStatus>;

  startRun: (runId: string, targetKeys?: string[]) => void;
  setTargetCompleted: (key: string, success: boolean) => void;
  appendOutput: (line: OutputLine) => void;
  addTestResult: (result: LiveTestResult) => void;
  setProgress: (run: number, total: number) => void;
  finishRun: () => void;
  reset: () => void;
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  isRunning: false,
  runId: null,
  outputLines: [],
  liveResults: [],
  testsRun: 0,
  testsTotal: 0,
  targetKeys: [],
  targetStatuses: {},

  startRun: (runId, targetKeys) => {
    const statuses: Record<string, TargetRunStatus> = {};
    if (targetKeys && targetKeys.length > 0) {
      for (let i = 0; i < targetKeys.length; i++) {
        statuses[targetKeys[i]] = i === 0 ? "running" : "pending";
      }
    }
    set({
      isRunning: true,
      runId,
      outputLines: [],
      liveResults: [],
      testsRun: 0,
      testsTotal: 0,
      targetKeys: targetKeys ?? [],
      targetStatuses: statuses,
    });
  },

  setTargetCompleted: (key, success) =>
    set((state) => {
      const next: Record<string, TargetRunStatus> = {
        ...state.targetStatuses,
        [key]: success ? "passed" : "failed",
      };
      const idx = state.targetKeys.indexOf(key);
      if (idx >= 0 && idx < state.targetKeys.length - 1) {
        next[state.targetKeys[idx + 1]] = "running";
      }
      return { targetStatuses: next };
    }),

  appendOutput: (line) =>
    set((state) => ({ outputLines: [...state.outputLines, line] })),

  addTestResult: (result) =>
    set((state) => ({ liveResults: [...state.liveResults, result] })),

  setProgress: (testsRun, testsTotal) => set({ testsRun, testsTotal }),

  finishRun: () =>
    set({
      isRunning: false,
      targetKeys: [],
      targetStatuses: {},
    }),

  reset: () =>
    set({
      isRunning: false,
      runId: null,
      outputLines: [],
      liveResults: [],
      testsRun: 0,
      testsTotal: 0,
      targetKeys: [],
      targetStatuses: {},
    }),
}));
