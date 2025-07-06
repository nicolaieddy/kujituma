import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, Target, CheckCircle2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { UnifiedPost } from "@/services/unifiedPostsService";

interface EnhancedFeedPostHeaderProps {
  post: UnifiedPost;
}

export const EnhancedFeedPostHeader = ({ post }: EnhancedFeedPostHeaderProps) => {
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

  const completionPercentage = post.completion_percentage || 0;
  const objectivesCompleted = post.objectives_completed || 0;
  const totalObjectives = post.total_objectives || 0;
  const inProgressObjectives = totalObjectives - objectivesCompleted;

  return (
    <div className="space-y-4">
      {/* User Info Row */}
      <div className="flex items-center justify-between">
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
          
          <div>
            <h3 
              className="text-white font-semibold text-lg cursor-pointer hover:text-white/80 transition-colors"
              onClick={handleProfileClick}
            >
              {post.profiles?.full_name || post.name}
            </h3>
            <span className="text-white/60 text-sm">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Completion Badge */}
        {completionPercentage > 0 && (
          <Badge 
            variant="secondary" 
            className={`font-semibold text-sm px-3 py-1 ${
              completionPercentage === 100 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                : completionPercentage >= 50 
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}
          >
            {completionPercentage}% Complete
          </Badge>
        )}
      </div>

      {/* Week Info & Objectives Summary */}
      {post.week_start && post.week_end && (
        <div className="bg-gradient-to-r from-white/5 to-white/10 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
          {/* Week Range */}
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-blue-400" />
            <span className="text-white font-medium text-sm">
              Week of {formatWeekRange(post.week_start, post.week_end)}
            </span>
          </div>
          
          {/* Objectives Summary */}
          {totalObjectives > 0 && (
            <div className="flex items-center gap-6">
              {/* Completed Count */}
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                </div>
                <span className="text-emerald-300 font-medium text-sm">
                  {objectivesCompleted} Completed
                </span>
              </div>

              {/* In Progress Count */}
              {inProgressObjectives > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20">
                    <Clock className="h-3 w-3 text-amber-400" />
                  </div>
                  <span className="text-amber-300 font-medium text-sm">
                    {inProgressObjectives} In Progress
                  </span>
                </div>
              )}

              {/* Progress Bar */}
              <div className="flex-1 ml-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500 ease-out"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                  <span className="text-white/60 text-xs font-medium min-w-[3rem]">
                    {objectivesCompleted}/{totalObjectives}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};