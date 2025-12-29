import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, TrendingUp, Calendar, Lock, Sun, CalendarDays, ClipboardList, MousePointer, ExternalLink } from "lucide-react";
import { useStreaks } from "@/hooks/useStreaks";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface SystemRitual {
  id: string;
  title: string;
  description: string;
  frequency: string;
  icon: React.ComponentType<{ className?: string }>;
  currentStreak: number;
  longestStreak: number;
  color: string;
  onClick?: () => void;
}

interface SystemRitualCardProps {
  ritual: SystemRitual;
}

const SystemRitualCard = ({ ritual }: SystemRitualCardProps) => {
  const getStreakColor = (streak: number) => {
    if (streak >= 12) return "text-orange-500";
    if (streak >= 8) return "text-yellow-500";
    if (streak >= 4) return "text-green-500";
    if (streak >= 1) return "text-emerald-400";
    return "text-muted-foreground";
  };

  const IconComponent = ritual.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
    >
      <Card 
        className="border-border hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer group"
        onClick={ritual.onClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-16">
              <CardTitle className="text-lg font-semibold flex items-center gap-2 group-hover:text-primary transition-colors">
                <div className={cn("p-1.5 rounded-lg", ritual.color)}>
                  <IconComponent className="h-4 w-4" />
                </div>
                {ritual.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {ritual.description}
              </p>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-primary flex items-center gap-1 mt-1">
                <ExternalLink className="h-3 w-3" />
                View Dashboard
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {ritual.frequency}
              </Badge>
              <div className="p-1 bg-muted rounded" title="System ritual - cannot be removed">
                <Lock className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Streak Display */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Flame className={cn("h-5 w-5", getStreakColor(ritual.currentStreak), ritual.currentStreak >= 4 && "animate-pulse")} />
                <span className={cn("font-bold text-lg", getStreakColor(ritual.currentStreak))}>
                  {ritual.currentStreak}
                </span>
                <span className="text-sm text-muted-foreground">
                  {ritual.frequency === "Daily" ? "days" : ritual.frequency === "Weekly" ? "weeks" : "quarters"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">{ritual.longestStreak} best</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const SystemRitualsSection = () => {
  const { 
    currentDailyStreak, 
    longestDailyStreak, 
    currentWeeklyStreak, 
    longestWeeklyStreak,
    currentQuarterlyStreak,
    longestQuarterlyStreak,
    isLoading 
  } = useStreaks();

  const navigate = useNavigate();

  if (isLoading) {
    return null;
  }

  const systemRituals: SystemRitual[] = [
    {
      id: "daily-check-in",
      title: "Daily Check-in",
      description: "Start each day with intention - set your focus, energy, and quick win",
      frequency: "Daily",
      icon: Sun,
      currentStreak: currentDailyStreak,
      longestStreak: longestDailyStreak,
      color: "bg-amber-500/10 text-amber-500",
      onClick: () => navigate('/rituals?tab=daily'),
    },
    {
      id: "weekly-planning",
      title: "Weekly Planning",
      description: "Plan your week every Sunday - reflect and set intentions",
      frequency: "Weekly",
      icon: CalendarDays,
      currentStreak: currentWeeklyStreak,
      longestStreak: longestWeeklyStreak,
      color: "bg-blue-500/10 text-blue-500",
      onClick: () => navigate('/rituals?tab=weekly'),
    },
    {
      id: "quarterly-review",
      title: "Quarterly Review",
      description: "Review your quarter - celebrate wins, learn from challenges",
      frequency: "Quarterly",
      icon: ClipboardList,
      currentStreak: currentQuarterlyStreak,
      longestStreak: longestQuarterlyStreak,
      color: "bg-purple-500/10 text-purple-500",
      onClick: () => navigate('/rituals?tab=quarterly'),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          System Rituals
        </h3>
        <Badge variant="secondary" className="bg-primary/10 text-primary">
          Built-in
        </Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {systemRituals.map((ritual) => (
          <SystemRitualCard key={ritual.id} ritual={ritual} />
        ))}
      </div>
    </div>
  );
};
