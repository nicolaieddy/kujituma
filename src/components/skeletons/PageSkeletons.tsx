import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const GoalsSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="text-center space-y-4">
        <Skeleton className="h-10 w-64 mx-auto" />
        <Skeleton className="h-5 w-96 mx-auto" />
      </div>

      {/* Tabs skeleton */}
      <div className="max-w-6xl mx-auto">
        <div className="flex gap-2 bg-muted p-1 rounded-lg mb-6">
          <Skeleton className="h-10 flex-1 rounded-md" />
          <Skeleton className="h-10 flex-1 rounded-md" />
        </div>

        {/* Content skeleton - cards */}
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <GoalCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
};

export const GoalCardSkeleton = () => {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="flex items-center gap-2 pt-2">
            <Skeleton className="h-2 flex-1 rounded-full" />
            <Skeleton className="h-4 w-8" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const HabitsViewSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Habit cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-8 w-16 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export const ProfileSkeleton = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Main profile card with cover photo */}
      <Card className="border-border overflow-hidden">
        {/* Cover photo skeleton */}
        <Skeleton className="h-32 sm:h-40 w-full rounded-none" />
        
        {/* Profile header - overlapping avatar */}
        <div className="px-6 sm:px-8 pb-6 -mt-16 relative z-10">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar */}
            <Skeleton className="h-28 w-28 rounded-full border-4 border-background" />
            
            <div className="flex-1 text-center sm:text-left space-y-3">
              {/* Name */}
              <Skeleton className="h-8 w-48 mx-auto sm:mx-0" />
              
              {/* Social links */}
              <div className="flex justify-center sm:justify-start gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-9 rounded-full" />
                ))}
              </div>
            </div>

            {/* Action button */}
            <Skeleton className="h-10 w-28 rounded-md" />
          </div>
          
          {/* Profile stats */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="text-center p-3 rounded-lg bg-accent/30">
                <Skeleton className="h-6 w-8 mx-auto mb-1" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </div>
            ))}
          </div>
        </div>

        <CardContent className="p-6 sm:p-8 pt-0 space-y-6">
          {/* About section */}
          <div className="space-y-3">
            <Skeleton className="h-5 w-20" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </div>

          {/* Member info */}
          <div className="flex flex-wrap gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
          </div>
        </CardContent>
      </Card>

      {/* Goals section */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-lg bg-accent/30">
              <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-2 pt-1">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export const FriendsSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Search bar */}
      <Skeleton className="h-10 w-full rounded-lg" />

      {/* Friends grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-8 w-20 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export const FeedSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
      <Skeleton className="h-4 w-64 -mt-4 ml-12" />

      {/* Feed posts */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <FeedPostSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};

export const FeedPostSkeleton = () => {
  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Week info */}
        <Skeleton className="h-5 w-40" />
        
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>

        {/* Objectives */}
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-2 border-t border-border">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
      </CardContent>
    </Card>
  );
};

export const AnalyticsSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart skeleton */}
      <Card className="border-border">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-64">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton
                key={i}
                className="flex-1 rounded-t"
                style={{ height: `${Math.random() * 60 + 40}%` }}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Heatmap skeleton */}
      <Card className="border-border">
        <CardHeader>
          <Skeleton className="h-6 w-36" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-sm" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
