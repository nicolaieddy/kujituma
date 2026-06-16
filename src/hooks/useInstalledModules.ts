import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOfflineQuery } from "@/hooks/useOfflineQuery";
import type { ModuleId, UserModuleRow, UserModuleStatus } from "@/modules/types";

const INSTALLED_STATUSES: UserModuleStatus[] = ["installed", "trialing"];

export const installedModulesKey = (userId: string | undefined) =>
  ["user-modules", userId ?? "anon"] as const;

export function useInstalledModules() {
  const { user } = useAuth();

  const q = useOfflineQuery<ModuleId[]>({
    queryKey: installedModulesKey(user?.id),
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_modules")
        .select("module_id, status")
        .eq("user_id", user!.id)
        .in("status", INSTALLED_STATUSES);
      if (error) throw error;
      return (data ?? []).map((r) => r.module_id as ModuleId);
    },
    staleTime: 60_000,
  });
  return { ...q, data: q.data ? new Set(q.data) : undefined };
}

export function useIsModuleInstalled(id: ModuleId): boolean {
  const { data } = useInstalledModules();
  return data?.has(id) ?? false;
}

export function useAllUserModules() {
  const { user } = useAuth();
  return useOfflineQuery<UserModuleRow[]>({
    queryKey: ["user-modules-all", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_modules")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as UserModuleRow[];
    },
  });
}

export function useInstallModule() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (moduleId: ModuleId) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("user_modules")
        .upsert(
          {
            user_id: user.id,
            module_id: moduleId,
            status: "installed",
            uninstalled_at: null,
          },
          { onConflict: "user_id,module_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: installedModulesKey(user?.id) });
      qc.invalidateQueries({ queryKey: ["user-modules-all", user?.id] });
    },
  });
}

export function useUninstallModule() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (moduleId: ModuleId) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("user_modules")
        .update({ status: "uninstalled", uninstalled_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("module_id", moduleId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: installedModulesKey(user?.id) });
      qc.invalidateQueries({ queryKey: ["user-modules-all", user?.id] });
    },
  });
}
