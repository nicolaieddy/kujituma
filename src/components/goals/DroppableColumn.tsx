import { useDroppable } from "@dnd-kit/core";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DroppableColumnProps {
  id: string;
  children: ReactNode;
  className?: string;
  isEmpty?: boolean;
}

export const DroppableColumn = ({ id, children, className, isEmpty }: DroppableColumnProps) => {
  const { setNodeRef, isOver, active } = useDroppable({ id });

  const isDragging = !!active;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "space-y-3 min-h-[100px] rounded-lg transition-all duration-200 relative",
        isOver && "bg-primary/5 ring-2 ring-primary/30 ring-dashed",
        isDragging && !isOver && "ring-1 ring-dashed ring-border",
        className
      )}
    >
      {/* Show drop indicator at top of empty column or when hovering over column */}
      {isOver && isEmpty && (
        <div className="absolute top-2 left-0 right-0 z-20 px-2">
          <div className="h-0.5 bg-primary rounded-full animate-pulse" />
          <div className="absolute left-1 -top-1 w-2.5 h-2.5 rounded-full bg-primary" />
          <div className="absolute right-1 -top-1 w-2.5 h-2.5 rounded-full bg-primary" />
        </div>
      )}
      {children}
    </div>
  );
};
