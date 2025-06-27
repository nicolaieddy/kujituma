
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, User, Send } from "lucide-react";
import { ProgressPostType } from "@/types/progress";
import { formatTimeAgo } from "@/utils/timeUtils";

interface ProgressPostProps {
  post: ProgressPostType;
  onAddComment: (commentData: { name: string; message: string }) => void;
}

const ProgressPost = ({ post, onAddComment }: ProgressPostProps) => {
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentData, setCommentData] = useState({
    name: "",
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
      setCommentData({ name: "", message: "" });
      setShowCommentForm(false);
    }
  };

  const handleCommentChange = (field: string, value: string) => {
    setCommentData(prev => ({ ...prev, [field]: value }));
    if (commentErrors[field]) {
      setCommentErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <Card className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-full w-10 h-10 flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">{post.name}</h3>
              <p className="text-white/60 text-sm">
                {formatTimeAgo(post.timestamp)}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCommentForm(!showCommentForm)}
            className="text-white/80 hover:bg-white/20"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            {post.comments.length > 0 ? `${post.comments.length} Comments` : 'Comment'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Accomplishments */}
        {post.accomplishments && (
          <div>
            <h4 className="text-white font-medium mb-2 flex items-center">
              🎉 Accomplishments
            </h4>
            <p className="text-white/80 whitespace-pre-wrap">{post.accomplishments}</p>
          </div>
        )}

        {/* Priorities */}
        {post.priorities && (
          <div>
            <h4 className="text-white font-medium mb-2 flex items-center">
              🎯 Priorities
            </h4>
            <p className="text-white/80 whitespace-pre-wrap">{post.priorities}</p>
          </div>
        )}

        {/* Help Needed */}
        {post.help && (
          <div>
            <h4 className="text-white font-medium mb-2 flex items-center">
              🤝 Help Needed
            </h4>
            <p className="text-white/80 whitespace-pre-wrap">{post.help}</p>
          </div>
        )}

        {/* Comments Section */}
        {post.comments.length > 0 && (
          <div>
            <Separator className="bg-white/20 my-4" />
            <div className="space-y-4">
              {post.comments.map((comment) => (
                <div key={comment.id} className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{comment.name}</span>
                    <span className="text-white/60 text-sm">
                      {formatTimeAgo(comment.timestamp)}
                    </span>
                  </div>
                  <p className="text-white/80 whitespace-pre-wrap">{comment.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comment Form */}
        {showCommentForm && (
          <div>
            {post.comments.length > 0 || <Separator className="bg-white/20 my-4" />}
            <form onSubmit={handleCommentSubmit} className="space-y-4">
              <Input
                placeholder="Your name"
                value={commentData.name}
                onChange={(e) => handleCommentChange("name", e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
              />
              {commentErrors.name && (
                <p className="text-red-400 text-sm">{commentErrors.name}</p>
              )}
              
              <Textarea
                placeholder="Write a supportive comment..."
                value={commentData.message}
                onChange={(e) => handleCommentChange("message", e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
              />
              {commentErrors.message && (
                <p className="text-red-400 text-sm">{commentErrors.message}</p>
              )}
              
              <div className="flex space-x-2">
                <Button
                  type="submit"
                  size="sm"
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCommentForm(false)}
                  className="text-white/80 hover:bg-white/20"
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
