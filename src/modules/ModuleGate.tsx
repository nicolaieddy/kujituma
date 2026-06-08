import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useIsModuleInstalled, useInstalledModules } from "@/hooks/useInstalledModules";
import { useAuth } from "@/contexts/AuthContext";
import type { ModuleId } from "@/modules/types";

interface ModuleGateProps {
  id: ModuleId;
  children: ReactNode;
  fallback?: ReactNode;
}

/** Renders children only when the given module is installed for the current user. */
export function ModuleGate({ id, children, fallback = null }: ModuleGateProps) {
  const { user, loading: authLoading } = useAuth();
  const { isLoading, isFetched } = useInstalledModules();
  const installed = useIsModuleInstalled(id);
  if (authLoading || !user || isLoading || !isFetched) return null;
  return <>{installed ? children : fallback}</>;
}

interface RequireModuleProps {
  id: ModuleId;
  children: ReactNode;
}

/** Route-level guard: redirects to /modules when the module is not installed. */
export function RequireModule({ id, children }: RequireModuleProps) {
  const { user, loading: authLoading } = useAuth();
  const { isLoading, isFetched } = useInstalledModules();
  const installed = useIsModuleInstalled(id);
  // Wait for auth + the modules query to actually resolve before deciding.
  // Otherwise on a hard refresh the query is `enabled: false` while auth loads
  // (user null), `isLoading` is false, `installed` is false → we'd incorrectly
  // bounce the user to /modules.
  if (authLoading || !user || isLoading || !isFetched) return null;
  if (!installed) return <Navigate to={`/modules?highlight=${id}`} replace />;
  return <>{children}</>;
}
