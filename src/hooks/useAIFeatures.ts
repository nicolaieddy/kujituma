import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useAIFeatures = () => {
  const { user } = useAuth();
  const [aiEnabled, setAiEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAIStatus = async () => {
      if (!user) {
        setAiEnabled(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('ai_features_enabled')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching AI features status:', error);
          setAiEnabled(false);
        } else {
          setAiEnabled(data?.ai_features_enabled ?? false);
        }
      } catch (err) {
        console.error('Error fetching AI features status:', err);
        setAiEnabled(false);
      } finally {
        setLoading(false);
      }
    };

    fetchAIStatus();
  }, [user]);

  return { aiEnabled, loading };
};

// Admin function to toggle AI features for a user
export const toggleUserAIFeatures = async (userId: string, enabled: boolean) => {
  const { error } = await supabase
    .from('profiles')
    .update({ ai_features_enabled: enabled })
    .eq('id', userId);

  if (error) {
    throw error;
  }
  
  return true;
};
