import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, Target } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { FeedPost } from "@/services/feedService";

interface FeedPostHeaderProps {
  post: FeedPost;
}

export const FeedPostHeader = ({ post }: FeedPostHeaderProps) => {
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
  );
};