import { Flame, Calendar } from "lucide-react";
import { useStreaks } from "@/hooks/useStreaks";
import { motion } from "framer-motion";

interface StreakCounterProps {
  variant?: 'compact' | 'full';
}

export const StreakCounter = ({ variant = 'compact' }: StreakCounterProps) => {
  const { 
    currentDailyStreak, 
    longestDailyStreak, 
    currentWeeklyStreak, 
    longestWeeklyStreak,
    isLoading 
  } = useStreaks();
  
  if (isLoading) return null;
  
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-4">
        {/* Daily Streak */}
        <motion.div 
          className="flex items-center gap-1.5"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            currentDailyStreak > 0 ? 'bg-orange-500/20' : 'bg-muted'
          }`}>
            <Flame className={`h-4 w-4 ${currentDailyStreak > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
          </div>
          <div className="flex flex-col">
            <span className={`text-sm font-bold ${currentDailyStreak > 0 ? 'text-orange-500' : 'text-muted-foreground'}`}>
              {currentDailyStreak}
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight">days</span>
          </div>
        </motion.div>
        
        {/* Weekly Streak */}
        <motion.div 
          className="flex items-center gap-1.5"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            currentWeeklyStreak > 0 ? 'bg-primary/20' : 'bg-muted'
          }`}>
            <Calendar className={`h-4 w-4 ${currentWeeklyStreak > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div className="flex flex-col">
            <span className={`text-sm font-bold ${currentWeeklyStreak > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
              {currentWeeklyStreak}
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight">weeks</span>
          </div>
        </motion.div>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Daily Streak Card */}
      <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 rounded-xl p-4 border border-orange-500/20">
        <div className="flex items-center gap-2 mb-2">
          <Flame className="h-5 w-5 text-orange-500" />
          <span className="text-sm font-medium">Daily Streak</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-orange-500">{currentDailyStreak}</span>
          <span className="text-sm text-muted-foreground">days</span>
        </div>
        {longestDailyStreak > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Best: {longestDailyStreak} days 🏆
          </p>
        )}
      </div>
      
      {/* Weekly Streak Card */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Weekly Streak</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-primary">{currentWeeklyStreak}</span>
          <span className="text-sm text-muted-foreground">weeks</span>
        </div>
        {longestWeeklyStreak > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Best: {longestWeeklyStreak} weeks 🏆
          </p>
        )}
      </div>
    </div>
  );
};
