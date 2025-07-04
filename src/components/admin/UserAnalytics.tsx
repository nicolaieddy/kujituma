import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, TrendingUp, BarChart3 } from "lucide-react";

interface UserAnalyticsProps {
  totalUsers: number;
  newUsersThisWeek: number;
  activeUsersThisWeek: number;
  averagePostsPerUser: number;
}

const UserAnalytics = ({
  totalUsers,
  newUsersThisWeek,
  activeUsersThisWeek,
  averagePostsPerUser
}: UserAnalyticsProps) => {
  const metrics = [
    {
      title: "Total Users",
      value: totalUsers,
      icon: Users,
      description: `${newUsersThisWeek} new this week`,
      color: "text-blue-400"
    },
    {
      title: "Active Users",
      value: activeUsersThisWeek,
      icon: Activity,
      description: "Active this week",
      color: "text-orange-400"
    },
    {
      title: "Avg Posts per User",
      value: averagePostsPerUser.toFixed(1),
      icon: BarChart3,
      description: "Overall average",
      color: "text-purple-400"
    },
    {
      title: "User Growth Rate",
      value: totalUsers > 0 ? `${((newUsersThisWeek / totalUsers) * 100).toFixed(1)}%` : "0%",
      icon: TrendingUp,
      description: "This week vs total",
      color: "text-green-400"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title} className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white/80">
                  {metric.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{metric.value}</div>
                <p className="text-xs text-white/60 mt-1">{metric.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default UserAnalytics;