import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { User, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProgressPostType } from "@/types/progress";
import { formatTimeAgo } from "@/utils/timeUtils";

interface ProgressPostCommentsProps {
  post: ProgressPostType;
  showCommentForm: boolean;
  isAuthenticated: boolean;
  userName: string;
  onAddComment: (commentData: { name: string; message: string }) => void;
  onCommentLike: (commentId: string) => void;
  onCloseCommentForm: () => void;
}

export const ProgressPostComments = ({
  post,
  showCommentForm,
  isAuthenticated,
  userName,
  onAddComment,
  onCommentLike,
  onCloseCommentForm
}: ProgressPostCommentsProps) => {
  const navigate = useNavigate();
  const [commentData, setCommentData] = useState({
    name: userName,
    message: ""
  });
  const [commentErrors, setCommentErrors] = useState<{ [key: string]: string }>({});

  const handleProfileClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: { [key: string]: string } = {};
    if (!commentData.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!commentData.message.trim()) {
      newErrors.message = "Message is required";
    }
    
    setCommentErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      onAddComment(commentData);
      setCommentData({ 
        name: userName, 
        message: "" 
      });
    }
  };

  const handleCommentChange = (field: string, value: string) => {
    setCommentData(prev => ({ ...prev, [field]: value }));
    if (commentErrors[field]) {
      setCommentErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <>
      {/* Comments Section */}
      {post.comments.length > 0 && (
        <div>
          <Separator className="bg-border my-1" />
          <div className="space-y-1">
            {post.comments.map((comment) => (
              <div key={comment.id} className="bg-accent rounded-lg p-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1">
                    <Avatar className="h-3 w-3">
                      <AvatarImage src={comment.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <User className="h-1 w-1" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-foreground font-medium text-xs">{comment.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCommentLike(comment.id)}
                      className={`text-xs h-4 px-1 ${comment.user_liked ? 'text-orange-400 hover:bg-orange-500/20' : 'text-muted-foreground hover:bg-accent'}`}
                    >
                      🚀 {comment.likes || 0}
                    </Button>
                    <span className="text-muted-foreground text-xs">
                      {formatTimeAgo(comment.timestamp)}
                    </span>
                  </div>
                </div>
                <p className="text-foreground/80 whitespace-pre-wrap text-xs ml-4">{comment.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comment Form */}
      {showCommentForm && isAuthenticated && (
        <div>
          {post.comments.length > 0 || <Separator className="bg-border my-1" />}
          <form onSubmit={handleCommentSubmit} className="space-y-1">
            <Input
              placeholder="Your name"
              value={commentData.name}
              onChange={(e) => handleCommentChange("name", e.target.value)}
              className="h-6 text-xs"
              readOnly={!!userName}
            />
            {commentErrors.name && (
              <p className="text-red-400 text-xs">{commentErrors.name}</p>
            )}
            
            <Textarea
              placeholder="Write a supportive comment..."
              value={commentData.message}
              onChange={(e) => handleCommentChange("message", e.target.value)}
              className="text-xs min-h-[40px]"
            />
            {commentErrors.message && (
              <p className="text-red-400 text-xs">{commentErrors.message}</p>
            )}
            
            <div className="flex space-x-1">
              <Button
                type="submit"
                size="sm"
                className="h-5 text-xs"
              >
                <Send className="h-2 w-2 mr-1" />
                Send
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCloseCommentForm}
                className="h-5 text-xs"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};