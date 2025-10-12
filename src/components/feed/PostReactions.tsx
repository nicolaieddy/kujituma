import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface Reaction {
  id: string;
  emoji: string;
  count: number;
  userReacted: boolean;
}

const AVAILABLE_REACTIONS = ['👍', '❤️', '🎉', '💪', '🔥', '👏'];

interface PostReactionsProps {
  postId: string;
}

export const PostReactions = ({ postId }: PostReactionsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (postId) {
      fetchReactions();
    }
  }, [postId, user]);

  const fetchReactions = async () => {
    try {
      const { data, error } = await supabase
        .from('post_reactions')
        .select('*')
        .eq('post_id', postId);

      if (error) throw error;

      // Group by emoji and count
      const groupedReactions: Record<string, Reaction> = {};
      data?.forEach((r) => {
        if (!groupedReactions[r.reaction]) {
          groupedReactions[r.reaction] = {
            id: r.reaction,
            emoji: r.reaction,
            count: 0,
            userReacted: false,
          };
        }
        groupedReactions[r.reaction].count++;
        if (user && r.user_id === user.id) {
          groupedReactions[r.reaction].userReacted = true;
        }
      });

      setReactions(Object.values(groupedReactions));
    } catch (error) {
      console.error('Error fetching reactions:', error);
    }
  };

  const handleReaction = async (emoji: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to react to posts",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const existingReaction = reactions.find((r) => r.emoji === emoji);

      if (existingReaction?.userReacted) {
        // Remove reaction
        const { error } = await supabase
          .from('post_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .eq('reaction', emoji);

        if (error) throw error;
      } else {
        // Add reaction
        const { error } = await supabase
          .from('post_reactions')
          .insert({
            post_id: postId,
            user_id: user.id,
            reaction: emoji,
          });

        if (error) throw error;
      }

      await fetchReactions();
    } catch (error: any) {
      console.error('Error toggling reaction:', error);
      toast({
        title: "Error",
        description: "Failed to update reaction",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Display active reactions */}
      <AnimatePresence mode="popLayout">
        {reactions.map((reaction) => (
          <motion.div
            key={reaction.emoji}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleReaction(reaction.emoji)}
              disabled={loading}
              className={`flex items-center gap-1 transition-all ${
                reaction.userReacted
                  ? 'border-primary bg-primary/10 hover:bg-primary/20'
                  : 'hover:border-primary/30'
              }`}
            >
              <span className="text-lg">{reaction.emoji}</span>
              <span className="text-xs font-medium">{reaction.count}</span>
            </Button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add reaction button */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={loading}
            className="hover:bg-accent transition-all"
          >
            <span className="text-lg">😊</span>
            <span className="text-xs ml-1">+</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2 bg-card border-border shadow-elegant">
          <div className="flex gap-1">
            {AVAILABLE_REACTIONS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                onClick={() => handleReaction(emoji)}
                disabled={loading}
                className="text-2xl hover:scale-125 transition-transform p-2 h-auto"
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
