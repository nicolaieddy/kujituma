import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sun, Check } from "lucide-react";
import { useDailyCheckIn } from "@/hooks/useDailyCheckIn";
import { DailyCheckInDialog } from "./DailyCheckInDialog";
import { motion, AnimatePresence } from "framer-motion";

export const DailyCheckInButton = () => {
  const [showDialog, setShowDialog] = useState(false);
  const { hasCheckedInToday, isLoading } = useDailyCheckIn();
  
  if (isLoading) return null;
  
  return (
    <>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          onClick={() => setShowDialog(true)}
          size="lg"
          className={`rounded-full h-14 w-14 shadow-lg ${
            hasCheckedInToday 
              ? 'bg-success hover:bg-success/90' 
              : 'bg-primary hover:bg-primary/90 animate-pulse'
          }`}
        >
          {hasCheckedInToday ? (
            <Check className="h-6 w-6" />
          ) : (
            <Sun className="h-6 w-6" />
          )}
        </Button>
        
        {/* Tooltip */}
        <AnimatePresence>
          {!hasCheckedInToday && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="absolute right-16 top-1/2 -translate-y-1/2 bg-popover text-popover-foreground px-3 py-2 rounded-lg shadow-lg whitespace-nowrap text-sm"
            >
              Daily check-in (30s)
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 bg-popover rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      <DailyCheckInDialog open={showDialog} onOpenChange={setShowDialog} />
    </>
  );
};
