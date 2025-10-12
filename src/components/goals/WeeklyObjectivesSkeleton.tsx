import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const WeeklyObjectivesSkeleton = () => {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-foreground">This Week's Focus</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-24 rounded" />
        </div>
        
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-6 w-16 rounded" />
            </div>
          ))}
        </div>
        
        <div className="pt-4 border-t border-border">
          <Skeleton className="h-10 w-full rounded" />
        </div>
      </CardContent>
    </Card>
  );
};