import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sun, Check } from "lucide-react";
import { useDailyCheckIn } from "@/hooks/useDailyCheckIn";
import { DailyCheckInDialog } from "./DailyCheckInDialog";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const DailyCheckInButton = () => {
  const [showDialog, setShowDialog] = useState(false);
  const { hasCheckedInToday, isLoading } = useDailyCheckIn();
  
  // Don't render anything while loading to prevent flash
  if (isLoading) return null;
  
  // Removed nested TooltipProvider - using App-level provider to prevent stack overflow on iOS Safari
  return (
    <>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setShowDialog(true)}
              size="lg"
              variant={hasCheckedInToday ? "secondary" : "default"}
              className={`rounded-full h-14 w-14 shadow-lg transition-all duration-300 ${
                hasCheckedInToday 
                  ? 'bg-green-600 hover:bg-green-700 text-white border-0' 
                  : 'animate-pulse'
              }`}
            >
              {hasCheckedInToday ? (
                <Check className="h-6 w-6" />
              ) : (
                <Sun className="h-6 w-6" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="mr-2">
            {hasCheckedInToday ? "View today's check-in" : "Daily check-in (30s)"}
          </TooltipContent>
        </Tooltip>
      </motion.div>
      
      <DailyCheckInDialog open={showDialog} onOpenChange={setShowDialog} />
    </>
  );
};
