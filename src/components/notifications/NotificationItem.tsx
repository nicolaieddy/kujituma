import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { formatTimeAgo } from '@/utils/timeUtils';
import { Notification } from '@/types/notifications';
import { useFriends } from '@/hooks/useFriends';
import { useAccountabilityPartners } from '@/hooks/useAccountabilityPartners';

import { useNavigate } from 'react-router-dom';
import { User, UserCheck, UserMinus, Loader2, CheckCircle, Target, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';


interface NotificationItemProps {
  notification: Notification;
  onMarkRead: () => void;
  onMarkAsRead: (notificationId: string) => Promise<void>;
  pendingPartnerRequestIds?: Set<string>;
  pendingFriendRequestIds?: Set<string>;
}

export const NotificationItem = ({ notification, onMarkRead, onMarkAsRead, pendingPartnerRequestIds, pendingFriendRequestIds }: NotificationItemProps) => {
  const { respondToFriendRequest } = useFriends();
  const { respondToPartnerRequest } = useAccountabilityPartners();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHandled, setIsHandled] = useState(false);
  
  // Partner accept dialog state
  const [showPartnerDialog, setShowPartnerDialog] = useState(false);
  const [theyCanViewMyGoals, setTheyCanViewMyGoals] = useState(true);
  const [iCanViewTheirGoals, setICanViewTheirGoals] = useState(true);

  // Determine if this request is still pending based on already-fetched data.
  // A partner request is pending if its ID exists in pendingPartnerRequestIds.
  // A friend request is pending if its ID exists in pendingFriendRequestIds.
  // This avoids per-notification DB queries on every render.

  const handleClick = async () => {
    // Close popover and mark as read immediately
    onMarkRead();
    if (!notification.is_read) {
      onMarkAsRead(notification.id).catch(() => {});
    }

    let destination: string | null = null;

    switch (notification.type) {
      case 'friend_request':
        destination = '/friends?tab=requests';
        break;
      case 'friend_request_accepted':
        destination = `/profile/${notification.triggered_by_user_id}`;
        break;
      case 'accountability_partner_request':
        destination = '/friends?tab=accountability';
        break;
      case 'accountability_partner_accepted':
        destination = `/profile/${notification.triggered_by_user_id}`;
        break;
      case 'accountability_check_in':
        destination = `/partner/${notification.triggered_by_user_id}`;
        break;
      case 'comment_reaction': {
        if (notification.related_comment_id) {
          try {
            const { data: comment } = await supabase
              .from('objective_comments')
              .select('objective_id')
              .eq('id', notification.related_comment_id)
              .single();
            if (comment?.objective_id) {
              const { data: obj } = await supabase
                .from('weekly_objectives')
                .select('week_start')
                .eq('id', comment.objective_id)
                .single();
              destination = obj?.week_start
                ? `/goals?tab=weekly&week=${obj.week_start}&openComments=${comment.objective_id}`
                : '/goals?tab=weekly';
            } else {
              destination = '/goals?tab=weekly';
            }
          } catch {
            destination = '/goals?tab=weekly';
          }
        } else {
          destination = '/goals?tab=weekly';
        }
        break;
      }
      case 'partner_objective_feedback':
        if (notification.related_objective_id) {
          try {
            const { data } = await supabase
              .from('weekly_objectives')
              .select('week_start')
              .eq('id', notification.related_objective_id)
              .single();
            if (data?.week_start) {
              destination = `/goals?tab=weekly&week=${data.week_start}&openComments=${notification.related_objective_id}`;
            } else {
              destination = '/goals?tab=weekly';
            }
          } catch {
            destination = '/goals?tab=weekly';
          }
        } else {
          destination = '/goals?tab=weekly';
        }
        break;
      case 'goal_update_cheer':
      case 'goal_update_comment':
      case 'goal_milestone':
      case 'goal_help_request':
        destination = '/community';
        break;
      case 'post_like':
      case 'comment_added':
      case 'comment_like':
      case 'mention':
        if (notification.related_post_id) {
          destination = `/feed?post=${notification.related_post_id}`;
        } else {
          destination = '/feed';
        }
        break;
      default:
        if (notification.related_post_id) {
          destination = `/feed?post=${notification.related_post_id}`;
        }
        break;
    }

    if (destination) {
      navigate(destination);
    }
  };

  const handleFriendRequestResponse = async (response: 'accepted' | 'rejected') => {
    if (!notification.related_request_id) {
      console.error('No request ID found for friend request notification');
      return;
    }

    setIsProcessing(true);
    try {
      await respondToFriendRequest(notification.related_request_id, response);
      setIsHandled(true);
      await onMarkAsRead(notification.id);
      onMarkRead();
    } catch (error) {
      console.error('Error responding to friend request:', error);
      setIsHandled(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePartnerRequestAccept = () => {
    // Open dialog to customize visibility settings
    setShowPartnerDialog(true);
  };

  const handlePartnerRequestReject = async () => {
    if (!notification.related_request_id) {
      console.error('No request ID found for partner request notification');
      return;
    }

    setIsProcessing(true);
    try {
      await respondToPartnerRequest(notification.related_request_id, 'rejected');
      setIsHandled(true);
      await onMarkAsRead(notification.id);
      onMarkRead();
    } catch (error) {
      console.error('Error responding to partner request:', error);
      setIsHandled(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmPartnerAccept = async () => {
    if (!notification.related_request_id) {
      console.error('No request ID found for partner request notification');
      return;
    }

    setIsProcessing(true);
    try {
      await respondToPartnerRequest(
        notification.related_request_id, 
        'accepted',
        { senderCanViewReceiverGoals: iCanViewTheirGoals, receiverCanViewSenderGoals: theyCanViewMyGoals }
      );
      setIsHandled(true);
      setShowPartnerDialog(false);
      await onMarkAsRead(notification.id);
      onMarkRead();
    } catch (error) {
      console.error('Error responding to partner request:', error);
      setIsHandled(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'post_like':
        return '🚀';
      case 'comment_added':
        return '💬';
      case 'comment_like':
        return '❤️';
      case 'mention':
        return '📣';
      case 'friend_request':
        return '👋';
      case 'friend_request_accepted':
        return '🤝';
      case 'accountability_partner_request':
        return '🎯';
      case 'accountability_partner_accepted':
        return '🤝';
      case 'accountability_check_in':
        return '📋';
      case 'partner_objective_feedback':
        return '💡';
      case 'goal_update_cheer':
        return '🎉';
      case 'goal_milestone':
        return '🏆';
      case 'goal_help_request':
        return '🆘';
      case 'goal_update_comment':
        return '💬';
      case 'comment_reaction':
        return '😊';
      default:
        return '🔔';
    }
  };

  const isFriendRequest = notification.type === 'friend_request';
  const isPartnerRequest = notification.type === 'accountability_partner_request';

  // Request is still actionable only if its ID is still in the pending set (from parent).
  // If pendingXxxRequestIds is undefined (prop not passed), fall back to local isHandled only.
  const friendRequestStillPending = notification.related_request_id
    ? (pendingFriendRequestIds ? pendingFriendRequestIds.has(notification.related_request_id) : !isHandled)
    : false;
  const partnerRequestStillPending = notification.related_request_id
    ? (pendingPartnerRequestIds ? pendingPartnerRequestIds.has(notification.related_request_id) : !isHandled)
    : false;

  const showFriendRequestActions = isFriendRequest && notification.related_request_id && friendRequestStillPending && !isHandled;
  const showPartnerRequestActions = isPartnerRequest && notification.related_request_id && partnerRequestStillPending && !isHandled;
  const alreadyHandled = (isFriendRequest && !friendRequestStillPending) || (isPartnerRequest && !partnerRequestStillPending) || isHandled;

  const senderName = notification.triggered_by?.full_name || 'Someone';
  const senderFirstName = senderName.split(' ')[0];

  return (
    <>
      <div
        onClick={handleClick}
        className={`p-3 cursor-pointer hover:bg-accent transition-colors ${
          !notification.is_read ? 'bg-accent border-l-2 border-l-primary' : ''
        }`}
      >
        <div className="flex items-start space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={notification.triggered_by?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-lg">{getNotificationIcon()}</span>
              <p className="text-sm text-foreground break-words">{notification.message}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatTimeAgo(new Date(notification.created_at).getTime())}
            </p>

            {/* Friend Request Action Buttons */}
            {showFriendRequestActions && (
              <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  onClick={() => handleFriendRequestResponse('accepted')}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <UserCheck className="h-3 w-3 mr-1" />
                  )}
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleFriendRequestResponse('rejected')}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <UserMinus className="h-3 w-3 mr-1" />
                  )}
                  Decline
                </Button>
              </div>
            )}

            {/* Accountability Partner Request Action Buttons */}
            {showPartnerRequestActions && (
              <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  onClick={handlePartnerRequestAccept}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Target className="h-3 w-3 mr-1" />
                  )}
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePartnerRequestReject}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <UserMinus className="h-3 w-3 mr-1" />
                  )}
                  Decline
                </Button>
              </div>
            )}

            {/* Show handled state */}
            {(isFriendRequest || isPartnerRequest) && alreadyHandled && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <CheckCircle className="h-3 w-3" />
                <span>Already partners</span>
              </div>
            )}
          </div>

          {!notification.is_read && (
            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
          )}
        </div>
      </div>

      {/* Partner Accept Dialog */}
      <Dialog open={showPartnerDialog} onOpenChange={setShowPartnerDialog}>
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Accept Partner Request
            </DialogTitle>
            <DialogDescription>
              Customize visibility settings before accepting {senderFirstName}'s partnership request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Partner Info */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
              <Avatar className="h-12 w-12">
                <AvatarImage src={notification.triggered_by?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {senderName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium text-foreground">{senderName}</p>
                <p className="text-sm text-muted-foreground">Wants to be your accountability partner</p>
              </div>
            </div>

            {/* Visibility Settings */}
            <div className="space-y-3 border rounded-lg p-4 bg-background">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Visibility Settings
              </Label>
              <p className="text-xs text-muted-foreground">
                Choose what you want to share:
              </p>
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notify-they-view-my" className="text-sm font-normal">
                      They can view my goals
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {senderFirstName} will see your goals and progress
                    </p>
                  </div>
                  <Switch
                    id="notify-they-view-my"
                    checked={theyCanViewMyGoals}
                    onCheckedChange={setTheyCanViewMyGoals}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notify-i-view-their" className="text-sm font-normal">
                      I can view their goals
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      See {senderFirstName}'s goals and progress
                    </p>
                  </div>
                  <Switch
                    id="notify-i-view-their"
                    checked={iCanViewTheirGoals}
                    onCheckedChange={setICanViewTheirGoals}
                  />
                </div>
              </div>
            </div>

            {/* Summary Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge 
                variant={theyCanViewMyGoals ? "default" : "secondary"} 
                className="text-xs flex items-center gap-1"
              >
                {theyCanViewMyGoals ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                They {theyCanViewMyGoals ? 'can' : "can't"} see your goals
              </Badge>
              <Badge 
                variant={iCanViewTheirGoals ? "default" : "secondary"} 
                className="text-xs flex items-center gap-1"
              >
                {iCanViewTheirGoals ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                You {iCanViewTheirGoals ? 'can' : "can't"} see their goals
              </Badge>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowPartnerDialog(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPartnerAccept} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Accepting...
                </>
              ) : (
                'Accept Partnership'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
