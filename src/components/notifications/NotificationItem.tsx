import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatTimeAgo } from '@/utils/timeUtils';
import { Notification } from '@/types/notifications';
import { useNotifications } from '@/hooks/useNotifications';
import { useFriends } from '@/hooks/useFriends';

import { useNavigate } from 'react-router-dom';
import { User, UserCheck, UserMinus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: () => void;
}

export const NotificationItem = ({ notification, onMarkRead }: NotificationItemProps) => {
  const { markAsRead } = useNotifications();
  const { respondToFriendRequest } = useFriends();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClick = async () => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    // Navigate based on notification type
    if (notification.type === 'friend_request') {
      navigate('/friends?tab=requests');
    } else if (notification.type === 'friend_request_accepted') {
      // Navigate to the user's profile
      navigate(`/profile/${notification.triggered_by_user_id}`);
    } else if (notification.related_post_id) {
      // Navigate to feed with the specific post highlighted
      navigate(`/feed?post=${notification.related_post_id}`);
    }
    
    onMarkRead();
  };

  const handleFriendRequestResponse = async (response: 'accepted' | 'rejected') => {
    if (!notification.related_request_id) {
      console.error('No request ID found for friend request notification');
      return;
    }

    setIsProcessing(true);
    try {
      await respondToFriendRequest(notification.related_request_id, response);
      // Mark notification as read after responding
      await markAsRead(notification.id);
      onMarkRead();
    } catch (error) {
      console.error('Error responding to friend request:', error);
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
      default:
        return '🔔';
    }
  };

  const isFriendRequest = notification.type === 'friend_request';

  return (
    <div
      onClick={handleClick}
      className={`p-3 cursor-pointer hover:bg-accent transition-colors ${
        !notification.is_read ? 'bg-accent border-l-2 border-l-primary' : ''
      }`}
    >
      <div className="flex items-start space-x-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={notification.triggered_by?.avatar_url} />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getNotificationIcon()}</span>
            <p className="text-sm text-foreground break-words">
              {notification.message}
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {formatTimeAgo(new Date(notification.created_at).getTime())}
          </p>
          
          {/* Friend Request Action Buttons */}
          {isFriendRequest && notification.related_request_id && (
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
          
        </div>
        {!notification.is_read && (
          <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
        )}
      </div>
    </div>
  );
};