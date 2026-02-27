import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSuites,
  getSuite,
  insertSuite,
  updateSuite,
  deleteSuite,
} from "../lib/db";

export function useSuites(projectId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["suites", projectId],
    queryFn: () => getSuites(projectId!),
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (suite: {
      name: string;
      scheme_keys: string[];
      package_keys: string[];
    }) => {
      if (!projectId) throw new Error("No project selected");
      const id = crypto.randomUUID();
      return insertSuite({
        id,
        project_id: projectId,
        name: suite.name,
        scheme_keys: suite.scheme_keys,
        package_keys: suite.package_keys,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suites", projectId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: {
        name?: string;
        scheme_keys?: string[];
        package_keys?: string[];
      };
    }) => updateSuite(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suites", projectId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSuite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suites", projectId] });
    },
  });

  return {
    suites: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createSuite: createMutation.mutateAsync,
    updateSuite: updateMutation.mutateAsync,
    deleteSuite: deleteMutation.mutateAsync,
  };
}

export function useSuite(id: string | null) {
  return useQuery({
    queryKey: ["suite", id],
    queryFn: () => getSuite(id!),
    enabled: !!id,
  });
}
