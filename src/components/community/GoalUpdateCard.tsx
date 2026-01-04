import { useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  PartyPopper, 
  Flame, 
  Lightbulb, 
  MessageCircle, 
  Eye,
  Trophy,
  Target,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Check
} from 'lucide-react';
import { GoalUpdate, CheerType } from '@/types/goalUpdates';
import { cn } from '@/lib/utils';
import { GoalUpdateComments } from './GoalUpdateComments';

interface GoalUpdateCardProps {
  update: GoalUpdate;
  onCheer: (updateId: string, cheerType: CheerType) => void;
  onComment: (updateId: string, message: string) => Promise<void>;
  isFollowing: boolean;
  onToggleFollow: (goalId: string, goalTitle: string) => void;
}

const getUpdateIcon = (updateType: string, milestoneType: string | null) => {
  if (milestoneType === 'completed' || updateType === 'completed') {
    return <Trophy className="h-5 w-5 text-yellow-500" />;
  }
  if (milestoneType) {
    return <Target className="h-5 w-5 text-primary" />;
  }
  if (updateType === 'ask_for_help') {
    return <HelpCircle className="h-5 w-5 text-orange-500" />;
  }
  return <Flame className="h-5 w-5 text-primary" />;
};

const getUpdateTitle = (update: GoalUpdate) => {
  const name = update.user?.full_name || 'Someone';
  const goalTitle = update.goal?.title || 'a goal';

  switch (update.milestone_type) {
    case 'completed':
      return `${name} completed "${goalTitle}"! 🎉`;
    case '75_percent':
      return `${name} hit 75% on "${goalTitle}"`;
    case '50_percent':
      return `${name} is halfway through "${goalTitle}"`;
    case '25_percent':
      return `${name} is making progress on "${goalTitle}"`;
    case 'started':
      return `${name} started "${goalTitle}"`;
    default:
      if (update.update_type === 'ask_for_help') {
        return `${name} needs help with "${goalTitle}"`;
      }
      return `${name} made progress on "${goalTitle}"`;
  }
};

const getMilestoneColor = (milestone: string | null) => {
  switch (milestone) {
    case 'completed': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30';
    case '75_percent': return 'bg-green-500/10 text-green-600 border-green-500/30';
    case '50_percent': return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
    case '25_percent': return 'bg-purple-500/10 text-purple-600 border-purple-500/30';
    default: return 'bg-muted text-muted-foreground';
  }
};

export const GoalUpdateCard = memo(({ 
  update, 
  onCheer, 
  onComment,
  isFollowing,
  onToggleFollow 
}: GoalUpdateCardProps) => {
  const navigate = useNavigate();
  const [showObjectives, setShowObjectives] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const completedObjectives = update.objectives_snapshot?.filter(o => o.is_completed) || [];
  const totalObjectives = update.objectives_snapshot?.length || 0;
  const progressPercent = totalObjectives > 0 
    ? Math.round((completedObjectives.length / totalObjectives) * 100) 
    : 0;

  const handleProfileClick = () => {
    if (update.user?.id) {
      navigate(`/profile/${update.user.id}`);
    }
  };

  const handleCheer = (type: CheerType) => {
    onCheer(update.id, type);
  };

  const getCheerButtonState = (type: CheerType) => {
    return update.user_has_cheered && update.user_cheer_type === type;
  };

  const isHelpRequest = update.update_type === 'ask_for_help';

  return (
    <Card className={cn(
      "overflow-hidden transition-all",
      update.milestone_type === 'completed' && "ring-2 ring-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-transparent",
      isHelpRequest && "ring-2 ring-orange-500/30 bg-gradient-to-br from-orange-500/5 to-transparent"
    )}>
      <CardContent className="pt-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <Avatar 
            className="h-10 w-10 cursor-pointer ring-2 ring-background"
            onClick={handleProfileClick}
          >
            <AvatarImage src={update.user?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {update.user?.full_name?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {getUpdateIcon(update.update_type, update.milestone_type)}
              <h3 className="font-medium text-foreground text-sm sm:text-base">
                {getUpdateTitle(update)}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
            </p>
          </div>

          {/* Follow button */}
          {update.user_id !== update.user?.id && (
            <Button
              variant={isFollowing ? "secondary" : "outline"}
              size="sm"
              onClick={() => onToggleFollow(update.goal_id, update.goal?.title || '')}
              className="shrink-0 gap-1.5"
            >
              <Eye className="h-3.5 w-3.5" />
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">Goal Progress</span>
            {update.milestone_type && (
              <Badge variant="outline" className={cn("text-xs", getMilestoneColor(update.milestone_type))}>
                {update.milestone_type === 'completed' ? '100%' : update.milestone_type.replace('_', ' ')}
              </Badge>
            )}
          </div>
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {completedObjectives.length} of {totalObjectives} objectives completed
          </p>
        </div>

        {/* Content / Reflection */}
        {update.content && (
          <div className={cn(
            "mb-4 p-3 rounded-lg border",
            isHelpRequest 
              ? "bg-orange-500/10 border-orange-500/30" 
              : "bg-muted/50 border-border/50"
          )}>
            {isHelpRequest && (
              <div className="flex items-center gap-2 mb-2">
                <HelpCircle className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-medium text-orange-600 dark:text-orange-400">Asking for help</span>
              </div>
            )}
            <p className="text-sm text-foreground whitespace-pre-wrap">{update.content}</p>
          </div>
        )}

        {/* Objectives (collapsible) */}
        {totalObjectives > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowObjectives(!showObjectives)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              {showObjectives ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showObjectives ? 'Hide' : 'Show'} this week's objectives ({completedObjectives.length}/{totalObjectives})
            </button>
            
            {showObjectives && (
              <div className="mt-2 space-y-1.5 pl-6">
                {update.objectives_snapshot.map((obj) => (
                  <div key={obj.id} className="flex items-start gap-2">
                    <div className={cn(
                      "mt-0.5 h-4 w-4 rounded-full flex items-center justify-center shrink-0",
                      obj.is_completed ? "bg-green-500/20" : "bg-muted"
                    )}>
                      {obj.is_completed && <Check className="h-3 w-3 text-green-600" />}
                    </div>
                    <span className={cn(
                      "text-sm",
                      obj.is_completed ? "text-muted-foreground line-through" : "text-foreground"
                    )}>
                      {obj.text}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-border/50">
          <Button
            variant={getCheerButtonState('celebrate') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleCheer('celebrate')}
            className="gap-1.5"
          >
            <PartyPopper className="h-4 w-4" />
            <span className="hidden sm:inline">Celebrate</span>
          </Button>

          <Button
            variant={getCheerButtonState('encourage') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleCheer('encourage')}
            className="gap-1.5"
          >
            <Flame className="h-4 w-4" />
            <span className="hidden sm:inline">Encourage</span>
          </Button>

          {update.update_type === 'ask_for_help' && (
            <Button
              variant={getCheerButtonState('offer_help') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleCheer('offer_help')}
              className="gap-1.5"
            >
              <Lightbulb className="h-4 w-4" />
              <span className="hidden sm:inline">Offer Help</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className="gap-1.5 ml-auto"
          >
            <MessageCircle className="h-4 w-4" />
            {(update.comments_count || 0) > 0 && update.comments_count}
          </Button>

          {(update.cheers_count || 0) > 0 && (
            <span className="text-xs text-muted-foreground">
              {update.cheers_count} {update.cheers_count === 1 ? 'cheer' : 'cheers'}
            </span>
          )}
        </div>

        {/* Comments section */}
        {showComments && (
          <GoalUpdateComments
            updateId={update.id}
            onAddComment={(message) => onComment(update.id, message)}
          />
        )}
      </CardContent>
    </Card>
  );
});

GoalUpdateCard.displayName = 'GoalUpdateCard';
