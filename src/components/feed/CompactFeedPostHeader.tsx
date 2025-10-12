import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { UnifiedPost } from "@/services/unifiedPostsService";

interface CompactFeedPostHeaderProps {
  post: UnifiedPost;
}

export const CompactFeedPostHeader = ({ post }: CompactFeedPostHeaderProps) => {
  const navigate = useNavigate();

  const formatWeekRange = (weekStart: string, weekEnd: string) => {
    const start = new Date(weekStart);
    const end = new Date(weekEnd);
    
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    return `${startStr} - ${endStr}`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleProfileClick = () => {
    navigate(`/profile/${post.user_id}`);
  };

  // Calculate completion percentage
  const completionPercentage = post.completion_percentage || 0;
  
  // Parse objectives for counts
  const accomplishmentsText = post.accomplishments || '';
  const completedCount = (accomplishmentsText.match(/Completed Objectives:[\s\S]*?(?=Incomplete Objectives:|Reflections on Incomplete Objectives:|Weekly Reflections:|$)/)?.[0]?.match(/• /g) || []).length;
  const incompleteCount = (accomplishmentsText.match(/Incomplete Objectives:[\s\S]*?(?=Reflections on Incomplete Objectives:|Weekly Reflections:|$)/)?.[0]?.match(/• /g) || []).length;

  return (
    <div className="flex items-start gap-3">
      <Avatar 
        className="h-8 w-8 cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all"
        onClick={handleProfileClick}
      >
        <AvatarImage src={post.profiles?.avatar_url || undefined} />
        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
          {getInitials(post.profiles?.full_name || 'User')}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span 
            className="text-foreground font-medium text-sm cursor-pointer hover:text-foreground/80 transition-colors truncate"
            onClick={handleProfileClick}
          >
            {post.profiles?.full_name || 'Anonymous User'}
          </span>
          <span className="text-muted-foreground text-xs">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </span>
          {completionPercentage > 0 && (
            <Badge 
              variant="secondary" 
              className={`text-xs px-1.5 py-0 ${
                completionPercentage >= 80 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                completionPercentage >= 60 ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                completionPercentage >= 40 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                'bg-red-500/20 text-red-300 border-red-500/30'
              }`}
            >
              {Math.round(completionPercentage)}%
            </Badge>
          )}
        </div>
        
        {post.week_start && post.week_end && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatWeekRange(post.week_start, post.week_end)}</span>
            {(completedCount > 0 || incompleteCount > 0) && (
              <>
                <span>•</span>
                <span>{completedCount} done, {incompleteCount} in progress</span>
              </>
            )}
          </div>
        )}
        
        {completionPercentage > 0 && (
          <Progress 
            value={completionPercentage} 
            className="h-1 mt-1.5 bg-muted/30"
          />
        )}
      </div>
    </div>
  );
};