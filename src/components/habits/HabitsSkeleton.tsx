import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const HabitsSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Header with search/filter skeleton */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-10 flex-1 max-w-sm rounded" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-24 rounded" />
              <Skeleton className="h-10 w-10 rounded" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Habits list skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div>
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
                <div className="flex gap-1 mt-3">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <Skeleton key={j} className="h-6 w-6 rounded" />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
