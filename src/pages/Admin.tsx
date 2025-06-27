
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminHeader from "@/components/admin/AdminHeader";
import PostsManagement from "@/components/admin/PostsManagement";
import UsersOverview from "@/components/admin/UsersOverview";
import { useAdminData } from "@/hooks/useAdminData";

const Admin = () => {
  const {
    posts,
    users,
    loading,
    isAdmin,
    togglePostVisibility,
    deletePost
  } = useAdminData();

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
      <AdminHeader />

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/10 backdrop-blur-lg">
            <TabsTrigger value="posts" className="text-white data-[state=active]:bg-white/20">
              Posts Management
            </TabsTrigger>
            <TabsTrigger value="users" className="text-white data-[state=active]:bg-white/20">
              Users Overview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-6">
            <PostsManagement
              posts={posts}
              onToggleVisibility={togglePostVisibility}
              onDeletePost={deletePost}
            />
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <UsersOverview users={users} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
