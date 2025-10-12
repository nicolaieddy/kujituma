import { motion } from "framer-motion";
import { Card } from "./card";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  hoverScale?: boolean;
  onClick?: () => void;
}

export const AnimatedCard = ({ 
  children, 
  className, 
  delay = 0,
  hoverScale = true,
  onClick 
}: AnimatedCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay,
        ease: [0.4, 0, 0.2, 1]
      }}
      whileHover={hoverScale ? { 
        scale: 1.02,
        transition: { duration: 0.2 }
      } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
    >
      <Card 
        className={cn(
          "transition-all duration-200 hover:shadow-lg",
          onClick && "cursor-pointer",
          className
        )}
        onClick={onClick}
      >
        {children}
      </Card>
    </motion.div>
  );
};

export const StaggerContainer = ({ children }: { children: ReactNode }) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: 0.1
          }
        }
      }}
    >
      {children}
    </motion.div>
  );
};

export const StaggerItem = ({ children, className }: { children: ReactNode; className?: string }) => {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: {
            duration: 0.3,
            ease: [0.4, 0, 0.2, 1]
          }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
