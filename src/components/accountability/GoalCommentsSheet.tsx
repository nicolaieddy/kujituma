import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface GoalComment {
  id: string;
  message: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

interface GoalCommentsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  goalTitle: string;
}

export const GoalCommentsSheet = ({ open, onOpenChange, goalId, goalTitle }: GoalCommentsSheetProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['goal-comments', goalId],
    queryFn: async (): Promise<GoalComment[]> => {
      const { data, error } = await supabase
        .from('goal_comments')
        .select('id, message, created_at, user_id')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Fetch profile info for all unique users
      const userIds = [...new Set(data.map((c) => c.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(
        (profilesData || []).map((p) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }])
      );

      return data.map((c) => ({
        ...c,
        profiles: profileMap.get(c.user_id) ?? null,
      }));
    },
    enabled: open && !!goalId,
  });

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments, open]);

  const sendMutation = useMutation({
    mutationFn: async (msg: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('goal_comments')
        .insert({ goal_id: goalId, user_id: user.id, message: msg });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['goal-comments', goalId] });
      queryClient.invalidateQueries({ queryKey: ['goal-comment-counts'] });
    },
    onError: () => toast.error('Failed to send comment'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from('goal_comments').delete().eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal-comments', goalId] });
      queryClient.invalidateQueries({ queryKey: ['goal-comment-counts'] });
    },
    onError: () => toast.error('Failed to delete comment'),
  });

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    sendMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle className="text-base font-semibold leading-snug line-clamp-2">
            {goalTitle}
          </SheetTitle>
          <p className="text-xs text-muted-foreground">Encouragement & comments</p>
        </SheetHeader>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              </div>
            ))
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-2">
              <p className="text-sm">No comments yet.</p>
              <p className="text-xs">Be the first to leave some encouragement! 🎉</p>
            </div>
          ) : (
            comments.map((comment) => {
              const isOwn = comment.user_id === user?.id;
              const initials = (comment.profiles?.full_name || 'U')
                .split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
              return (
                <div key={comment.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[75%] space-y-1 ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-medium text-foreground ${isOwn ? 'order-2' : ''}`}>
                        {isOwn ? 'You' : comment.profiles?.full_name || 'Partner'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div className={`flex items-start gap-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                      <div
                        className={`rounded-2xl px-3 py-2 text-sm ${
                          isOwn
                            ? 'bg-primary text-primary-foreground rounded-tr-sm'
                            : 'bg-muted text-foreground rounded-tl-sm'
                        }`}
                      >
                        {comment.message}
                      </div>
                      {isOwn && (
                        <button
                          onClick={() => deleteMutation.mutate(comment.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="px-4 py-4 border-t border-border bg-background">
          <div className="flex gap-2 items-end">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write encouragement… (Enter to send)"
              className="resize-none min-h-[40px] max-h-[120px] text-sm"
              rows={1}
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!message.trim() || sendMutation.isPending}
              className="flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
