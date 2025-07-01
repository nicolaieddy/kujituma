import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { User, Send } from "lucide-react";
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
  const [commentData, setCommentData] = useState({
    name: userName,
    message: ""
  });
  const [commentErrors, setCommentErrors] = useState<{ [key: string]: string }>({});

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
          <Separator className="bg-white/20 my-1" />
          <div className="space-y-1">
            {post.comments.map((comment) => (
              <div key={comment.id} className="bg-white/5 rounded-lg p-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1">
                    <Avatar className="h-3 w-3">
                      <AvatarImage src={comment.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                        <User className="h-1 w-1" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-white font-medium text-xs">{comment.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCommentLike(comment.id)}
                      className={`text-xs h-4 px-1 ${comment.user_liked ? 'text-orange-400 hover:bg-orange-500/20' : 'text-white/60 hover:bg-white/20'}`}
                    >
                      🚀 {comment.likes || 0}
                    </Button>
                    <span className="text-white/60 text-xs">
                      {formatTimeAgo(comment.timestamp)}
                    </span>
                  </div>
                </div>
                <p className="text-white/80 whitespace-pre-wrap text-xs ml-4">{comment.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comment Form */}
      {showCommentForm && isAuthenticated && (
        <div>
          {post.comments.length > 0 || <Separator className="bg-white/20 my-1" />}
          <form onSubmit={handleCommentSubmit} className="space-y-1">
            <Input
              placeholder="Your name"
              value={commentData.name}
              onChange={(e) => handleCommentChange("name", e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/60 h-6 text-xs"
              readOnly={!!userName}
            />
            {commentErrors.name && (
              <p className="text-red-400 text-xs">{commentErrors.name}</p>
            )}
            
            <Textarea
              placeholder="Write a supportive comment..."
              value={commentData.message}
              onChange={(e) => handleCommentChange("message", e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/60 text-xs min-h-[40px]"
            />
            {commentErrors.message && (
              <p className="text-red-400 text-xs">{commentErrors.message}</p>
            )}
            
            <div className="flex space-x-1">
              <Button
                type="submit"
                size="sm"
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 h-5 text-xs"
              >
                <Send className="h-2 w-2 mr-1" />
                Send
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCloseCommentForm}
                className="text-white/80 hover:bg-white/20 h-5 text-xs"
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