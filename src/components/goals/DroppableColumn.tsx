import { useDroppable } from "@dnd-kit/core";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DroppableColumnProps {
  id: string;
  children: ReactNode;
  className?: string;
}

export const DroppableColumn = ({ id, children, className }: DroppableColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "space-y-3 min-h-[100px] rounded-lg transition-all duration-200",
        isOver && "bg-primary/5 ring-2 ring-primary/20 ring-dashed",
        className
      )}
    >
      {children}
    </div>
  );
};
