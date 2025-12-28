
import { lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminData } from "@/hooks/useAdminData";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Lazy load admin components for code splitting
const PostsManagement = lazy(() => import("@/components/admin/PostsManagement"));
const UsersOverview = lazy(() => import("@/components/admin/UsersOverview"));
const UserAnalytics = lazy(() => import("@/components/admin/UserAnalytics"));
const PostAnalytics = lazy(() => import("@/components/admin/PostAnalytics"));

// Loading skeleton for admin tabs
const AdminTabSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="border-border">
          <CardContent className="p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
    <Card className="border-border">
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-8 w-20 rounded" />
          </div>
        ))}
      </CardContent>
    </Card>
  </div>
);

const Admin = () => {
  const { signOut } = useAuth();
  const {
    posts,
    users,
    analytics,
    loading,
    isAdmin,
    togglePostVisibility,
    deletePost,
    refreshMonthlyData
  } = useAdminData();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading admin panel...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Access denied. Admin privileges required.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        isAdmin={isAdmin}
        onSignOut={handleSignOut}
      />

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
              <UsersOverview users={users} />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
