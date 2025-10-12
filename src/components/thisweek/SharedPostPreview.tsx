import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Calendar, Target, CheckCircle2, Clock } from "lucide-react";
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
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground text-sm flex items-center">
            <ExternalLink className="h-4 w-4 mr-2" />
            Shared in Community
          </CardTitle>
          <div className="flex items-center text-muted-foreground text-xs">
            <Calendar className="h-3 w-3 mr-1" />
            {formatDate(post.created_at)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {/* Week Summary */}
        {post.total_objectives !== null && post.total_objectives > 0 && (
          <div className="bg-muted/50 rounded-lg p-3 border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-foreground text-xs font-medium">Week Summary</span>
              <div className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-700 text-xs font-medium">
                {post.completion_percentage}% Complete
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Completed */}
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                <span className="text-emerald-700 text-xs font-medium">
                  {post.objectives_completed} Done
                </span>
              </div>
              
              {/* In Progress */}
              {(post.total_objectives - post.objectives_completed) > 0 && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-amber-600" />
                  <span className="text-amber-700 text-xs font-medium">
                    {post.total_objectives - post.objectives_completed} Not Accomplished
                  </span>
                </div>
              )}

              {/* Progress Bar */}
              <div className="flex-1 ml-2">
                <div className="bg-muted rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="h-full bg-emerald-600"
                    style={{ width: `${post.completion_percentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Preview */}
        {post.accomplishments && (
          <div className="bg-muted/50 rounded-lg p-3 border border-border">
            <h4 className="text-foreground text-xs font-medium mb-2 flex items-center gap-1">
              <Target className="h-3 w-3" />
              Progress Highlights
            </h4>
            <p className="text-muted-foreground text-xs line-clamp-2 leading-relaxed">
              {post.accomplishments.split('\n').find(line => 
                line.includes('•') || line.trim().length > 0
              )?.replace('•', '').trim() || 'Weekly progress shared'}
            </p>
          </div>
        )}

        {/* Engagement & Action */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="text-muted-foreground text-xs">
            {post.likes} likes • {post.comments.length} comments
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onViewInCommunity}
            className="text-xs px-3 py-1 h-auto hover:bg-accent"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            View Post
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};