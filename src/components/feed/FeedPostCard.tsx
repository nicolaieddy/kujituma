import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FeedService, FeedPost, Comment } from "@/services/feedService";
import { Heart, MessageCircle, Calendar, Target, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface FeedPostCardProps {
  post: FeedPost;
  onUpdate: () => void;
}

export const FeedPostCard = ({ post, onUpdate }: FeedPostCardProps) => {
  const [isCommenting, setIsCommenting] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isLiking, setIsLiking] = useState(false);

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['post-comments', post.id],
    queryFn: () => FeedService.getPostComments(post.id),
  });

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    try {
      await FeedService.togglePostLike(post.id);
      onUpdate();
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;
    try {
      await FeedService.addComment(post.id, newComment.trim());
      setNewComment("");
      setIsCommenting(false);
      refetchComments();
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const formatWeekRange = (weekStart: string, weekEnd: string) => {
    const start = new Date(weekStart);
    const end = new Date(weekEnd);
    const formatOptions: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric'
    };
    return `${start.toLocaleDateString('en-US', formatOptions)} - ${end.toLocaleDateString('en-US', formatOptions)}`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
      <CardHeader>
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.profiles?.avatar_url || undefined} />
            <AvatarFallback className="bg-purple-500 text-white">
              {getInitials(post.profiles?.full_name || post.name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-white font-semibold">{post.profiles?.full_name || post.name}</h3>
              <span className="text-white/60 text-sm">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
            </div>
            
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-white/60" />
              <span className="text-white/80 text-sm">
                Week: {formatWeekRange(post.week_start, post.week_end)}
              </span>
              <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/30">
                {post.completion_percentage}% Complete
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-sm text-white/60 mb-4">
              <div className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                <span>{post.objectives_completed}/{post.total_objectives} objectives</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {post.accomplishments && (
          <div>
            <h4 className="text-white font-medium mb-3">🎉 Weekly Summary</h4>
            <div className="space-y-2">
              {post.accomplishments.split('\n').map((line, index) => {
                if (line.trim() === '') return null;
                
                // Handle section headers
                if (line.includes('✅ Completed Objectives:') || line.includes('❌ Incomplete Objectives:') || line.includes('📝 Weekly Reflections:')) {
                  return (
                    <div key={index} className="text-white font-medium mt-4 mb-2">
                      {line}
                    </div>
                  );
                }
                
                // Handle objective items (starting with •)
                if (line.startsWith('• ')) {
                  const isCompleted = post.accomplishments.indexOf(line) < post.accomplishments.indexOf('❌ Incomplete Objectives:') || 
                                    !post.accomplishments.includes('❌ Incomplete Objectives:');
                  const objectiveText = line.substring(2); // Remove the "• " prefix
                  
                  return (
                    <div key={index} className="flex items-start gap-3 text-white/80">
                      <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                        isCompleted 
                          ? 'bg-green-500 border-green-500' 
                          : 'border-white/40 bg-transparent'
                      }`}>
                        {isCompleted && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className={isCompleted ? 'text-white/90' : 'text-white/60'}>
                        {objectiveText}
                      </span>
                    </div>
                  );
                }
                
                // Handle reflection content
                return (
                  <div key={index} className="text-white/80 ml-2">
                    {line}
                  </div>
                );
              }).filter(Boolean)}
            </div>
          </div>
        )}

        {post.priorities && (
          <div>
            <h4 className="text-white font-medium mb-2">🎯 Next Priorities</h4>
            <div className="space-y-2">
              {post.priorities.split('\n').map((line, index) => {
                if (line.trim() === '' || line.includes('Remaining objectives for next week:')) return null;
                
                if (line.startsWith('• ')) {
                  const objectiveText = line.substring(2);
                  return (
                    <div key={index} className="flex items-start gap-3 text-white/80">
                      <div className="flex-shrink-0 w-5 h-5 rounded border-2 border-white/40 bg-transparent mt-0.5" />
                      <span className="text-white/60">{objectiveText}</span>
                    </div>
                  );
                }
                
                return (
                  <div key={index} className="text-white/80">
                    {line}
                  </div>
                );
              }).filter(Boolean)}
            </div>
          </div>
        )}

        {post.help && (
          <div>
            <h4 className="text-white font-medium mb-2">🤝 Help Needed</h4>
            <div className="text-white/80 whitespace-pre-line">{post.help}</div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-4 border-t border-white/10">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            disabled={isLiking}
            className="text-white/60 hover:text-red-400 hover:bg-white/10"
          >
            <Heart className={`h-4 w-4 mr-2 ${isLiking ? 'animate-pulse' : ''}`} />
            {post.likes || 0}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCommenting(!isCommenting)}
            className="text-white/60 hover:text-blue-400 hover:bg-white/10"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            {comments.length}
          </Button>
        </div>

        {/* Comments */}
        {comments.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-white/10">
            {comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="bg-purple-500 text-white text-xs">
                    {getInitials(comment.profiles?.full_name || comment.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium text-sm">
                        {comment.profiles?.full_name || comment.name}
                      </span>
                      <span className="text-white/40 text-xs">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-white/80 text-sm">{comment.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Comment */}
        {isCommenting && (
          <div className="flex items-center gap-2 pt-4 border-t border-white/10">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/60"
              onKeyPress={(e) => e.key === 'Enter' && handleComment()}
            />
            <Button
              onClick={handleComment}
              disabled={!newComment.trim()}
              size="sm"
              className="bg-blue-500 hover:bg-blue-600"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};