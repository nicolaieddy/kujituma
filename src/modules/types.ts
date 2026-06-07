import type { LucideIcon } from "lucide-react";

export type ModuleId = "training_plan" | "sleep";

export type ModuleTier = "free" | "pro";
export type ModuleStatus = "available" | "beta" | "coming_soon";
export type ModuleCategory = "fitness" | "productivity" | "wellbeing" | "social" | "health";

export interface ModuleNavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

export interface ModuleDefinition {
  id: ModuleId;
  name: string;
  tagline: string;
  description: string;
  coverEmoji: string;
  category: ModuleCategory;
  tier: ModuleTier;
  status: ModuleStatus;
  /** What this module adds, shown on the module detail card. */
  surfaces: {
    navItems?: ModuleNavItem[];
    thisWeekCards?: string[];
    profileSections?: string[];
    integrations?: string[];
    mcpToolPrefixes?: string[];
    pages?: string[];
  };
  /** DB tables this module reads/writes — surfaced in the uninstall dialog. */
  dataTables: string[];
}

export type UserModuleStatus = "installed" | "uninstalled" | "trialing" | "expired";

export interface UserModuleRow {
  id: string;
  user_id: string;
  module_id: ModuleId;
  status: UserModuleStatus;
  settings: Record<string, unknown>;
  installed_at: string;
  uninstalled_at: string | null;
}
