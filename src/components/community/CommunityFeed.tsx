import { memo, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Eye, Loader2 } from 'lucide-react';
import { useGoalUpdates } from '@/hooks/useGoalUpdates';
import { useGoalFollows } from '@/hooks/useGoalFollows';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { GoalUpdateCard } from './GoalUpdateCard';
import { CheerType } from '@/types/goalUpdates';

interface CommunityFeedProps {
  initialTab?: 'all' | 'following';
}

const EmptyState = ({ type }: { type: 'all' | 'following' }) => (
  <div className="text-center py-12">
    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
      {type === 'following' ? (
        <Eye className="h-8 w-8 text-muted-foreground" />
      ) : (
        <Users className="h-8 w-8 text-muted-foreground" />
      )}
    </div>
    <h3 className="font-medium text-foreground mb-2">
      {type === 'following' ? 'No goals followed yet' : 'No updates yet'}
    </h3>
    <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
      {type === 'following' 
        ? "Follow your friends' goals to see their progress here and cheer them on!"
        : "When your friends share their goal progress, it will appear here."
      }
    </p>
    {type === 'all' && (
      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 max-w-sm mx-auto">
        <p className="text-sm text-foreground font-medium mb-1">Be the first to share!</p>
        <p className="text-xs text-muted-foreground">
          Click the "Share Update" button above to post about your goal progress and inspire others.
        </p>
      </div>
    )}
  </div>
);

const FeedList = memo(({ feedType }: { feedType: 'all' | 'following' }) => {
  const { updates, loading, hasMore, loadMore, toggleCheer, addComment } = useGoalUpdates({ feedType });
  const { isFollowing, toggleFollow } = useGoalFollows();
  
  const sentinelRef = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading: loading
  });

  const handleCheer = (updateId: string, cheerType: CheerType) => {
    toggleCheer(updateId, cheerType);
  };

  const handleComment = async (updateId: string, message: string) => {
    await addComment(updateId, message);
  };

  const handleToggleFollow = (goalId: string, goalTitle: string) => {
    toggleFollow(goalId, goalTitle);
  };

  if (loading && updates.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (updates.length === 0) {
    return <EmptyState type={feedType} />;
  }

  return (
    <div className="space-y-4">
      {updates.map((update) => (
        <GoalUpdateCard
          key={update.id}
          update={update}
          onCheer={handleCheer}
          onComment={handleComment}
          isFollowing={isFollowing(update.goal_id)}
          onToggleFollow={handleToggleFollow}
        />
      ))}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" />

      {loading && updates.length > 0 && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!hasMore && updates.length > 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">
          You're all caught up!
        </p>
      )}
    </div>
  );
});

FeedList.displayName = 'FeedList';

export const CommunityFeed = memo(({ initialTab = 'all' }: CommunityFeedProps) => {
  return (
    <Tabs defaultValue={initialTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="all" className="gap-2">
          <Users className="h-4 w-4" />
          Friends
        </TabsTrigger>
        <TabsTrigger value="following" className="gap-2">
          <Eye className="h-4 w-4" />
          Following
        </TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="mt-0">
        <FeedList feedType="all" />
      </TabsContent>

      <TabsContent value="following" className="mt-0">
        <FeedList feedType="following" />
      </TabsContent>
    </Tabs>
  );
});

CommunityFeed.displayName = 'CommunityFeed';
