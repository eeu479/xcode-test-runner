import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProjects,
  getProject,
  getProjectByPath,
  insertProject,
  updateProject,
  deleteProject,
  updateSetting,
} from "../lib/db";
import type { DbProject } from "../lib/db";
import { useSettings } from "./useSettings";
import type { AppSettings } from "./useSettings";

export function useProjects() {
  return useQuery<DbProject[]>({
    queryKey: ["projects"],
    queryFn: () => getProjects(),
  });
}

export function useCurrentProject() {
  const { data: settings } = useSettings();
  const currentProjectId = settings?.current_project_id ?? "";
  const query = useQuery<DbProject | null>({
    queryKey: ["project", currentProjectId],
    queryFn: () => getProject(currentProjectId),
    enabled: !!currentProjectId,
  });
  return {
    ...query,
    data: !currentProjectId ? null : query.data ?? null,
  };
}

export function useSetCurrentProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => {
      console.debug("[projects] set current project:start", { projectId });
      await updateSetting("current_project_id", projectId);
      console.debug("[projects] set current project:done", { projectId });
    },
    onSuccess: (_, projectId) => {
      // Update settings cache immediately so useCurrentProject sees the new id
      queryClient.setQueryData<AppSettings>(["settings"], (prev) =>
        prev ? { ...prev, current_project_id: projectId } : prev,
      );
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["runs"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });
}

export function useAddProject() {
  const queryClient = useQueryClient();
  const setCurrentProject = useSetCurrentProject();

  function newProjectId(): string {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
    return `project_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  return useMutation({
    onMutate: (variables) => {
      console.debug("[projects] add project:start", variables);
    },
    mutationFn: async ({
      name,
      path,
    }: {
      name: string;
      path: string;
    }) => {
      const existingProject = await getProjectByPath(path);
      if (existingProject) {
        console.debug("[projects] add project:existing path reused", {
          path,
          projectId: existingProject.id,
        });
        return existingProject.id;
      }

      const id = newProjectId();
      console.debug("[projects] add project:insert", { id, name, path });
      await insertProject({ id, name, path });
      console.debug("[projects] add project:inserted", { id });
      return id;
    },
    onSuccess: async (projectId) => {
      console.debug("[projects] add project:success", { projectId });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      await setCurrentProject.mutateAsync(projectId);
    },
    onError: (error) => {
      console.error("[projects] add project:error", error);
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: { name?: string; path?: string };
    }) => updateProject(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", id] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}
