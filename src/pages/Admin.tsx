import { lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminData } from "@/hooks/useAdminData";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { OfflineFallback } from "@/components/pwa/OfflineFallback";

// Lazy load admin components for code splitting
const PostsManagement = lazy(() => import("@/components/admin/PostsManagement"));
const UsersOverview = lazy(() => import("@/components/admin/UsersOverview"));
const UserAnalytics = lazy(() => import("@/components/admin/UserAnalytics"));
const PostAnalytics = lazy(() => import("@/components/admin/PostAnalytics"));

// Loading skeleton for admin tabs
// Loading skeleton for admin tabs content
const AdminTabSkeleton = () => (
  <div className="space-y-6">
    {/* Analytics cards skeleton */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-20 mt-1" />
          </CardContent>
        </Card>
      ))}
    </div>
    {/* Table skeleton */}
    <Card className="border-border">
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Table header */}
        <div className="flex items-center gap-4 pb-2 border-b border-border">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        {/* Table rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-2">
            <div className="flex items-center gap-2 w-32">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-6 w-16 rounded" />
          </div>
        ))}
      </CardContent>
    </Card>
  </div>
);

// Full page loading skeleton for admin panel
const AdminPageSkeleton = () => (
  <div className="min-h-screen bg-background">
    {/* Header skeleton */}
    <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
    
    <div className="container mx-auto px-4 py-6">
      {/* Title skeleton */}
      <div className="text-center mb-8">
        <Skeleton className="h-9 w-64 mx-auto mb-4" />
        <Skeleton className="h-5 w-80 mx-auto" />
      </div>

      {/* Tabs skeleton */}
      <div className="w-full">
        <div className="grid w-full grid-cols-2 bg-muted rounded-lg p-1 mb-6">
          <Skeleton className="h-9 rounded-md" />
          <Skeleton className="h-9 rounded-md" />
        </div>

        {/* Tab content skeleton */}
        <AdminTabSkeleton />
      </div>
    </div>
  </div>
);

const Admin = () => {
  const { isOffline } = useOfflineStatus();
  const {
    posts,
    users,
    analytics,
    loading,
    isAdmin,
    togglePostVisibility,
    deletePost,
    refreshMonthlyData,
    handleUserDeleted
  } = useAdminData();

  if (loading) {
    return <AdminPageSkeleton />;
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-foreground">Access denied. Admin privileges required.</div>
      </div>
    );
  }

  if (isOffline) {
    return (
      <OfflineFallback 
        title="Admin panel unavailable offline"
        description="The admin dashboard requires an internet connection to manage posts and users."
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Admin Dashboard</h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            Manage posts, users, and platform analytics.
          </p>
        </div>

        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted">
            <TabsTrigger value="posts">
              Posts Management
            </TabsTrigger>
            <TabsTrigger value="users">
              Users Overview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-6 space-y-6">
            <Suspense fallback={<AdminTabSkeleton />}>
              <PostAnalytics
                totalPosts={analytics.totalPosts}
                totalComments={analytics.totalComments}
                postsThisWeek={analytics.postsThisWeek}
                commentsThisWeek={analytics.commentsThisWeek}
              />
              <PostsManagement
                posts={posts}
                onToggleVisibility={togglePostVisibility}
                onDeletePost={deletePost}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="users" className="mt-6 space-y-6">
            <Suspense fallback={<AdminTabSkeleton />}>
              <UserAnalytics
                totalUsers={analytics.totalUsers}
                newUsersThisWeek={analytics.newUsersThisWeek}
                activeUsersThisWeek={analytics.activeUsersThisWeek}
                averagePostsPerUser={analytics.averagePostsPerUser}
                monthlyData={analytics.monthlyData}
                onMonthRangeChange={refreshMonthlyData}
              />
              <UsersOverview users={users} onUserDeleted={handleUserDeleted} />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
  );
};

export default Admin;
