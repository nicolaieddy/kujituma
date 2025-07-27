import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { User } from "lucide-react";

interface PostLikersModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
}

interface PostLiker {
  id: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
}

export const PostLikersModal = ({ isOpen, onClose, postId }: PostLikersModalProps) => {
  const [likers, setLikers] = useState<PostLiker[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && postId) {
      fetchLikers();
    }
  }, [isOpen, postId]);

  const fetchLikers = async () => {
    setLoading(true);
    try {
      // First get the user IDs from post_likes
      const { data: likesData, error: likesError } = await supabase
        .from('post_likes')
        .select('user_id, created_at')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (likesError) throw likesError;

      if (!likesData || likesData.length === 0) {
        setLikers([]);
        return;
      }

      // Then get the profile information for these users
      const userIds = likesData.map(like => like.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combine the data
      const likersData = likesData.map(like => {
        const profile = profilesData?.find(p => p.id === like.user_id);
        return {
          id: like.user_id,
          full_name: profile?.full_name || 'Unknown User',
          avatar_url: profile?.avatar_url || null,
          created_at: like.created_at
        };
      });

      setLikers(likersData);
    } catch (error) {
      console.error('Error fetching likers:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {likers.length === 0 ? 'No likes yet' : `${likers.length} ${likers.length === 1 ? 'like' : 'likes'}`}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">Loading...</div>
          ) : likers.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              Be the first to like this post!
            </div>
          ) : (
            likers.map(liker => (
              <div key={liker.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={liker.avatar_url || undefined} alt={liker.full_name} />
                  <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{liker.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(liker.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};