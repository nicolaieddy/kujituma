
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, MessageSquare, Activity } from "lucide-react";

interface AnalyticsMetricsProps {
  totalUsers: number;
  totalPosts: number;
  totalComments: number;
  newUsersThisWeek: number;
  activeUsersThisWeek: number;
  postsThisWeek: number;
  commentsThisWeek: number;
  averagePostsPerUser: number;
}

const AnalyticsMetrics = ({
  totalUsers,
  totalPosts,
  totalComments,
  newUsersThisWeek,
  activeUsersThisWeek,
  postsThisWeek,
  commentsThisWeek,
  averagePostsPerUser
}: AnalyticsMetricsProps) => {
  const metrics = [
    {
      title: "Total Users",
      value: totalUsers,
      icon: Users,
      description: `${newUsersThisWeek} new this week`,
      color: "text-blue-400"
    },
    {
      title: "Total Posts",
      value: totalPosts,
      icon: FileText,
      description: `${postsThisWeek} this week`,
      color: "text-green-400"
    },
    {
      title: "Total Comments",
      value: totalComments,
      icon: MessageSquare,
      description: `${commentsThisWeek} this week`,
      color: "text-purple-400"
    },
    {
      title: "Active Users",
      value: activeUsersThisWeek,
      icon: Activity,
      description: "Active this week",
      color: "text-orange-400"
    }
  ];

  const additionalMetrics = [
    {
      label: "Avg Posts per User",
      value: averagePostsPerUser.toFixed(1)
    },
    {
      label: "Comments per Post",
      value: totalPosts > 0 ? (totalComments / totalPosts).toFixed(1) : "0"
    },
    {
      label: "User Growth Rate",
      value: totalUsers > 0 ? `${((newUsersThisWeek / totalUsers) * 100).toFixed(1)}%` : "0%"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Main Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title} className="border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </CardTitle>
                <Icon className={`h-4 w-4 text-primary`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{metric.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Metrics */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Additional Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {additionalMetrics.map((metric) => (
              <div key={metric.label} className="text-center">
          <div className="text-2xl font-bold text-foreground">{metric.value}</div>
          <div className="text-sm text-muted-foreground">{metric.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsMetrics;
