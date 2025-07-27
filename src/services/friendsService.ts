import { supabase } from '@/integrations/supabase/client';

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
  sender_profile?: {
    full_name: string;
    avatar_url?: string;
    email: string;
  };
  receiver_profile?: {
    full_name: string;
    avatar_url?: string;
    email: string;
  };
}

export interface Friend {
  friend_id: string;
  full_name: string;
  avatar_url?: string;
  email: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  about_me?: string;
  linkedin_url?: string;
  is_friend?: boolean;
  friend_request_status?: 'sent' | 'received' | null;
}

class FriendsService {
  // Send a friend request
  async sendFriendRequest(receiverId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('send_friend_request', {
        _receiver_id: receiverId
      });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to send friend request' 
      };
    }
  }

  // Respond to a friend request
  async respondToFriendRequest(
    requestId: string, 
    response: 'accepted' | 'rejected'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('respond_to_friend_request', {
        _request_id: requestId,
        _response: response
      });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error responding to friend request:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to respond to friend request' 
      };
    }
  }

  // Remove a friend
  async removeFriend(friendId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('remove_friend', {
        _friend_id: friendId
      });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error removing friend:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to remove friend' 
      };
    }
  }

  // Get user's friends
  async getFriends(userId?: string): Promise<Friend[]> {
    try {
      const { data, error } = await supabase.rpc('get_user_friends', {
        _user_id: userId
      });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error: any) {
      console.error('Error fetching friends:', error);
      return [];
    }
  }

  // Get pending friend requests (sent and received)
  async getFriendRequests(): Promise<{
    sent: FriendRequest[];
    received: FriendRequest[];
  }> {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return { sent: [], received: [] };

      const { data: sentRequests, error: sentError } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('sender_id', currentUser.user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      const { data: receivedRequests, error: receivedError } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('receiver_id', currentUser.user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (sentError) throw sentError;
      if (receivedError) throw receivedError;

      // Fetch profiles separately
      const sentWithProfiles = await Promise.all(
        (sentRequests || []).map(async (request) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, email')
            .eq('id', request.receiver_id)
            .single();
          
          return {
            ...request,
            receiver_profile: profile
          } as FriendRequest;
        })
      );

      const receivedWithProfiles = await Promise.all(
        (receivedRequests || []).map(async (request) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, email')
            .eq('id', request.sender_id)
            .single();
          
          return {
            ...request,
            sender_profile: profile
          } as FriendRequest;
        })
      );

      return {
        sent: sentWithProfiles,
        received: receivedWithProfiles
      };
    } catch (error: any) {
      console.error('Error fetching friend requests:', error);
      return { sent: [], received: [] };
    }
  }

  // Search for users (excluding friends and pending requests)
  async searchUsers(query: string): Promise<UserProfile[]> {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return [];

      // Get user's friends and pending requests
      const [friends, friendRequests] = await Promise.all([
        this.getFriends(),
        this.getFriendRequests()
      ]);

      const friendIds = friends.map(f => f.friend_id);
      const sentRequestIds = friendRequests.sent.map(r => r.receiver_id);
      const receivedRequestIds = friendRequests.received.map(r => r.sender_id);
      const excludeIds = [
        currentUser.user.id,
        ...friendIds,
        ...sentRequestIds,
        ...receivedRequestIds
      ];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, about_me, linkedin_url')
        .ilike('full_name', `%${query}%`)
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .limit(20);

      if (error) throw error;

      return data || [];
    } catch (error: any) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  // Check if users are friends
  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('are_friends', {
        _user1_id: userId1,
        _user2_id: userId2
      });

      if (error) throw error;
      return data || false;
    } catch (error: any) {
      console.error('Error checking friendship:', error);
      return false;
    }
  }

  // Get friendship status for a user (for profile pages)
  async getFriendshipStatus(userId: string): Promise<{
    is_friend: boolean;
    friend_request_status?: 'sent' | 'received';
    request_id?: string;
  }> {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        return { is_friend: false };
      }

      // Check if they're friends
      const areFriends = await this.areFriends(currentUser.user.id, userId);
      if (areFriends) {
        return { is_friend: true };
      }

      // Check for pending friend requests
      const { data: pendingRequest, error } = await supabase
        .from('friend_requests')
        .select('id, sender_id, receiver_id')
        .or(`and(sender_id.eq.${currentUser.user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUser.user.id})`)
        .eq('status', 'pending')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (pendingRequest) {
        const status = pendingRequest.sender_id === currentUser.user.id ? 'sent' : 'received';
        return {
          is_friend: false,
          friend_request_status: status,
          request_id: pendingRequest.id
        };
      }

      return { is_friend: false };
    } catch (error: any) {
      console.error('Error getting friendship status:', error);
      return { is_friend: false };
    }
  }

  // Get friend count for a user
  async getFriendCount(userId: string): Promise<number> {
    try {
      const friends = await this.getFriends(userId);
      return friends.length;
    } catch (error: any) {
      console.error('Error getting friend count:', error);
      return 0;
    }
  }
}

export const friendsService = new FriendsService();