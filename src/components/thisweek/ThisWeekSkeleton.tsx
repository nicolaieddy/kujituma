import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WeeklyObjectivesSkeleton } from "@/components/goals/WeeklyObjectivesSkeleton";

export const ThisWeekSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Week Header Skeleton */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-8 w-8 rounded" />
              <div>
                <Skeleton className="h-6 w-24 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Objectives Skeleton */}
      <WeeklyObjectivesSkeleton />

      {/* Weekly Reflection Skeleton */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Weekly Reflection</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full rounded" />
        </CardContent>
      </Card>

      {/* Share Week Skeleton */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <Skeleton className="h-6 w-48 mx-auto" />
            <Skeleton className="h-10 w-32 mx-auto rounded" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};