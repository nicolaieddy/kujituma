
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { useAuth } from "@/contexts/AuthContext";

import PostsManagement from "@/components/admin/PostsManagement";
import UsersOverview from "@/components/admin/UsersOverview";
import UserAnalytics from "@/components/admin/UserAnalytics";
import PostAnalytics from "@/components/admin/PostAnalytics";
import { useAdminData } from "@/hooks/useAdminData";

const Admin = () => {
  const { signOut } = useAuth();
  const {
    posts,
    users,
    analytics,
    loading,
    isAdmin,
    togglePostVisibility,
    deletePost
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading admin panel...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Access denied. Admin privileges required.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <DashboardHeader 
        isAdmin={isAdmin}
        onSignOut={handleSignOut}
      />

      <div className="container mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Admin Dashboard</h1>
          <p className="text-white/80 text-base sm:text-lg max-w-2xl mx-auto">
            Manage posts, users, and platform analytics.
          </p>
        </div>

        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/10 backdrop-blur-lg">
            <TabsTrigger value="posts" className="text-white data-[state=active]:bg-white/20">
              Posts Management
            </TabsTrigger>
            <TabsTrigger value="users" className="text-white data-[state=active]:bg-white/20">
              Users Overview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-6 space-y-6">
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
          </TabsContent>

          <TabsContent value="users" className="mt-6 space-y-6">
            <UserAnalytics
              totalUsers={analytics.totalUsers}
              newUsersThisWeek={analytics.newUsersThisWeek}
              activeUsersThisWeek={analytics.activeUsersThisWeek}
              averagePostsPerUser={analytics.averagePostsPerUser}
            />
            <UsersOverview users={users} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
