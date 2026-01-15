import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const useAdminStatus = () => {
  const { user } = useAuth();

  const { data: isAdmin = false, isLoading: loading } = useQuery({
    queryKey: ['admin-status', user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
      
      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }
      return data === true;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 30, // 30 minutes - admin status rarely changes
    gcTime: 1000 * 60 * 60, // 1 hour
  });

  return { isAdmin, loading };
};
