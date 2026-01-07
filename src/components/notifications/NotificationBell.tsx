import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/useNotifications';
import { useFriends } from '@/hooks/useFriends';
import { useAccountabilityPartners } from '@/hooks/useAccountabilityPartners';
import { NotificationItem } from './NotificationItem';
import { Bell, Users } from 'lucide-react';
import { toast } from 'sonner';

export const NotificationBell = () => {
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications();
  const { friendRequests } = useFriends();
  const { partnerRequests } = useAccountabilityPartners();
  const [isOpen, setIsOpen] = useState(false);

  // Calculate pending requests count
  const pendingFriendRequests = friendRequests.received?.length || 0;
  const pendingPartnerRequests = partnerRequests.received?.length || 0;
  const totalPendingRequests = pendingFriendRequests + pendingPartnerRequests;

  // Total badge count (unread notifications + pending requests that need action)
  const totalBadgeCount = unreadCount;

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    // Mark all as read when opening the popover if there are unread notifications
    if (open && unreadCount > 0) {
      await markAllAsRead();
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    toast.success('All notifications marked as read');
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative rounded-full overflow-visible"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {totalBadgeCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-[10px] font-semibold leading-none flex items-center justify-center shadow-md bg-primary text-primary-foreground z-10"
            >
              {totalBadgeCount > 99 ? '99+' : totalBadgeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-96 p-0" 
        align="end"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">Notifications</h3>
            {totalPendingRequests > 0 && (
              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                <Users className="h-3 w-3" />
                {totalPendingRequests} pending
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-xs text-primary hover:text-primary/80"
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={() => setIsOpen(false)}
                  onMarkAsRead={markAsRead}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
