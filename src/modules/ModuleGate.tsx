import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useIsModuleInstalled, useInstalledModules } from "@/hooks/useInstalledModules";
import type { ModuleId } from "@/modules/types";

interface ModuleGateProps {
  id: ModuleId;
  children: ReactNode;
  fallback?: ReactNode;
}

/** Renders children only when the given module is installed for the current user. */
export function ModuleGate({ id, children, fallback = null }: ModuleGateProps) {
  const { isLoading } = useInstalledModules();
  const installed = useIsModuleInstalled(id);
  if (isLoading) return null;
  return <>{installed ? children : fallback}</>;
}

interface RequireModuleProps {
  id: ModuleId;
  children: ReactNode;
}

/** Route-level guard: redirects to /modules when the module is not installed. */
export function RequireModule({ id, children }: RequireModuleProps) {
  const { isLoading } = useInstalledModules();
  const installed = useIsModuleInstalled(id);
  if (isLoading) return null;
  if (!installed) return <Navigate to={`/modules?highlight=${id}`} replace />;
  return <>{children}</>;
}
