import { useState, useEffect, useMemo, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { accountabilityService, CheckInRecord } from '@/services/accountabilityService';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Clock, Calendar as CalendarIcon, ChevronDown, ChevronUp, Search, X, Filter, Reply, Send, Pencil, Trash2, Check } from 'lucide-react';
import { format, formatDistanceToNow, isSameWeek, startOfWeek, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { toast } from 'sonner';

const REACTIONS = ['👍', '❤️', '🔥', '👏', '💪'];

export interface OptimisticCheckIn {
  message?: string;
  week_start: string;
  initiator_profile: {
    full_name: string;
    avatar_url: string | null;
  };
}

export interface CheckInsFeedRef {
  refresh: () => Promise<void>;
  addOptimisticCheckIn: (checkIn: OptimisticCheckIn) => string;
  confirmOptimisticCheckIn: (tempId: string) => void;
  removeOptimisticCheckIn: (tempId: string) => void;
}

interface CheckInsFeedProps {
  partnershipId: string;
  currentUserId: string;
  currentUserProfile?: {
    full_name: string;
    avatar_url: string | null;
  };
  partnerName: string;
  maxVisible?: number;
  onRecordCheckIn?: () => void;
}

export const CheckInsFeed = forwardRef<CheckInsFeedRef, CheckInsFeedProps>(({ 
  partnershipId, 
  currentUserId,
  currentUserProfile,
  partnerName,
  maxVisible = 5,
  onRecordCheckIn
}, ref) => {
  const { user } = useAuth();
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [optimisticIds, setOptimisticIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);
  
  // Reply states
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  
  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  
  // Delete states
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const fetchCheckIns = useCallback(async () => {
    const data = await accountabilityService.getCheckInHistory(partnershipId);
    // Keep optimistic check-ins that haven't been confirmed yet
    setCheckIns(prev => {
      const optimisticEntries = prev.filter(c => optimisticIds.has(c.id));
      // Merge: optimistic at top, then real data (excluding duplicates)
      const realIds = new Set(data.map(c => c.id));
      const stillPendingOptimistic = optimisticEntries.filter(c => !realIds.has(c.id));
      return [...stillPendingOptimistic, ...data];
    });
    setLoading(false);
  }, [partnershipId, optimisticIds]);

  const addOptimisticCheckIn = useCallback((optimistic: OptimisticCheckIn): string => {
    const tempId = `optimistic-${Date.now()}`;
    const optimisticRecord: CheckInRecord = {
      id: tempId,
      partnership_id: partnershipId,
      initiated_by: currentUserId,
      week_start: optimistic.week_start,
      message: optimistic.message || null,
      created_at: new Date().toISOString(),
      reply_to_id: null,
      initiator_profile: optimistic.initiator_profile,
      reactions: [],
      replies: [],
    };
    
    setOptimisticIds(prev => new Set(prev).add(tempId));
    setCheckIns(prev => [optimisticRecord, ...prev]);
    return tempId;
  }, [partnershipId, currentUserId]);

  const confirmOptimisticCheckIn = useCallback((tempId: string) => {
    setOptimisticIds(prev => {
      const next = new Set(prev);
      next.delete(tempId);
      return next;
    });
    // The real-time subscription or refresh will replace with actual data
  }, []);

  const removeOptimisticCheckIn = useCallback((tempId: string) => {
    setOptimisticIds(prev => {
      const next = new Set(prev);
      next.delete(tempId);
      return next;
    });
    setCheckIns(prev => prev.filter(c => c.id !== tempId));
  }, []);

  // Expose ref methods
  useImperativeHandle(ref, () => ({
    refresh: fetchCheckIns,
    addOptimisticCheckIn,
    confirmOptimisticCheckIn,
    removeOptimisticCheckIn,
  }), [fetchCheckIns, addOptimisticCheckIn, confirmOptimisticCheckIn, removeOptimisticCheckIn]);

  useEffect(() => {
    setLoading(true);
    fetchCheckIns();
  }, [partnershipId]);

  // Real-time subscription for new check-ins and reactions
  // IMPORTANT: Only depend on partnershipId to avoid infinite re-subscription loops
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
        () => {
          // Refresh on any reaction change - simpler than tracking IDs
          fetchCheckIns();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partnershipId, fetchCheckIns]);

  const handleToggleReaction = async (checkInId: string, reaction: string) => {
    await accountabilityService.toggleReaction(checkInId, reaction);
    await fetchCheckIns(); // Refresh to show updated reaction
  };

  const handleReply = async (parentCheckInId: string) => {
    if (!replyMessage.trim() || isSubmittingReply) return;
    
    const tempId = `optimistic-reply-${Date.now()}`;
    const optimisticReply: CheckInRecord = {
      id: tempId,
      partnership_id: partnershipId,
      initiated_by: currentUserId,
      week_start: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      message: replyMessage.trim(),
      created_at: new Date().toISOString(),
      reply_to_id: parentCheckInId,
      initiator_profile: currentUserProfile || { full_name: 'You', avatar_url: null },
      reactions: [],
      replies: [],
    };
    
    // Add optimistic reply immediately
    setOptimisticIds(prev => new Set(prev).add(tempId));
    setCheckIns(prev => prev.map(checkIn => {
      if (checkIn.id === parentCheckInId) {
        return {
          ...checkIn,
          replies: [...(checkIn.replies || []), optimisticReply],
        };
      }
      return checkIn;
    }));
    
    const messageToSend = replyMessage.trim();
    setReplyMessage('');
    setReplyingToId(null);
    
    try {
      setIsSubmittingReply(true);
      await accountabilityService.recordCheckIn(partnershipId, messageToSend, parentCheckInId);
      
      // Confirm optimistic and refresh
      setOptimisticIds(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
      await fetchCheckIns();
      toast.success('Reply sent!');
    } catch (error) {
      console.error('Error sending reply:', error);
      // Remove optimistic reply on failure
      setOptimisticIds(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
      setCheckIns(prev => prev.map(checkIn => {
        if (checkIn.id === parentCheckInId) {
          return {
            ...checkIn,
            replies: (checkIn.replies || []).filter(r => r.id !== tempId),
          };
        }
        return checkIn;
      }));
      toast.error('Failed to send reply');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleEdit = async (checkInId: string) => {
    if (isSubmittingEdit) return;
    
    try {
      setIsSubmittingEdit(true);
      const result = await accountabilityService.updateCheckIn(checkInId, editMessage.trim());
      if (result.success) {
        setEditMessage('');
        setEditingId(null);
        await fetchCheckIns();
        toast.success('Check-in updated!');
      } else {
        toast.error(result.error || 'Failed to update check-in');
      }
    } catch (error) {
      console.error('Error updating check-in:', error);
      toast.error('Failed to update check-in');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDelete = async (checkInId: string) => {
    try {
      setDeletingId(checkInId);
      const result = await accountabilityService.deleteCheckIn(checkInId);
      if (result.success) {
        await fetchCheckIns();
        toast.success('Check-in deleted');
      } else {
        toast.error(result.error || 'Failed to delete check-in');
      }
    } catch (error) {
      console.error('Error deleting check-in:', error);
      toast.error('Failed to delete check-in');
    } finally {
      setDeletingId(null);
      setPendingDeleteId(null);
      setDeleteConfirmOpen(false);
    }
  };

  const confirmDelete = (checkInId: string) => {
    setPendingDeleteId(checkInId);
    setDeleteConfirmOpen(true);
  };

  const cancelDelete = () => {
    setPendingDeleteId(null);
    setDeleteConfirmOpen(false);
  };

  const startEditing = (checkIn: CheckInRecord) => {
    setEditingId(checkIn.id);
    setEditMessage(checkIn.message || '');
    setReplyingToId(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditMessage('');
  };

  const getInitials = (name: string) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';

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
        <p className="text-xs text-muted-foreground/70 mt-1 mb-4">
          Record your first check-in to start the conversation
        </p>
        {onRecordCheckIn && (
          <Button onClick={onRecordCheckIn} className="gap-1.5">
            <MessageSquare className="h-4 w-4" />
            Record Check-in
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Record Check-in button */}
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
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-1.5"
          >
            <Filter className="h-3 w-3" />
            {hasActiveFilters && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
          </Button>
          {onRecordCheckIn && (
            <Button
              variant="default"
              size="sm"
              onClick={onRecordCheckIn}
              className="gap-1.5"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Record Check-in
            </Button>
          )}
        </div>
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
              const isOptimistic = optimisticIds.has(checkIn.id);
              const initiatorName = isCurrentUser 
                ? (currentUserProfile?.full_name || 'You')
                : (checkIn.initiator_profile?.full_name || partnerName);
              const initiatorAvatar = isCurrentUser 
                ? currentUserProfile?.avatar_url 
                : checkIn.initiator_profile?.avatar_url;
              const weekLabel = getWeekLabel(checkIn.week_start, checkIn.created_at);
              
              // Get user's reactions for quick lookup
              const userReactions = new Set(
                (checkIn.reactions || [])
                  .filter(r => r.user_id === user?.id)
                  .map(r => r.reaction)
              );

              return (
                <div key={checkIn.id} className={cn("relative pl-10", isOptimistic && "opacity-70")}>
                  {/* Timeline dot */}
                  <div className={cn(
                    "absolute left-2.5 w-3 h-3 rounded-full border-2 border-background",
                    isOptimistic ? "bg-muted-foreground animate-pulse" : (isCurrentUser ? "bg-primary" : "bg-muted-foreground")
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
                          {initiatorAvatar && (
                            <AvatarImage src={initiatorAvatar} />
                          )}
                          <AvatarFallback className={cn(
                            "text-[10px] font-medium",
                            isCurrentUser ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                          )}>
                            {getInitials(initiatorName)}
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
                    </div>
                    
                    {/* Combined timestamp with week context */}
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground ml-8 flex-wrap">
                      {isOptimistic ? (
                        <span className="text-primary font-medium animate-pulse">Saving...</span>
                      ) : (
                        <>
                          <div className="flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            <span>{formatDistanceToNow(new Date(checkIn.created_at), { addSuffix: true })}</span>
                          </div>
                          <span className="text-muted-foreground/50">•</span>
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="h-2.5 w-2.5" />
                            <span className={cn(
                              weekLabel === 'This Week' && "text-primary font-medium"
                            )}>
                              for {weekLabel === 'This Week' || weekLabel === 'Last Week' 
                                ? weekLabel.toLowerCase() 
                                : `week of ${format(new Date(checkIn.week_start), 'MMM d')}`}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                    
                    {/* Message - with edit mode */}
                    {editingId === checkIn.id ? (
                      <div className="mt-2 ml-8 flex gap-2">
                        <Textarea
                          value={editMessage}
                          onChange={(e) => setEditMessage(e.target.value)}
                          placeholder="Edit your message..."
                          className="min-h-[60px] text-sm resize-none flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                              handleEdit(checkIn.id);
                            }
                            if (e.key === 'Escape') {
                              cancelEditing();
                            }
                          }}
                        />
                        <div className="flex flex-col gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleEdit(checkIn.id)}
                            disabled={isSubmittingEdit}
                            className="h-8"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEditing}
                            disabled={isSubmittingEdit}
                            className="h-8"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : checkIn.message ? (
                      <p className="mt-2 ml-8 text-sm text-foreground whitespace-pre-wrap">
                        {checkIn.message}
                      </p>
                    ) : null}
                    
                    {/* Reactions and Reply */}
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
                      
                      {/* Reply button - only show for partner's check-ins */}
                      {!isCurrentUser && editingId !== checkIn.id && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1.5 text-xs gap-1 opacity-50 hover:opacity-100"
                              onClick={() => setReplyingToId(replyingToId === checkIn.id ? null : checkIn.id)}
                            >
                              <Reply className="h-3 w-3" />
                              Reply
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            Reply to this check-in
                          </TooltipContent>
                        </Tooltip>
                      )}
                      
                      {/* Edit/Delete buttons - only for current user's check-ins */}
                      {isCurrentUser && editingId !== checkIn.id && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-1.5 text-xs gap-1 opacity-50 hover:opacity-100"
                                onClick={() => startEditing(checkIn)}
                              >
                                <Pencil className="h-3 w-3" />
                                Edit
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              Edit this check-in
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-1.5 text-xs gap-1 opacity-50 hover:opacity-100 text-destructive hover:text-destructive"
                                onClick={() => confirmDelete(checkIn.id)}
                                disabled={deletingId === checkIn.id}
                              >
                                <Trash2 className="h-3 w-3" />
                                {deletingId === checkIn.id ? 'Deleting...' : 'Delete'}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              Delete this check-in
                            </TooltipContent>
                          </Tooltip>
                        </>
                      )}
                    </div>
                    
                    {/* Reply input */}
                    {replyingToId === checkIn.id && (
                      <div className="mt-3 ml-8 flex gap-2">
                        <Avatar className="h-6 w-6 flex-shrink-0">
                          {currentUserProfile?.avatar_url && (
                            <AvatarImage src={currentUserProfile.avatar_url} />
                          )}
                          <AvatarFallback className="text-[10px] font-medium bg-primary/20 text-primary">
                            {getInitials(currentUserProfile?.full_name || 'You')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 flex gap-2">
                          <Textarea
                            placeholder={`Reply to ${checkIn.initiator_profile?.full_name || partnerName}...`}
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            className="min-h-[60px] text-sm resize-none"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                handleReply(checkIn.id);
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleReply(checkIn.id)}
                            disabled={!replyMessage.trim() || isSubmittingReply}
                            className="h-auto self-end"
                          >
                            <Send className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Nested replies */}
                    {checkIn.replies && checkIn.replies.length > 0 && (
                      <div className="mt-3 ml-8 space-y-2 border-l-2 border-primary/20 pl-3">
                        {checkIn.replies.map(reply => {
                          const isReplyFromCurrentUser = reply.initiated_by === currentUserId;
                          const isReplyOptimistic = optimisticIds.has(reply.id);
                          const replyName = isReplyFromCurrentUser 
                            ? (currentUserProfile?.full_name || 'You')
                            : (reply.initiator_profile?.full_name || partnerName);
                          const replyAvatar = isReplyFromCurrentUser 
                            ? currentUserProfile?.avatar_url 
                            : reply.initiator_profile?.avatar_url;
                          const isEditingReply = editingId === reply.id;
                          
                          return (
                            <div key={reply.id} className={cn("flex gap-2 items-start group", isReplyOptimistic && "opacity-70")}>
                              <Avatar className={cn("h-5 w-5 flex-shrink-0", isReplyOptimistic && "animate-pulse")}>
                                {replyAvatar && <AvatarImage src={replyAvatar} />}
                                <AvatarFallback className={cn(
                                  "text-[8px] font-medium",
                                  isReplyFromCurrentUser ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                                )}>
                                  {getInitials(replyName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-medium text-foreground">{replyName}</span>
                                  {isReplyOptimistic ? (
                                    <span className="text-[10px] text-primary font-medium animate-pulse">Saving...</span>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">
                                      {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                                    </span>
                                  )}
                                  {/* Edit/Delete buttons for own replies */}
                                  {isReplyFromCurrentUser && !isEditingReply && (
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 w-5 p-0"
                                            onClick={() => startEditing(reply)}
                                          >
                                            <Pencil className="h-2.5 w-2.5" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="text-xs">
                                          Edit reply
                                        </TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                                            onClick={() => confirmDelete(reply.id)}
                                            disabled={deletingId === reply.id}
                                          >
                                            <Trash2 className="h-2.5 w-2.5" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="text-xs">
                                          Delete reply
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                  )}
                                </div>
                                {isEditingReply ? (
                                  <div className="mt-1 flex gap-2">
                                    <Textarea
                                      value={editMessage}
                                      onChange={(e) => setEditMessage(e.target.value)}
                                      placeholder="Edit your reply..."
                                      className="min-h-[40px] text-xs resize-none flex-1"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                          handleEdit(reply.id);
                                        }
                                        if (e.key === 'Escape') {
                                          cancelEditing();
                                        }
                                      }}
                                    />
                                    <div className="flex flex-col gap-0.5">
                                      <Button
                                        size="sm"
                                        onClick={() => handleEdit(reply.id)}
                                        disabled={isSubmittingEdit}
                                        className="h-6 px-2"
                                      >
                                        <Check className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={cancelEditing}
                                        disabled={isSubmittingEdit}
                                        className="h-6 px-2"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ) : reply.message ? (
                                  <p className="text-xs text-foreground mt-0.5">{reply.message}</p>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete check-in?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your check-in message and any reactions to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDeleteId && handleDelete(pendingDeleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingId ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

CheckInsFeed.displayName = 'CheckInsFeed';
