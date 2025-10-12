import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, MessageSquare, BarChart2 } from "lucide-react";

interface PostAnalyticsProps {
  totalPosts: number;
  totalComments: number;
  postsThisWeek: number;
  commentsThisWeek: number;
}

const PostAnalytics = ({
  totalPosts,
  totalComments,
  postsThisWeek,
  commentsThisWeek
}: PostAnalyticsProps) => {
  const metrics = [
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
      title: "Comments per Post",
      value: totalPosts > 0 ? (totalComments / totalPosts).toFixed(1) : "0",
      icon: BarChart2,
      description: "Engagement ratio",
      color: "text-blue-400"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
    </div>
  );
};

export default PostAnalytics;