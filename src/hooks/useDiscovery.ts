import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import {
  getProjectDiscovery,
  saveProjectDiscovery,
  type ProjectInfo as DbProjectInfo,
} from "../lib/db";

export interface Scheme {
  name: string;
  test_targets: string[];
}

export interface SwiftPackage {
  name: string;
  path: string;
  test_targets: string[];
}

export interface TestPlan {
  name: string;
  path: string;
}

export interface ProjectInfo {
  path: string;
  schemes: Scheme[];
  swift_packages: SwiftPackage[];
  test_plans: TestPlan[];
}

export function useStoredDiscovery(projectId: string | null) {
  return useQuery<ProjectInfo | null>({
    queryKey: ["projectDiscovery", projectId],
    queryFn: () => getProjectDiscovery(projectId!),
    enabled: !!projectId,
  });
}

export function useScanProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      path,
    }: {
      projectId: string;
      path: string;
    }) => {
      const result = await invoke<DbProjectInfo>("discover_project", { path });
      await saveProjectDiscovery(projectId, path, result);
      return result;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({
        queryKey: ["projectDiscovery", projectId],
      });
    },
  });
}

export function useDiscovery(projectPath: string | null) {
  return useQuery<ProjectInfo>({
    queryKey: ["discovery", projectPath],
    queryFn: async () => {
      return invoke<ProjectInfo>("discover_project", { path: projectPath });
    },
    enabled: !!projectPath,
  });
}

export function useRefreshDiscovery() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["discovery"] });
}
