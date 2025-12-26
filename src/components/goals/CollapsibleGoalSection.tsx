import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CollapsibleGoalSectionProps {
  title: string;
  count: number;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  variant?: 'default' | 'muted' | 'success';
  children: React.ReactNode;
}

export const CollapsibleGoalSection = ({
  title,
  count,
  icon,
  defaultOpen = false,
  variant = 'default',
  children
}: CollapsibleGoalSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const variantStyles = {
    default: 'border-border',
    muted: 'border-muted bg-muted/30',
    success: 'border-primary/20 bg-primary/5'
  };

  const badgeStyles = {
    default: 'bg-secondary text-secondary-foreground',
    muted: 'bg-muted text-muted-foreground',
    success: 'bg-primary/10 text-primary'
  };

  return (
    <div className={cn(
      "border rounded-lg overflow-hidden",
      variantStyles[variant]
    )}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <motion.div
            initial={false}
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </motion.div>
          {icon}
          <span className="font-medium text-foreground">{title}</span>
        </div>
        <Badge className={cn("text-xs", badgeStyles[variant])}>
          {count}
        </Badge>
      </button>
      
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="p-4 pt-0 space-y-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
