import { useNavigate, useLocation } from "react-router-dom";
import {
  Target, UserPlus, BarChart3, Shield, Blocks, Moon, Stethoscope, Dumbbell,
  Users, Megaphone, Newspaper, ChevronDown, Settings2, Pin, PinOff,
} from "lucide-react";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useInstalledModules } from "@/hooks/useInstalledModules";
import { useModuleNavPrefs } from "@/hooks/useModuleNavPrefs";
import type { ModuleId } from "@/modules/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ModuleNavCustomizer, type ModuleNavEntry } from "./ModuleNavCustomizer";
import { useState } from "react";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, horizontalListSortingStrategy,
  arrayMove, sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

  // Mobile: sectioned list with larger tap targets and inline pin/unpin
  if (isMobile) {
    const renderRow = (
      item: CoreNavItem,
      opts?: { moduleId?: ModuleId; isPinned?: boolean },
    ) => {
      const Icon = item.icon;
      const isActive = currentSection === item.section;
      return (
        <div
          key={item.section}
          className={`group flex items-center gap-2 rounded-lg ${
            isActive ? "bg-accent" : ""
          }`}
        >
          <button
            onClick={() => handleNavigation(item.path)}
            className={`flex flex-1 items-center min-h-[48px] text-left py-3 px-4 rounded-lg transition-colors ${
              isActive
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-accent active:bg-accent"
            }`}
          >
            <Icon className="h-5 w-5 mr-3" />
            <span className="text-base">{item.label}</span>
          </button>
          {opts?.moduleId && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePin(opts.moduleId!);
              }}
              aria-label={opts.isPinned ? `Unpin ${item.label}` : `Pin ${item.label}`}
              className={`mr-2 flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                opts.isPinned
                  ? "text-primary hover:bg-primary/10"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {opts.isPinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
            </button>
          )}
        </div>
      );
    };

    const SectionHeader = ({ children }: { children: React.ReactNode }) => (
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4 pt-4 pb-1">
        {children}
      </p>
    );

    return (
      <div className="flex flex-col gap-0.5">
        {CORE_ITEMS.map((i) => renderRow(i))}

        {pinnedItems.length > 0 && (
          <>
            <SectionHeader>Pinned modules</SectionHeader>
            {pinnedItems.map((i) => renderRow(i, { moduleId: i.moduleId, isPinned: true }))}
          </>
        )}

        {overflowItems.length > 0 && (
          <>
            <SectionHeader>More modules</SectionHeader>
            {overflowItems.map((i) => renderRow(i, { moduleId: i.moduleId, isPinned: false }))}
          </>
        )}

        <SectionHeader>Manage</SectionHeader>
        {renderRow({ path: "/modules", label: "Modules", icon: Blocks, section: "modules" })}
        {isAdmin && renderRow({ path: "/admin", label: "Admin", icon: Shield, section: "admin" })}
      </div>
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handlePinnedDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = pinned.indexOf(active.id as ModuleId);
    const newIndex = pinned.indexOf(over.id as ModuleId);
    if (oldIndex < 0 || newIndex < 0) return;
    const nextPinned = arrayMove(pinned, oldIndex, newIndex);
    reorder([...nextPinned, ...overflow]);
  };

  return (
    <nav className="flex items-center space-x-1">
      {CORE_ITEMS.map(renderPill)}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePinnedDragEnd}>
        <SortableContext items={pinned} strategy={horizontalListSortingStrategy}>
          <div className="flex items-center space-x-1">
            {pinnedItems.map((item) => (
              <SortablePill
                key={item.section}
                id={item.moduleId}
                item={item}
                isActive={currentSection === item.section}
                onClick={() => handleNavigation(item.path)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>


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
                    <div
                      key={item.section}
                      className={`group flex items-center gap-1 rounded-md pr-1 transition-colors ${
                        isActive ? "bg-primary/10" : "hover:bg-muted"
                      }`}
                    >
                      <button
                        onClick={() => handleNavigation(item.path)}
                        className={`flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left ${
                          isActive ? "text-primary font-medium" : "text-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePin(item.moduleId);
                        }}
                        title="Pin to top bar"
                        aria-label={`Pin ${item.label} to top bar`}
                        className="flex items-center gap-1 rounded px-1.5 py-1 text-[11px] text-muted-foreground hover:bg-background hover:text-primary transition-colors"
                      >
                        <Pin className="h-3.5 w-3.5" />
                        <span className="hidden group-hover:inline">Pin</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground px-2 py-2">
                All your modules are pinned. Drag pills in the bar to reorder, or unpin below.
              </p>
            )}

            {pinnedItems.length > 0 && (
              <>
                <Separator className="my-2" />
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground px-2 mb-1">
                  Pinned
                </p>
                <div className="space-y-0.5">
                  {pinnedItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.section} className="group flex items-center gap-1 rounded-md pr-1 hover:bg-muted">
                        <div className="flex flex-1 items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePin(item.moduleId);
                          }}
                          title="Unpin from top bar"
                          aria-label={`Unpin ${item.label} from top bar`}
                          className="flex items-center gap-1 rounded px-1.5 py-1 text-[11px] text-primary hover:bg-background transition-colors"
                        >
                          <PinOff className="h-3.5 w-3.5" />
                          <span className="hidden group-hover:inline">Unpin</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
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

function SortablePill({
  id,
  item,
  isActive,
  onClick,
}: {
  id: ModuleId;
  item: ModuleNavItem;
  isActive: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };
  const Icon = item.icon;
  return (
    <button
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      {...attributes}
      {...listeners}
      className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm leading-none transition-colors duration-200 touch-none ${
        isDragging ? "cursor-grabbing shadow-md ring-1 ring-primary/30" : "cursor-grab"
      } ${
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
    >
      <Icon className={`h-3.5 w-3.5 ${isActive ? "text-primary" : ""}`} />
      {item.label}
    </button>
  );
}

