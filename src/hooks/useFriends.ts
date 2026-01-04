import { useState, useEffect, useCallback } from 'react';
import { friendsService, Friend, FriendRequest } from '@/services/friendsService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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