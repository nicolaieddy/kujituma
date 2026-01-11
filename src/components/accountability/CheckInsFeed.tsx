import { useState, useEffect, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { accountabilityService, CheckInRecord } from '@/services/accountabilityService';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Clock, Calendar as CalendarIcon, ChevronDown, ChevronUp, Search, X, Filter } from 'lucide-react';
import { format, formatDistanceToNow, isSameWeek, startOfWeek, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

const REACTIONS = ['👍', '❤️', '🔥', '👏', '💪'];

interface CheckInsFeedProps {
  partnershipId: string;
  currentUserId: string;
  partnerName: string;
  maxVisible?: number;
}

export const CheckInsFeed = ({ 
  partnershipId, 
  currentUserId,
  partnerName,
  maxVisible = 5
}: CheckInsFeedProps) => {
  const { user } = useAuth();
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);

  const fetchCheckIns = async () => {
    const data = await accountabilityService.getCheckInHistory(partnershipId);
    setCheckIns(data);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchCheckIns();
  }, [partnershipId]);

  // Real-time subscription for new check-ins and reactions
  useEffect(() => {
    const channel = supabase
      .channel(`check-ins-feed-${partnershipId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accountability_check_ins',
          filter: `partnership_id=eq.${partnershipId}`,
        },
        () => {
          fetchCheckIns();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'check_in_reactions',
        },
        (payload) => {
          const checkInIds = checkIns.map(c => c.id);
          const checkInId = (payload.new as any)?.check_in_id || (payload.old as any)?.check_in_id;
          if (checkInIds.includes(checkInId)) {
            fetchCheckIns();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partnershipId, checkIns.map(c => c.id).join(',')]);

  const handleToggleReaction = async (checkInId: string, reaction: string) => {
    await accountabilityService.toggleReaction(checkInId, reaction);
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // Group check-ins by week for context
  const getWeekLabel = (weekStart: string, createdAt: string) => {
    const weekDate = new Date(weekStart);
    const now = new Date();
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    
    if (isSameWeek(weekDate, now, { weekStartsOn: 1 })) {
      return 'This Week';
    }
    
    const oneWeekAgo = new Date(currentWeekStart);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    if (isSameWeek(weekDate, oneWeekAgo, { weekStartsOn: 1 })) {
      return 'Last Week';
    }
    
    return format(weekDate, 'MMM d');
  };

  // Filter check-ins
  const filteredCheckIns = useMemo(() => {
    return checkIns.filter(checkIn => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesMessage = checkIn.message?.toLowerCase().includes(query);
        const matchesName = checkIn.initiator_profile?.full_name?.toLowerCase().includes(query);
        if (!matchesMessage && !matchesName) return false;
      }
      
      // Date range filter
      if (dateRange?.from) {
        const checkInDate = new Date(checkIn.created_at);
        if (isBefore(checkInDate, startOfDay(dateRange.from))) return false;
      }
      if (dateRange?.to) {
        const checkInDate = new Date(checkIn.created_at);
        if (isAfter(checkInDate, endOfDay(dateRange.to))) return false;
      }
      
      return true;
    });
  }, [checkIns, searchQuery, dateRange]);

  const hasActiveFilters = searchQuery.trim() || dateRange?.from || dateRange?.to;
  const visibleCheckIns = showAll ? filteredCheckIns : filteredCheckIns.slice(0, maxVisible);
  const hasMore = filteredCheckIns.length > maxVisible;

  const clearFilters = () => {
    setSearchQuery('');
    setDateRange(undefined);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <MessageSquare className="h-4 w-4" />
          Check-in History
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="h-8 w-8 bg-muted rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (checkIns.length === 0) {
    return (
      <div className="text-center py-6">
        <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">No check-ins yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Record your first check-in to start the conversation
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <MessageSquare className="h-4 w-4" />
          Check-in History
          <Badge variant="secondary" className="text-xs">
            {filteredCheckIns.length}
            {hasActiveFilters && checkIns.length !== filteredCheckIns.length && (
              <span className="text-muted-foreground">/{checkIns.length}</span>
            )}
          </Badge>
        </div>
        <Button
          variant={showFilters ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-1.5"
        >
          <Filter className="h-3 w-3" />
          {hasActiveFilters && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-8">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <span className="text-xs">
                        {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d')}
                      </span>
                    ) : (
                      <span className="text-xs">From {format(dateRange.from, 'MMM d')}</span>
                    )
                  ) : (
                    <span className="text-xs">Date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={1}
                />
              </PopoverContent>
            </Popover>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs gap-1">
              <X className="h-3 w-3" />
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* No results */}
      {filteredCheckIns.length === 0 && hasActiveFilters && (
        <div className="text-center py-6 text-muted-foreground text-sm">
          No check-ins match your filters
        </div>
      )}
      
      {/* Timeline-style feed */}
      {filteredCheckIns.length > 0 && (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
          
          <div className="space-y-4">
            {visibleCheckIns.map((checkIn, index) => {
              const isCurrentUser = checkIn.initiated_by === currentUserId;
              const initiatorName = isCurrentUser ? 'You' : checkIn.initiator_profile?.full_name || partnerName;
              const weekLabel = getWeekLabel(checkIn.week_start, checkIn.created_at);
              
              // Get user's reactions for quick lookup
              const userReactions = new Set(
                (checkIn.reactions || [])
                  .filter(r => r.user_id === user?.id)
                  .map(r => r.reaction)
              );

              return (
                <div key={checkIn.id} className="relative pl-10">
                  {/* Timeline dot */}
                  <div className={cn(
                    "absolute left-2.5 w-3 h-3 rounded-full border-2 border-background",
                    isCurrentUser ? "bg-primary" : "bg-muted-foreground"
                  )} />
                  
                  <div className={cn(
                    "rounded-lg p-3 transition-colors",
                    isCurrentUser 
                      ? "bg-primary/5 border border-primary/10" 
                      : "bg-muted/50 border border-border"
                  )}>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-6 w-6 flex-shrink-0">
                          {!isCurrentUser && checkIn.initiator_profile?.avatar_url ? (
                            <AvatarImage src={checkIn.initiator_profile.avatar_url} />
                          ) : null}
                          <AvatarFallback className={cn(
                            "text-[10px] font-medium",
                            isCurrentUser ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                          )}>
                            {isCurrentUser ? 'You' : getInitials(initiatorName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-foreground">
                            {initiatorName}
                          </span>
                          <span className="text-sm text-muted-foreground ml-1.5">
                            checked in
                          </span>
                        </div>
                      </div>
                      
                      {/* Week badge */}
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[10px] flex-shrink-0",
                          weekLabel === 'This Week' && "border-primary/30 bg-primary/5 text-primary"
                        )}
                      >
                        <CalendarIcon className="h-2.5 w-2.5 mr-1" />
                        {weekLabel}
                      </Badge>
                    </div>
                    
                    {/* Time */}
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground ml-8">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDistanceToNow(new Date(checkIn.created_at), { addSuffix: true })}
                    </div>
                    
                    {/* Message */}
                    {checkIn.message && (
                      <div className="mt-2 ml-8 text-sm text-foreground bg-background/50 rounded-md p-2.5 border border-border/50">
                        {checkIn.message}
                      </div>
                    )}
                    
                    {/* Reactions */}
                    <div className="flex items-center gap-1 mt-2 ml-8 flex-wrap">
                      {REACTIONS.map((emoji) => {
                        const emojiReactions = (checkIn.reactions || []).filter(r => r.reaction === emoji);
                        const count = emojiReactions.length;
                        const hasReacted = userReactions.has(emoji);
                        const reactorNames = emojiReactions.map(r => 
                          r.user_id === user?.id ? 'You' : (r.reactor_name || 'Unknown')
                        );
                        
                        const tooltipText = count > 0 
                          ? reactorNames.join(', ')
                          : 'React';
                        
                        return (
                          <Tooltip key={emoji}>
                            <TooltipTrigger asChild>
                              <Button
                                variant={hasReacted ? "secondary" : "ghost"}
                                size="sm"
                                className={cn(
                                  "h-6 px-1.5 text-xs gap-0.5 transition-opacity",
                                  count > 0 ? 'opacity-100' : 'opacity-30 hover:opacity-100'
                                )}
                                onClick={() => handleToggleReaction(checkIn.id, emoji)}
                              >
                                <span>{emoji}</span>
                                {count > 0 && <span className="text-[10px] ml-0.5">{count}</span>}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              {tooltipText}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Show more/less */}
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Show {filteredCheckIns.length - maxVisible} more check-ins
            </>
          )}
        </Button>
      )}
    </div>
  );
};
