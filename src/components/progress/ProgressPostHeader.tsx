import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User, Clock, History } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProgressPostType } from "@/types/progress";
import { formatTimeAgo } from "@/utils/timeUtils";

interface ProgressPostHeaderProps {
  post: ProgressPostType;
  onViewUserHistory: () => void;
}

export const ProgressPostHeader = ({ post, onViewUserHistory }: ProgressPostHeaderProps) => {
  const navigate = useNavigate();

  const handleProfileClick = () => {
    navigate(`/profile/${post.user_id || post.id}`);
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Avatar 
          className="h-5 w-5 cursor-pointer hover:ring-1 hover:ring-white/20 transition-all"
          onClick={handleProfileClick}
        >
          <AvatarImage src={post.avatar_url} />
          <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs">
            <User className="h-2 w-2" />
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center space-x-1">
            <h3 
              className="text-white font-semibold text-xs cursor-pointer hover:text-white/80 transition-colors"
              onClick={handleProfileClick}
            >
              {post.name}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewUserHistory}
              className="text-white/60 hover:bg-white/20 text-xs h-4 px-1"
            >
              <History className="h-2 w-2" />
            </Button>
          </div>
          <div className="flex items-center space-x-1 text-white/60 text-xs">
            <Clock className="h-2 w-2" />
            <span>{formatTimeAgo(post.timestamp)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};