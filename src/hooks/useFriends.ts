import { useState, useEffect, useCallback, useRef } from 'react';
import { friendsService, Friend, FriendRequest } from '@/services/friendsService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useFriends = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<{
    sent: FriendRequest[];
    received: FriendRequest[];
  }>({ sent: [], received: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const [friendsData, requestsData] = await Promise.all([
        friendsService.getFriends(),
        friendsService.getFriendRequests()
      ]);
      
      setFriends(friendsData);
      setFriendRequests(requestsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch friends data');
      console.error('Error fetching friends data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Store fetchData in a ref to avoid re-subscribing on every render
  const fetchDataRef = useRef(fetchData);
  fetchDataRef.current = fetchData;

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time subscription for friend requests
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('friend-requests-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          // Refetch when we receive a new request or status changes
          fetchDataRef.current();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `sender_id=eq.${user.id}`,
        },
        () => {
          // Refetch when our sent requests change
          fetchDataRef.current();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friends',
        },
        () => {
          // Refetch when friendships change
          fetchDataRef.current();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]); // Removed fetchData from deps - using ref instead

  const sendFriendRequest = useCallback(async (userId: string) => {
    const result = await friendsService.sendFriendRequest(userId);
    
    if (result.success) {
      toast({
        title: "Friend request sent",
        description: "Your friend request has been sent successfully.",
      });
      // Refresh data
      fetchData();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to send friend request.",
        variant: "destructive",
      });
    }
    
    return result;
  }, [toast, fetchData]);

  const respondToFriendRequest = useCallback(async (
    requestId: string, 
    response: 'accepted' | 'rejected'
  ) => {
    const result = await friendsService.respondToFriendRequest(requestId, response);
    
    if (result.success) {
      toast({
        title: response === 'accepted' ? "Friend request accepted" : "Friend request rejected",
        description: response === 'accepted' 
          ? "You are now friends!" 
          : "Friend request has been rejected.",
      });
      // Refresh data
      fetchData();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to respond to friend request.",
        variant: "destructive",
      });
    }
    
    return result;
  }, [toast, fetchData]);

  const cancelFriendRequest = useCallback(async (requestId: string) => {
    const result = await friendsService.cancelFriendRequest(requestId);
    
    if (result.success) {
      toast({
        title: "Friend request canceled",
        description: "Your friend request has been canceled.",
      });
      // Refresh data
      fetchData();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to cancel friend request.",
        variant: "destructive",
      });
    }
    
    return result;
  }, [toast, fetchData]);

  const removeFriend = useCallback(async (friendId: string) => {
    const result = await friendsService.removeFriend(friendId);
    
    if (result.success) {
      toast({
        title: "Friend removed",
        description: "Friend has been removed from your list.",
      });
      // Refresh data
      fetchData();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to remove friend.",
        variant: "destructive",
      });
    }
    
    return result;
  }, [toast, fetchData]);

  return {
    friends,
    friendRequests,
    loading,
    error,
    sendFriendRequest,
    respondToFriendRequest,
    cancelFriendRequest,
    removeFriend,
    refetch: fetchData
  };
};
