import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { DashboardHeader } from "@/components/layout/DashboardHeader";

import { FeedView } from "@/components/feed/FeedView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, User } from "lucide-react";

const Feed = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin } = useAdminStatus();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <DashboardHeader 
        isAdmin={isAdmin}
        onSignOut={handleSignOut}
      />

      <div className="container mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Progress Feed</h1>
          <p className="text-white/80 text-base sm:text-lg max-w-2xl mx-auto">
            Share your weekly progress and celebrate achievements with the community.
          </p>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/10 backdrop-blur-lg border-white/20 mb-6">
            <TabsTrigger value="all" className="flex items-center gap-2 text-white data-[state=active]:bg-white/20">
              <Users className="h-4 w-4" />
              All Posts
            </TabsTrigger>
            <TabsTrigger value="my" className="flex items-center gap-2 text-white data-[state=active]:bg-white/20">
              <User className="h-4 w-4" />
              My Posts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <FeedView feedType="all" />
          </TabsContent>

          <TabsContent value="my">
            <FeedView feedType="my" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Feed;