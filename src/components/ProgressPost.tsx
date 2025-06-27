
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, User, Send } from "lucide-react";
import { ProgressPostType } from "@/types/progress";
import { formatTimeAgo } from "@/utils/timeUtils";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProgressPostProps {
  post: ProgressPostType;
  onAddComment: (commentData: { name: string; message: string }) => void;
  isAuthenticated?: boolean;
}

const ProgressPost = ({ post, onAddComment, isAuthenticated = false }: ProgressPostProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentData, setCommentData] = useState({
    name: "",
    message: ""
  });
  const [commentErrors, setCommentErrors] = useState<{ [key: string]: string }>({});

  // Auto-populate name from authenticated user when comment form is shown
  useEffect(() => {
    if (showCommentForm && user) {
      const userName = user.user_metadata?.full_name || user.email || "";
      setCommentData(prev => ({ ...prev, name: userName }));
    }
  }, [showCommentForm, user]);

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    
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
        name: user?.user_metadata?.full_name || user?.email || "", 
        message: "" 
      });
      setShowCommentForm(false);
    }
  };

  const handleCommentChange = (field: string, value: string) => {
    setCommentData(prev => ({ ...prev, [field]: value }));
    if (commentErrors[field]) {
      setCommentErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleCommentClick = () => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    setShowCommentForm(!showCommentForm);
  };

  return (
    <Card className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-full w-8 h-8 flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-base">{post.name}</h3>
              <p className="text-white/60 text-xs">
                {formatTimeAgo(post.timestamp)}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCommentClick}
            className="text-white/80 hover:bg-white/20 text-xs h-7 px-2"
          >
            <MessageCircle className="h-3 w-3 mr-1" />
            {post.comments.length > 0 ? `${post.comments.length}` : 'Comment'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 pt-0">
        {/* Accomplishments */}
        {post.accomplishments && (
          <div>
            <h4 className="text-white font-medium mb-1 flex items-center text-sm">
              🎉 Accomplishments
            </h4>
            <p className="text-white/80 whitespace-pre-wrap text-sm">{post.accomplishments}</p>
          </div>
        )}

        {post.priorities && (
          <div>
            <h4 className="text-white font-medium mb-1 flex items-center text-sm">
              🎯 Priorities
            </h4>
            <p className="text-white/80 whitespace-pre-wrap text-sm">{post.priorities}</p>
          </div>
        )}

        {post.help && (
          <div>
            <h4 className="text-white font-medium mb-1 flex items-center text-sm">
              🤝 Help Needed
            </h4>
            <p className="text-white/80 whitespace-pre-wrap text-sm">{post.help}</p>
          </div>
        )}

        {/* Comments Section */}
        {post.comments.length > 0 && (
          <div>
            <Separator className="bg-white/20 my-2" />
            <div className="space-y-2">
              {post.comments.map((comment) => (
                <div key={comment.id} className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-medium text-sm">{comment.name}</span>
                    <span className="text-white/60 text-xs">
                      {formatTimeAgo(comment.timestamp)}
                    </span>
                  </div>
                  <p className="text-white/80 whitespace-pre-wrap text-sm">{comment.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comment Form */}
        {showCommentForm && isAuthenticated && (
          <div>
            {post.comments.length > 0 || <Separator className="bg-white/20 my-2" />}
            <form onSubmit={handleCommentSubmit} className="space-y-3">
              <Input
                placeholder="Your name"
                value={commentData.name}
                onChange={(e) => handleCommentChange("name", e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60 h-8 text-sm"
                readOnly={!!user}
              />
              {commentErrors.name && (
                <p className="text-red-400 text-xs">{commentErrors.name}</p>
              )}
              
              <Textarea
                placeholder="Write a supportive comment..."
                value={commentData.message}
                onChange={(e) => handleCommentChange("message", e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60 text-sm min-h-[60px]"
              />
              {commentErrors.message && (
                <p className="text-red-400 text-xs">{commentErrors.message}</p>
              )}
              
              <div className="flex space-x-2">
                <Button
                  type="submit"
                  size="sm"
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 h-7 text-xs"
                >
                  <Send className="h-3 w-3 mr-1" />
                  Send
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCommentForm(false)}
                  className="text-white/80 hover:bg-white/20 h-7 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProgressPost;
