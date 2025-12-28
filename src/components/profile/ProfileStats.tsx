import { Target, Flame, Share2 } from "lucide-react";
import { useProfileStats } from "@/hooks/useProfileStats";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfileStatsProps {
  userId: string;
}

export const ProfileStats = ({ userId }: ProfileStatsProps) => {
  const { data: stats, isLoading } = useProfileStats(userId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="text-center p-3 rounded-lg bg-muted/50">
            <Skeleton className="h-6 w-8 mx-auto mb-1" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </div>
        ))}
      </div>
    );
  }

  const statItems = [
    {
      icon: Target,
      value: stats?.goalsCompleted || 0,
      label: "Goals Done",
      color: "text-primary"
    },
    {
      icon: Flame,
      value: stats?.currentStreak || 0,
      label: "Week Streak",
      color: "text-orange-500"
    },
    {
      icon: Share2,
      value: stats?.weeksShared || 0,
      label: "Weeks Shared",
      color: "text-blue-500"
    }
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {statItems.map((stat) => (
        <div
          key={stat.label}
          className="text-center p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
        >
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
            <span className="text-xl font-bold text-foreground">{stat.value}</span>
          </div>
          <p className="text-xs text-muted-foreground">{stat.label}</p>
        </div>
      ))}
    </div>
  );
};
