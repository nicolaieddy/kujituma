import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Trophy, TrendingUp, Users, Target, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CommunityStats {
  weeklyActive: number;
  totalGoals: number;
  completionRate: number;
}

interface TopPerformer {
  id: string;
  name: string;
  avatar?: string;
  completionRate: number;
  streak: number;
}

interface TrendingTopic {
  id: string;
  title: string;
  count: number;
  category: string;
}

// Mock data - in real app, this would come from props or hooks
const mockStats: CommunityStats = {
  weeklyActive: 847,
  totalGoals: 1234,
  completionRate: 73
};

const mockTopPerformers: TopPerformer[] = [
  { id: "1", name: "Sarah Chen", completionRate: 95, streak: 12 },
  { id: "2", name: "Alex Rodriguez", completionRate: 92, streak: 8 },
  { id: "3", name: "Maya Patel", completionRate: 88, streak: 15 }
];

const mockTrendingTopics: TrendingTopic[] = [
  { id: "1", title: "Morning Routine", count: 23, category: "Habits" },
  { id: "2", title: "Fitness Goals", count: 18, category: "Health" },
  { id: "3", title: "Learning Spanish", count: 15, category: "Education" }
];

const mockSuggestedConnections = [
  { id: "1", name: "Jordan Kim", mutualFriends: 3 },
  { id: "2", name: "Emma Wilson", mutualFriends: 5 },
];

export function CommunityRightSidebar() {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="w-80 space-y-6 p-4">
      {/* Community Stats */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Community Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Active this week</span>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {mockStats.weeklyActive}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total goals</span>
            </div>
            <Badge variant="secondary" className="bg-secondary/10 text-secondary">
              {mockStats.totalGoals}
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Completion rate</span>
              <span className="text-sm font-medium">{mockStats.completionRate}%</span>
            </div>
            <Progress value={mockStats.completionRate} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Performers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {mockTopPerformers.map((performer, index) => (
            <div key={performer.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-2">
                <Badge variant={index === 0 ? "default" : "secondary"} className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                  {index + 1}
                </Badge>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={performer.avatar} />
                  <AvatarFallback className="text-xs bg-gradient-primary text-primary-foreground">
                    {getInitials(performer.name)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{performer.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{performer.completionRate}% complete</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {performer.streak}d streak
                  </span>
                </div>
              </div>
            </div>
          ))}
          <Button variant="ghost" size="sm" className="w-full text-primary hover:text-primary-foreground hover:bg-primary">
            View Leaderboard
          </Button>
        </CardContent>
      </Card>

      {/* Trending Topics */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Trending Topics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {mockTrendingTopics.map((topic) => (
            <div key={topic.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
              <div>
                <p className="text-sm font-medium">{topic.title}</p>
                <p className="text-xs text-muted-foreground">{topic.category}</p>
              </div>
              <Badge variant="outline" className="text-xs">
                {topic.count} posts
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Suggested Connections */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Suggested Friends
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {mockSuggestedConnections.map((connection) => (
            <div key={connection.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-gradient-primary text-primary-foreground">
                    {getInitials(connection.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{connection.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {connection.mutualFriends} mutual friends
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
                Connect
              </Button>
            </div>
          ))}
          <Button variant="ghost" size="sm" className="w-full text-primary hover:text-primary-foreground hover:bg-primary">
            Find More Friends
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}