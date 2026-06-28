import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pin, PinOff } from "lucide-react";
import type { ModuleId } from "@/modules/types";

export interface ModuleNavEntry {
  id: ModuleId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface Props {
  order: ModuleId[];
  pinned: ModuleId[];
  entries: Record<string, ModuleNavEntry>;
  onReorder: (next: ModuleId[]) => void;
  onTogglePin: (id: ModuleId) => void;
}

export function ModuleNavCustomizer({ order, pinned, entries, onReorder, onTogglePin }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const pinnedSet = new Set(pinned);

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(active.id as ModuleId);
    const newIndex = order.indexOf(over.id as ModuleId);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(order, oldIndex, newIndex));
  };

  if (order.length === 0) {
    return (
      <p className="text-xs text-muted-foreground px-2 py-3">
        No modules installed yet. Install some from the Modules page.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-medium text-foreground">Customize nav</p>
        <p className="text-[10px] text-muted-foreground">Drag to reorder · pin to bar</p>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ul className="space-y-1">
            {order.map((id) => {
              const entry = entries[id];
              if (!entry) return null;
              return (
                <SortableRow
                  key={id}
                  id={id}
                  entry={entry}
                  isPinned={pinnedSet.has(id)}
                  onTogglePin={() => onTogglePin(id)}
                />
              );
            })}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableRow({
  id,
  entry,
  isPinned,
  onTogglePin,
}: {
  id: ModuleId;
  entry: ModuleNavEntry;
  isPinned: boolean;
  onTogglePin: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const Icon = entry.icon;
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border border-border/40 bg-card px-2 py-1.5"
    >
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-xs flex-1 truncate">{entry.label}</span>
      <button
        type="button"
        onClick={onTogglePin}
        className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] transition-colors ${
          isPinned
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
        aria-label={isPinned ? "Unpin from nav" : "Pin to nav"}
      >
        {isPinned ? <Pin className="h-3 w-3" /> : <PinOff className="h-3 w-3" />}
        {isPinned ? "Pinned" : "Pin"}
      </button>
    </li>
  );
}
