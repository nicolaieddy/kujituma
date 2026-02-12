import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNotifications } from '@/hooks/useNotifications';
import { useFriends } from '@/hooks/useFriends';
import { useAccountabilityData, useDueCheckIns } from '@/hooks/useAccountabilityData';
import { NotificationItem } from './NotificationItem';
import { Bell, Users, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export const NotificationBell = () => {
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications();
  const { friendRequests } = useFriends();
  const { receivedRequests: partnerRequestsReceived } = useAccountabilityData();
  const { overdueCheckIns, dueTodayCheckIns, hasOverdue, hasDueToday } = useDueCheckIns();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // Calculate pending requests count
  const pendingFriendRequests = friendRequests.received?.length || 0;
  const pendingPartnerRequests = partnerRequestsReceived?.length || 0;
  const totalPendingRequests = pendingFriendRequests + pendingPartnerRequests;
  
  // Count overdue partner check-ins as urgent notifications
  const overdueCount = overdueCheckIns.length;

  // Total badge count (unread notifications + overdue check-ins)
  const totalBadgeCount = unreadCount + overdueCount;

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
          {/* Overdue & Due Partner Check-ins - Compact */}
          {(hasOverdue || hasDueToday) && (
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Users className="h-3 w-3" />
                Partner Check-ins
              </div>
              <div className="flex flex-wrap gap-2">
                {overdueCheckIns.map((checkIn) => (
                  <div
                    key={checkIn.partner_id}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-destructive/10 border border-destructive/20 cursor-pointer hover:bg-destructive/15 transition-colors"
                    onClick={() => {
                      setIsOpen(false);
                      navigate(`/partner/${checkIn.partner_id}`);
                    }}
                  >
                    <Avatar className="h-5 w-5">
                      {checkIn.avatar_url && <AvatarImage src={checkIn.avatar_url} />}
                      <AvatarFallback className="text-[9px] bg-destructive/20 text-destructive">
                        {checkIn.partner_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium truncate max-w-[100px]">{checkIn.partner_name.split(' ')[0]}</span>
                    <span className="text-[10px] text-destructive font-medium whitespace-nowrap">
                      {Math.abs(checkIn.days_until_due)}d overdue
                    </span>
                  </div>
                ))}
                {dueTodayCheckIns.map((checkIn) => (
                  <div
                    key={checkIn.partner_id}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-warning/10 border border-warning/20 cursor-pointer hover:bg-warning/15 transition-colors"
                    onClick={() => {
                      setIsOpen(false);
                      navigate(`/partner/${checkIn.partner_id}`);
                    }}
                  >
                    <Avatar className="h-5 w-5">
                      {checkIn.avatar_url && <AvatarImage src={checkIn.avatar_url} />}
                      <AvatarFallback className="text-[9px] bg-warning/20">
                        {checkIn.partner_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium truncate max-w-[100px]">{checkIn.partner_name.split(' ')[0]}</span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">Due today</span>
                  </div>
                ))}
              </div>
              <Separator className="my-2" />
            </div>
          )}
          
          {notifications.length === 0 && !hasOverdue && !hasDueToday ? (
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
