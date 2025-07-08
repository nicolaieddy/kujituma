import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatTimeAgo } from '@/utils/timeUtils';
import { Notification } from '@/types/notifications';
import { useNotifications } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: () => void;
}

export const NotificationItem = ({ notification, onMarkRead }: NotificationItemProps) => {
  const { markAsRead } = useNotifications();
  const navigate = useNavigate();

  const handleClick = async () => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    // Navigate to the related post
    if (notification.related_post_id) {
      navigate('/feed');
    }
    
    onMarkRead();
  };

  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'post_like':
        return '🚀';
      case 'comment_added':
        return '💬';
      case 'comment_like':
        return '❤️';
      default:
        return '🔔';
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`p-3 cursor-pointer hover:bg-white/5 transition-colors ${
        !notification.is_read ? 'bg-blue-500/10 border-l-2 border-l-blue-400' : ''
      }`}
    >
      <div className="flex items-start space-x-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={notification.triggered_by?.avatar_url} />
          <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getNotificationIcon()}</span>
            <p className="text-sm text-white break-words">
              {notification.message}
            </p>
          </div>
          <p className="text-xs text-white/60 mt-1">
            {formatTimeAgo(new Date(notification.created_at).getTime())}
          </p>
        </div>
        {!notification.is_read && (
          <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0 mt-2" />
        )}
      </div>
    </div>
  );
};