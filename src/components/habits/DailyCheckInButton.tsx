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
  
  return (
    <>
      <motion.div
        initial={{ scale: 0, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setShowDialog(true)}
              size="lg"
              variant="default"
              className={`rounded-full shadow-glow transition-all duration-300 font-medium ${
                hasCheckedInToday 
                  ? 'h-12 w-12 bg-success hover:bg-success/90 text-success-foreground border-0 shadow-[0_0_20px_-4px_hsl(142,71%,45%,0.5)]'
                  : 'h-12 px-5 gap-2 gradient-primary text-primary-foreground border-0 shadow-[0_4px_24px_-6px_hsl(158,65%,22%,0.5)] hover:shadow-[0_4px_28px_-4px_hsl(158,65%,22%,0.65)] hover:scale-105'
              }`}
            >
              {hasCheckedInToday ? (
                <Check className="h-5 w-5" />
              ) : (
                <>
                  <Sun className="h-4 w-4" />
                  <span className="text-sm">Check in</span>
                </>
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
