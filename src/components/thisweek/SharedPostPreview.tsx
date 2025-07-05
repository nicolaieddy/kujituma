import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Calendar, Target } from "lucide-react";
import { UnifiedPost } from "@/services/unifiedPostsService";

interface SharedPostPreviewProps {
  post: UnifiedPost;
  onViewInCommunity: () => void;
}

export const SharedPostPreview = ({ post, onViewInCommunity }: SharedPostPreviewProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="bg-white/5 backdrop-blur-sm border-white/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-sm flex items-center">
            <ExternalLink className="h-4 w-4 mr-2" />
            Shared in Community
          </CardTitle>
          <div className="flex items-center text-white/60 text-xs">
            <Calendar className="h-3 w-3 mr-1" />
            {formatDate(post.created_at)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {/* Accomplishments Preview */}
        {post.accomplishments && (
          <div>
            <h4 className="text-white text-xs font-medium mb-1">Progress Shared:</h4>
            <p className="text-white/80 text-xs line-clamp-3 bg-white/5 rounded p-2">
              {post.accomplishments}
            </p>
          </div>
        )}

        {/* Completion Stats */}
        {post.total_objectives !== null && post.total_objectives > 0 && (
          <div className="flex items-center text-white/70 text-xs">
            <Target className="h-3 w-3 mr-1" />
            {post.objectives_completed}/{post.total_objectives} objectives completed
            ({post.completion_percentage}%)
          </div>
        )}

        {/* Engagement Stats */}
        <div className="flex items-center justify-between">
          <div className="text-white/60 text-xs">
            {post.likes} likes • {post.comments.length} comments
          </div>
          <Button
            variant="glass-outline"
            size="sm"
            onClick={onViewInCommunity}
            className="text-xs px-3 py-1 h-auto"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            View Post
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};