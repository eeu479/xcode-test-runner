import { create } from "zustand";

export type RunMode = "targets" | "testPlans";

interface SelectionState {
  /** Keys: "schemeName" (whole scheme) or "schemeName|TargetName" (single target). */
  selectedSchemeTargets: Set<string>;
  /** Keys: "packagePath" (all targets) or "packagePath|TargetName" (single target). */
  selectedPackageTargets: Set<string>;
  /** Test plan names (or paths) for run-by-test-plan. */
  selectedTestPlans: Set<string>;
  runMode: RunMode;

  toggleSchemeTarget: (key: string) => void;
  togglePackageTarget: (key: string) => void;
  toggleTestPlan: (planKey: string) => void;
  setRunMode: (mode: RunMode) => void;
  /** Select all target keys (scheme and package keys). */
  selectAllTargets: (schemeKeys: string[], packageKeys: string[]) => void;
  selectAllTestPlans: (planKeys: string[]) => void;
  clearAll: () => void;
  clearTargets: () => void;
  clearTestPlans: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedSchemeTargets: new Set(),
  selectedPackageTargets: new Set(),
  selectedTestPlans: new Set(),
  runMode: "targets",

  toggleSchemeTarget: (key) =>
    set((state) => {
      const next = new Set(state.selectedSchemeTargets);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { selectedSchemeTargets: next };
    }),

  togglePackageTarget: (key) =>
    set((state) => {
      const next = new Set(state.selectedPackageTargets);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { selectedPackageTargets: next };
    }),

  toggleTestPlan: (planKey) =>
    set((state) => {
      const next = new Set(state.selectedTestPlans);
      if (next.has(planKey)) next.delete(planKey);
      else next.add(planKey);
      return { selectedTestPlans: next };
    }),

  setRunMode: (mode) => set({ runMode: mode }),

  selectAllTargets: (schemeKeys, packageKeys) =>
    set({
      selectedSchemeTargets: new Set(schemeKeys),
      selectedPackageTargets: new Set(packageKeys),
    }),

  selectAllTestPlans: (planKeys) =>
    set({ selectedTestPlans: new Set(planKeys) }),

  clearAll: () =>
    set({
      selectedSchemeTargets: new Set(),
      selectedPackageTargets: new Set(),
      selectedTestPlans: new Set(),
    }),

  clearTargets: () =>
    set({
      selectedSchemeTargets: new Set(),
      selectedPackageTargets: new Set(),
    }),

  clearTestPlans: () => set({ selectedTestPlans: new Set() }),
}));
