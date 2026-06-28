import { useNavigate, useLocation } from "react-router-dom";
import {
  Target, UserPlus, BarChart3, Shield, Blocks, Moon, Stethoscope, Dumbbell,
  Users, Megaphone, Newspaper, ChevronDown, Settings2,
} from "lucide-react";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useInstalledModules } from "@/hooks/useInstalledModules";
import { useModuleNavPrefs } from "@/hooks/useModuleNavPrefs";
import type { ModuleId } from "@/modules/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ModuleNavCustomizer, type ModuleNavEntry } from "./ModuleNavCustomizer";
import { useState } from "react";

interface NavigationMenuProps {
  onItemClick?: () => void;
  isMobile?: boolean;
}

interface CoreNavItem {
  path: string;
  label: string;
  icon: typeof Target;
  section: string;
}

interface ModuleNavItem extends CoreNavItem {
  moduleId: ModuleId;
}

const CORE_ITEMS: CoreNavItem[] = [
  { path: "/goals", label: "Goals", icon: Target, section: "goals" },
  { path: "/friends", label: "Friends", icon: UserPlus, section: "friends" },
  { path: "/analytics", label: "Analytics", icon: BarChart3, section: "analytics" },
];

// All module-driven nav items. Order in the bar is user-configurable.
const MODULE_ITEMS: ModuleNavItem[] = [
  { moduleId: "training_plan", path: "/training", label: "Training", icon: Dumbbell, section: "training" },
  { moduleId: "sleep", path: "/sleep", label: "Sleep", icon: Moon, section: "sleep" },
  { moduleId: "health_metrics", path: "/health", label: "Health", icon: Stethoscope, section: "health" },
  { moduleId: "network", path: "/network", label: "Network", icon: Users, section: "network" },
  { moduleId: "social", path: "/social", label: "Social", icon: Megaphone, section: "social" },
  { moduleId: "media", path: "/media", label: "Media", icon: Newspaper, section: "media" },
];

const MODULE_BY_ID: Record<string, ModuleNavItem> = Object.fromEntries(
  MODULE_ITEMS.map((m) => [m.moduleId, m]),
);

function sectionFromPath(path: string): string {
  if (path.startsWith("/admin")) return "admin";
  if (path.startsWith("/goals")) return "goals";
  if (path.startsWith("/friends") || path.startsWith("/partner")) return "friends";
  if (path.startsWith("/analytics")) return "analytics";
  if (path.startsWith("/sleep")) return "sleep";
  if (path.startsWith("/health")) return "health";
  if (path.startsWith("/training")) return "training";
  if (path.startsWith("/network")) return "network";
  if (path.startsWith("/social")) return "social";
  if (path.startsWith("/media")) return "media";
  if (path.startsWith("/modules")) return "modules";
  if (path.startsWith("/profile")) return "profile";
  return "goals";
}

export const NavigationMenu = ({ onItemClick, isMobile = false }: NavigationMenuProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAdminStatus();
  const { data: installedModules } = useInstalledModules();
  const [moreOpen, setMoreOpen] = useState(false);

  const installedIds = MODULE_ITEMS
    .filter((m) => installedModules?.has(m.moduleId))
    .map((m) => m.moduleId);

  const { order, pinned, overflow, togglePin, reorder } = useModuleNavPrefs(installedIds);

  const currentSection = sectionFromPath(location.pathname);

  const handleNavigation = (path: string) => {
    navigate(path);
    onItemClick?.();
    setMoreOpen(false);
  };

  const pinnedItems = pinned.map((id) => MODULE_BY_ID[id]).filter(Boolean);
  const overflowItems = overflow.map((id) => MODULE_BY_ID[id]).filter(Boolean);

  // Mobile: show everything as a flat list (no overflow needed in sheet)
  if (isMobile) {
    const flat: CoreNavItem[] = [
      ...CORE_ITEMS,
      ...order.map((id) => MODULE_BY_ID[id]).filter(Boolean),
      { path: "/modules", label: "Modules", icon: Blocks, section: "modules" },
      ...(isAdmin ? [{ path: "/admin", label: "Admin", icon: Shield, section: "admin" }] : []),
    ];
    return (
      <>
        {flat.map(({ path, label, icon: Icon, section }) => (
          <button
            key={section}
            onClick={() => handleNavigation(path)}
            className={`flex items-center w-full text-left py-3 px-4 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200 ${
              currentSection === section ? "text-foreground font-medium bg-accent" : ""
            }`}
          >
            <Icon className="h-4 w-4 mr-3" />
            {label}
          </button>
        ))}
      </>
    );
  }

  const customizerEntries: Record<string, ModuleNavEntry> = Object.fromEntries(
    MODULE_ITEMS.map((m) => [m.moduleId, { id: m.moduleId, label: m.label, icon: m.icon }]),
  );

  const renderPill = (item: CoreNavItem) => {
    const isActive = currentSection === item.section;
    const Icon = item.icon;
    return (
      <button
        key={item.section}
        onClick={() => handleNavigation(item.path)}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm leading-none transition-all duration-200 ${
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        <Icon className={`h-3.5 w-3.5 ${isActive ? "text-primary" : ""}`} />
        {item.label}
      </button>
    );
  };

  const overflowHasActive = overflowItems.some((i) => i.section === currentSection);
  const needsMoreMenu = overflowItems.length > 0 || order.length > 0;

  return (
    <nav className="flex items-center space-x-1">
      {CORE_ITEMS.map(renderPill)}
      {pinnedItems.map(renderPill)}

      {needsMoreMenu && (
        <Popover open={moreOpen} onOpenChange={setMoreOpen}>
          <PopoverTrigger asChild>
            <button
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm leading-none transition-all duration-200 ${
                overflowHasActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              aria-label="More modules"
            >
              <span>More</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-2">
            {overflowItems.length > 0 ? (
              <div className="space-y-0.5">
                {overflowItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentSection === item.section;
                  return (
                    <button
                      key={item.section}
                      onClick={() => handleNavigation(item.path)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground px-2 py-2">
                All your modules are pinned. Open Customize to rearrange.
              </p>
            )}

            {order.length > 0 && (
              <>
                <Separator className="my-2" />
                <details className="group">
                  <summary className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted list-none">
                    <Settings2 className="h-3.5 w-3.5" />
                    <span>Customize nav</span>
                  </summary>
                  <div className="mt-2 px-1">
                    <ModuleNavCustomizer
                      order={order}
                      pinned={pinned}
                      entries={customizerEntries}
                      onReorder={reorder}
                      onTogglePin={togglePin}
                    />
                  </div>
                </details>
              </>
            )}
          </PopoverContent>
        </Popover>
      )}

      {renderPill({ path: "/modules", label: "Modules", icon: Blocks, section: "modules" })}
      {isAdmin && renderPill({ path: "/admin", label: "Admin", icon: Shield, section: "admin" })}
    </nav>
  );
};
