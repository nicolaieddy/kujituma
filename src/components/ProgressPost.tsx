
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, User, Send, Clock, History } from "lucide-react";
import { ProgressPostType } from "@/types/progress";
import { formatTimeAgo } from "@/utils/timeUtils";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProgressPostProps {
  post: ProgressPostType;
  onAddComment: (commentData: { name: string; message: string }) => void;
  onViewUserPosts: (userId: string) => void;
  isAuthenticated?: boolean;
}

const ProgressPost = ({ post, onAddComment, onViewUserPosts, isAuthenticated = false }: ProgressPostProps) => {
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

  const handleViewUserHistory = () => {
    onViewUserPosts(post.user_id || post.id);
  };

  return (
    <Card className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all duration-300">
      <CardHeader className="pb-2 px-4 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={post.avatar_url} />
              <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs">
                <User className="h-3 w-3" />
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-white font-semibold text-sm">{post.name}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleViewUserHistory}
                  className="text-white/60 hover:bg-white/20 text-xs h-5 px-1"
                >
                  <History className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex items-center space-x-1 text-white/60 text-xs">
                <Clock className="h-3 w-3" />
                <span>{formatTimeAgo(post.timestamp)}</span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCommentClick}
            className="text-white/80 hover:bg-white/20 text-xs h-6 px-2"
          >
            <MessageCircle className="h-3 w-3 mr-1" />
            {post.comments.length > 0 ? `${post.comments.length}` : 'Comment'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2 pt-0 px-4 pb-3">
        {/* Accomplishments */}
        {post.accomplishments && (
          <div>
            <h4 className="text-white font-medium mb-1 flex items-center text-xs">
              🎉 Accomplishments
            </h4>
            <p className="text-white/80 whitespace-pre-wrap text-xs leading-relaxed">{post.accomplishments}</p>
          </div>
        )}

        {post.priorities && (
          <div>
            <h4 className="text-white font-medium mb-1 flex items-center text-xs">
              🎯 Priorities
            </h4>
            <p className="text-white/80 whitespace-pre-wrap text-xs leading-relaxed">{post.priorities}</p>
          </div>
        )}

        {post.help && (
          <div>
            <h4 className="text-white font-medium mb-1 flex items-center text-xs">
              🤝 Help Needed
            </h4>
            <p className="text-white/80 whitespace-pre-wrap text-xs leading-relaxed">{post.help}</p>
          </div>
        )}

        {/* Comments Section */}
        {post.comments.length > 0 && (
          <div>
            <Separator className="bg-white/20 my-2" />
            <div className="space-y-2">
              {post.comments.map((comment) => (
                <div key={comment.id} className="bg-white/5 rounded-lg p-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={comment.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                          <User className="h-2 w-2" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-white font-medium text-xs">{comment.name}</span>
                    </div>
                    <span className="text-white/60 text-xs">
                      {formatTimeAgo(comment.timestamp)}
                    </span>
                  </div>
                  <p className="text-white/80 whitespace-pre-wrap text-xs ml-6">{comment.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comment Form */}
        {showCommentForm && isAuthenticated && (
          <div>
            {post.comments.length > 0 || <Separator className="bg-white/20 my-2" />}
            <form onSubmit={handleCommentSubmit} className="space-y-2">
              <Input
                placeholder="Your name"
                value={commentData.name}
                onChange={(e) => handleCommentChange("name", e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60 h-7 text-xs"
                readOnly={!!user}
              />
              {commentErrors.name && (
                <p className="text-red-400 text-xs">{commentErrors.name}</p>
              )}
              
              <Textarea
                placeholder="Write a supportive comment..."
                value={commentData.message}
                onChange={(e) => handleCommentChange("message", e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60 text-xs min-h-[50px]"
              />
              {commentErrors.message && (
                <p className="text-red-400 text-xs">{commentErrors.message}</p>
              )}
              
              <div className="flex space-x-2">
                <Button
                  type="submit"
                  size="sm"
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 h-6 text-xs"
                >
                  <Send className="h-3 w-3 mr-1" />
                  Send
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCommentForm(false)}
                  className="text-white/80 hover:bg-white/20 h-6 text-xs"
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
