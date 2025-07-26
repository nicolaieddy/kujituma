import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, Target } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { UnifiedPost } from "@/services/unifiedPostsService";

interface FeedPostHeaderProps {
  post: UnifiedPost;
}

export const FeedPostHeader = ({ post }: FeedPostHeaderProps) => {
  const navigate = useNavigate();
  
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

  const handleProfileClick = () => {
    navigate(`/profile/${post.user_id}`);
  };

  return (
    <div className="space-y-4">
      {/* User Info */}
      <div className="flex items-center gap-3">
        <Avatar 
          className="h-12 w-12 ring-2 ring-white/20 cursor-pointer hover:ring-white/40 transition-all"
          onClick={handleProfileClick}
        >
          <AvatarImage src={post.profiles?.avatar_url || undefined} />
          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white font-semibold">
            {getInitials(post.profiles?.full_name || post.name)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
            <h3 
              className="text-white font-semibold text-lg cursor-pointer hover:text-white/80 transition-colors"
              onClick={handleProfileClick}
            >
              {post.profiles?.full_name || post.name}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-white/60 text-sm">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
              <span className="text-white/40 text-xs font-mono">
                ID: {post.user_id?.slice(0, 8)}...
              </span>
            </div>
        </div>
      </div>

      {/* Week Info */}
      {post.week_start && post.week_end && (
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-400" />
              <span className="text-white font-medium">
                {formatWeekRange(post.week_start, post.week_end)}
              </span>
            </div>
            {post.completion_percentage !== undefined && (
              <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-semibold">
                {post.completion_percentage}% Complete
              </Badge>
            )}
          </div>
          
          {post.objectives_completed !== undefined && post.total_objectives !== undefined && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
              <Target className="h-4 w-4 text-white/60" />
              <span className="text-white/80 text-sm">
                {post.objectives_completed} of {post.total_objectives} objectives completed
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};