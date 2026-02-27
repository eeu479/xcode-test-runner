import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllSettings, updateSetting } from "../lib/db";

export interface AppSettings {
  project_path: string;
  current_project_id: string;
  default_scope: string;
  stop_on_first_failure: boolean;
  notify_on_completion: boolean;
  notify_only_on_failure: boolean;
  retain_last_runs: number;
  default_simulator: string;
}

function parseSettings(raw: Record<string, string>): AppSettings {
  return {
    project_path: raw.project_path ?? "",
    current_project_id: raw.current_project_id ?? "",
    default_scope: raw.default_scope ?? "all",
    stop_on_first_failure: raw.stop_on_first_failure === "true",
    notify_on_completion: raw.notify_on_completion !== "false",
    notify_only_on_failure: raw.notify_only_on_failure === "true",
    retain_last_runs: parseInt(raw.retain_last_runs ?? "50", 10),
    default_simulator: raw.default_simulator ?? "",
  };
}

export function useSettings() {
  return useQuery<AppSettings>({
    queryKey: ["settings"],
    queryFn: async () => {
      const raw = await getAllSettings();
      return parseSettings(raw);
    },
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      updateSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}
