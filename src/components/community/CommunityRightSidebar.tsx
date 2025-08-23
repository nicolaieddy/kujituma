import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CommunityRightSidebar() {
  return (
    <div className="w-80 space-y-6 p-4">
      {/* Community Features Coming Soon */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Community Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="py-8">
            <p className="text-sm text-muted-foreground mb-4">
              Community features like leaderboards, trending topics, and friend suggestions are coming soon!
            </p>
            <p className="text-xs text-muted-foreground">
              These will be populated with real user data once more community members join.
            </p>
          </div>
          <Button variant="outline" size="sm" className="w-full" disabled>
            Coming Soon
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}