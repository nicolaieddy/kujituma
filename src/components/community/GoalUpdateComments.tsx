import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import { GoalUpdatesService } from '@/services/goalUpdatesService';
import { GoalUpdateComment } from '@/types/goalUpdates';

interface GoalUpdateCommentsProps {
  updateId: string;
  onAddComment: (message: string) => Promise<void>;
}

export const GoalUpdateComments = ({ updateId, onAddComment }: GoalUpdateCommentsProps) => {
  const navigate = useNavigate();
  const [comments, setComments] = useState<GoalUpdateComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const data = await GoalUpdatesService.getComments(updateId);
        setComments(data);
      } catch (error) {
        console.error('Error fetching comments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [updateId]);

  const handleSubmit = async () => {
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      await onAddComment(newComment.trim());
      // Refetch comments
      const data = await GoalUpdatesService.getComments(updateId);
      setComments(data);
      setNewComment('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProfileClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      {/* Comment input */}
      <div className="flex gap-2 mb-4">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="min-h-[60px] resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={!newComment.trim() || submitting}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Comments list */}
      {loading ? (
        <div className="text-center py-4">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">
          No comments yet. Be the first to comment!
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2">
              <Avatar 
                className="h-8 w-8 cursor-pointer shrink-0"
                onClick={() => comment.user?.id && handleProfileClick(comment.user.id)}
              >
                <AvatarImage src={comment.user?.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-muted">
                  {comment.user?.full_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span 
                    className="font-medium text-sm cursor-pointer hover:underline"
                    onClick={() => comment.user?.id && handleProfileClick(comment.user.id)}
                  >
                    {comment.user?.full_name || 'Someone'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">
                  {comment.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
