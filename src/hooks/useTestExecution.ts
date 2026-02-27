import { useQueryClient } from "@tanstack/react-query";
import { Channel, invoke } from "@tauri-apps/api/core";
import { insertRun, insertTestCase, updateRunCompletion } from "../lib/db";
import { useSettings } from "./useSettings";
import { useExecutionStore } from "../stores/executionStore";
import { useSelectionStore } from "../stores/selectionStore";

/** Build scheme_targets from keys "scheme" or "scheme|TargetName". Whole-scheme key runs entire scheme once. */
function buildSchemeTargetsFromKeys(
  keys: string[],
): { scheme: string; only_testing_target: string | null }[] {
  const wholeSchemes = new Set<string>();
  const schemeTargets: { scheme: string; target: string }[] = [];
  for (const key of keys) {
    const idx = key.indexOf("|");
    if (idx === -1) {
      wholeSchemes.add(key);
    } else {
      schemeTargets.push({
        scheme: key.slice(0, idx),
        target: key.slice(idx + 1),
      });
    }
  }
  const out: { scheme: string; only_testing_target: string | null }[] = [];
  for (const s of wholeSchemes) {
    out.push({ scheme: s, only_testing_target: null });
  }
  for (const { scheme, target } of schemeTargets) {
    if (!wholeSchemes.has(scheme)) {
      out.push({ scheme, only_testing_target: target });
    }
  }
  return out;
}

/** Build package targets from keys "path" or "path|TargetName". Whole-path key runs all targets once. */
function buildPackageTargetsFromKeys(
  keys: string[],
): { path: string; filter: string | null }[] {
  const wholePaths = new Set<string>();
  const pathTargets: { path: string; filter: string }[] = [];
  for (const key of keys) {
    const idx = key.indexOf("|");
    if (idx === -1) {
      wholePaths.add(key);
    } else {
      pathTargets.push({
        path: key.slice(0, idx),
        filter: key.slice(idx + 1),
      });
    }
  }
  const out: { path: string; filter: string | null }[] = [];
  for (const p of wholePaths) {
    out.push({ path: p, filter: null });
  }
  for (const { path, filter } of pathTargets) {
    if (!wholePaths.has(path)) {
      out.push({ path, filter });
    }
  }
  return out;
}

/** Build ordered target keys for the run (same order as backend: scheme_targets, test_plan_runs, packages). */
function buildTargetKeysForRun(
  schemeTargets: { scheme: string; only_testing_target: string | null }[],
  testPlanRuns: { scheme: string; test_plan_name: string }[],
  packages: { path: string; filter: string | null }[],
): string[] {
  const keys: string[] = [];
  for (const st of schemeTargets) {
    keys.push(
      st.only_testing_target != null
        ? `${st.scheme}|${st.only_testing_target}`
        : st.scheme,
    );
  }
  for (const tp of testPlanRuns) {
    keys.push(`plan:${tp.scheme}:${tp.test_plan_name}`);
  }
  for (const pkg of packages) {
    keys.push(pkg.filter != null ? `${pkg.path}|${pkg.filter}` : pkg.path);
  }
  return keys;
}

interface TestRunEvent {
  type: string;
  line?: string;
  name?: string;
  suite?: string;
  status?: string;
  duration_ms?: number;
  tests_run?: number;
  tests_total?: number;
  run_id?: string;
  success?: boolean;
  message?: string;
  key?: string;
}

export function useTestExecution() {
  const store = useExecutionStore();
  const selection = useSelectionStore();
  const queryClient = useQueryClient();
  const { data: settings } = useSettings();

  const runTests = async (
    projectPath: string,
    stopOnFirstFailure = false,
    projectId?: string | null,
    options?: {
      mode?: "all" | "selected";
      /** For mode "all" + run by targets: keys "scheme" or "scheme|TargetName". */
      allSchemeTargets?: string[];
      /** For mode "all" + run by targets: keys "path" or "path|TargetName". */
      allPackageTargets?: string[];
      /** Override selection: run these scheme/package keys (e.g. when running a suite). */
      overrideSchemeTargets?: string[];
      overridePackageTargets?: string[];
      /** Override scope label for run record (e.g. "Suite: MySuite"). */
      scopeLabel?: string;
      /** For run by test plans: scheme to use when running selected test plans. */
      defaultSchemeForTestPlans?: string;
      /** For mode "all" + run by test plans. */
      allTestPlanRuns?: { scheme: string; test_plan_name: string }[];
    },
  ) => {
    const startTime = Date.now();
    const collectedLines: string[] = [];
    const collectedResults: {
      name: string;
      suite: string;
      status: string;
      duration_ms: number;
    }[] = [];
    const collectedTargetResults: { key: string; success: boolean }[] = [];

    const onEvent = new Channel<TestRunEvent>();

    onEvent.onmessage = (event) => {
      switch (event.type) {
        case "RunStarted":
          if (event.run_id) {
            store.startRun(event.run_id, targetKeysForRun);
            store.appendOutput({
              timestamp: Date.now(),
              text: `Run started: ${event.run_id}`,
              kind: "system",
            });
          }
          break;
        case "Stdout":
          store.appendOutput({
            timestamp: Date.now(),
            text: event.line ?? "",
            kind: "stdout",
          });
          collectedLines.push(event.line ?? "");
          break;
        case "Stderr":
          store.appendOutput({
            timestamp: Date.now(),
            text: event.line ?? "",
            kind: "stderr",
          });
          collectedLines.push(`[stderr] ${event.line ?? ""}`);
          break;
        case "TestCompleted":
          if (event.name && event.status) {
            store.addTestResult({
              name: event.name,
              status: event.status as "passed" | "failed" | "skipped",
              durationMs: event.duration_ms ?? 0,
            });
            collectedResults.push({
              name: event.name,
              suite: event.suite ?? "",
              status: event.status,
              duration_ms: event.duration_ms ?? 0,
            });
          }
          break;
        case "Progress":
          store.setProgress(event.tests_run ?? 0, event.tests_total ?? 0);
          break;
        case "TargetCompleted":
          if (event.key != null) {
            store.setTargetCompleted(event.key, event.success ?? false);
            collectedTargetResults.push({
              key: event.key,
              success: event.success ?? false,
            });
          }
          break;
        case "RunFinished":
          store.finishRun();
          break;
        case "Error":
          store.appendOutput({
            timestamp: Date.now(),
            text: `Error: ${event.message ?? "Unknown error"}`,
            kind: "stderr",
          });
          break;
      }
    };

    const mode = options?.mode ?? "selected";
    const runMode = selection.runMode;

    const schemeTargets =
      options?.overrideSchemeTargets != null
        ? buildSchemeTargetsFromKeys(options.overrideSchemeTargets)
        : mode === "all" && options?.allSchemeTargets
          ? buildSchemeTargetsFromKeys(options.allSchemeTargets)
          : buildSchemeTargetsFromKeys(
              Array.from(selection.selectedSchemeTargets),
            );
    const packages =
      options?.overridePackageTargets != null
        ? buildPackageTargetsFromKeys(options.overridePackageTargets)
        : mode === "all" && options?.allPackageTargets
          ? buildPackageTargetsFromKeys(options.allPackageTargets)
          : buildPackageTargetsFromKeys(
              Array.from(selection.selectedPackageTargets),
            );
    const testPlanRuns =
      runMode === "testPlans"
        ? mode === "all" && options?.allTestPlanRuns
          ? options.allTestPlanRuns
          : Array.from(selection.selectedTestPlans).map((planKey) => ({
              scheme: options?.defaultSchemeForTestPlans ?? "",
              test_plan_name: planKey,
            }))
        : [];

    const hasTargets = schemeTargets.length > 0 || packages.length > 0;
    const hasTestPlans = testPlanRuns.length > 0;

    if (runMode === "targets" && !hasTargets) {
      const message =
        mode === "all"
          ? "No runnable schemes or Swift packages were discovered for this project."
          : "No targets selected. Choose targets in Targets & Suites first.";
      store.appendOutput({
        timestamp: Date.now(),
        text: message,
        kind: "system",
      });
      throw new Error(message);
    }
    if (runMode === "testPlans" && !hasTestPlans) {
      const message =
        mode === "all"
          ? "No test plans were discovered."
          : "No test plans selected.";
      store.appendOutput({
        timestamp: Date.now(),
        text: message,
        kind: "system",
      });
      throw new Error(message);
    }

    const scope =
      options?.scopeLabel ??
      (hasTargets && hasTestPlans
        ? "Both"
        : hasTestPlans
          ? "Test plans"
          : schemeTargets.length > 0 && packages.length > 0
            ? "Both"
            : schemeTargets.length > 0
              ? "Project"
              : "Packages");

    const targetKeysForRun = buildTargetKeysForRun(
      schemeTargets,
      testPlanRuns,
      packages,
    );

    try {
      const destination =
        settings?.default_simulator?.trim() || null;
      const runId = await invoke<string>("run_tests", {
        params: {
          project_path: projectPath,
          scheme_targets: runMode === "targets" ? schemeTargets : [],
          packages: runMode === "targets" ? packages : [],
          stop_on_first_failure: stopOnFirstFailure,
          test_plan_runs: runMode === "testPlans" ? testPlanRuns : [],
          destination,
        },
        onEvent,
      });

      // Persist run to DB
      await insertRun({
        id: runId,
        project_path: projectPath,
        project_id: projectId ?? undefined,
        scope,
        started_at: new Date().toISOString(),
      });

      const endTime = Date.now();
      const passed = collectedResults.filter(
        (r) => r.status === "passed",
      ).length;
      const failed = collectedResults.filter(
        (r) => r.status === "failed",
      ).length;
      const skipped = collectedResults.filter(
        (r) => r.status === "skipped",
      ).length;

      // Update run completion in DB
      await updateRunCompletion({
        id: runId,
        status: failed > 0 ? "failed" : "passed",
        finished_at: new Date().toISOString(),
        duration_ms: endTime - startTime,
        total_tests: collectedResults.length,
        passed_tests: passed,
        failed_tests: failed,
        skipped_tests: skipped,
        raw_log: collectedLines.join("\n"),
        target_results:
          collectedTargetResults.length > 0 ? collectedTargetResults : undefined,
      });

      // Persist individual test cases
      for (const result of collectedResults) {
        await insertTestCase({
          run_id: runId,
          suite_name: result.suite,
          test_name: result.name,
          status: result.status,
          duration_ms: result.duration_ms,
          failure_message: null,
        });
      }

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ["runs"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });

      return runId;
    } catch (err) {
      store.finishRun();
      throw err;
    }
  };

  const cancelRun = async () => {
    await invoke("cancel_run");
  };

  return { runTests, cancelRun };
}
