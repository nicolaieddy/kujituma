
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
  onTogglePostLike: (postId: string) => void;
  onToggleCommentLike: (commentId: string) => void;
  isAuthenticated?: boolean;
}

const ProgressPost = ({ 
  post, 
  onAddComment, 
  onViewUserPosts, 
  onTogglePostLike,
  onToggleCommentLike,
  isAuthenticated = false 
}: ProgressPostProps) => {
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

  const handlePostLike = () => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    onTogglePostLike(post.id);
  };

  const handleCommentLike = (commentId: string) => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    onToggleCommentLike(commentId);
  };

  return (
    <Card className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all duration-300">
      <CardHeader className="pb-1 px-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src={post.avatar_url} />
              <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs">
                <User className="h-2 w-2" />
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center space-x-1">
                <h3 className="text-white font-semibold text-xs">{post.name}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleViewUserHistory}
                  className="text-white/60 hover:bg-white/20 text-xs h-4 px-1"
                >
                  <History className="h-2 w-2" />
                </Button>
              </div>
              <div className="flex items-center space-x-1 text-white/60 text-xs">
                <Clock className="h-2 w-2" />
                <span>{formatTimeAgo(post.timestamp)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePostLike}
              className={`text-xs h-5 px-1 ${post.user_liked ? 'text-orange-400 hover:bg-orange-500/20' : 'text-white/80 hover:bg-white/20'}`}
            >
              🚀 {post.likes || 0}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCommentClick}
              className="text-white/80 hover:bg-white/20 text-xs h-5 px-1"
            >
              <MessageCircle className="h-2 w-2 mr-1" />
              {post.comments.length > 0 ? `${post.comments.length}` : ''}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-1 pt-0 px-3 pb-2">
        {/* Accomplishments */}
        {post.accomplishments && (
          <div>
            <h4 className="text-white font-medium mb-1 flex items-center text-xs">
              🎉 Wins
            </h4>
            <p className="text-white/80 whitespace-pre-wrap text-xs leading-relaxed">{post.accomplishments}</p>
          </div>
        )}

        {post.priorities && (
          <div>
            <h4 className="text-white font-medium mb-1 flex items-center text-xs">
              🎯 Focus
            </h4>
            <p className="text-white/80 whitespace-pre-wrap text-xs leading-relaxed">{post.priorities}</p>
          </div>
        )}

        {post.help && (
          <div>
            <h4 className="text-white font-medium mb-1 flex items-center text-xs">
              🤝 Help
            </h4>
            <p className="text-white/80 whitespace-pre-wrap text-xs leading-relaxed">{post.help}</p>
          </div>
        )}

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
                        onClick={() => handleCommentLike(comment.id)}
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
                readOnly={!!user}
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
                  onClick={() => setShowCommentForm(false)}
                  className="text-white/80 hover:bg-white/20 h-5 text-xs"
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
