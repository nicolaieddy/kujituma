
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { User, Clock, X } from "lucide-react";
import { ProgressPostType } from "@/types/progress";
import { formatTimeAgo } from "@/utils/timeUtils";
import { useUnifiedPosts } from "@/hooks/useUnifiedPosts";

interface UserPostsModalProps {
  userId: string;
  onClose: () => void;
}

const UserPostsModal = ({ userId, onClose }: UserPostsModalProps) => {
  const { posts } = useUnifiedPosts();
  const [userPosts, setUserPosts] = useState<ProgressPostType[]>([]);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    // Filter posts by the selected user (in a real app, you'd filter by actual user ID)
    const currentPost = posts.find(post => post.id === userId);
    if (currentPost) {
      const filteredPosts = posts.filter(post => post.name === currentPost.name);
      setUserPosts(filteredPosts);
      setUserName(currentPost.name);
    }
  }, [userId, posts]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto border-border">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <DialogTitle className="text-foreground">
                Posts by {userName}
              </DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {userPosts.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No other posts found for this user.
            </div>
          ) : (
            userPosts.map((post) => (
              <Card key={post.id} className="border-border">
                <CardHeader className="pb-2 px-4 pt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          <User className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-foreground font-semibold text-sm">{post.name}</h3>
                        <div className="flex items-center space-x-1 text-muted-foreground text-xs">
                          <Clock className="h-3 w-3" />
                          <span>{formatTimeAgo(post.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {post.comments.length} comments
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-2 pt-0 px-4 pb-3">
                  {post.accomplishments && (
                    <div>
                      <h4 className="text-foreground font-medium mb-1 flex items-center text-xs">
                        🎉 Accomplishments
                      </h4>
                      <p className="text-muted-foreground whitespace-pre-wrap text-xs leading-relaxed">{post.accomplishments}</p>
                    </div>
                  )}

                  {post.priorities && (
                    <div>
                      <h4 className="text-foreground font-medium mb-1 flex items-center text-xs">
                        🎯 Priorities
                      </h4>
                      <p className="text-muted-foreground whitespace-pre-wrap text-xs leading-relaxed">{post.priorities}</p>
                    </div>
                  )}

                  {post.help && (
                    <div>
                      <h4 className="text-foreground font-medium mb-1 flex items-center text-xs">
                        🤝 Help Needed
                      </h4>
                      <p className="text-muted-foreground whitespace-pre-wrap text-xs leading-relaxed">{post.help}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserPostsModal;
