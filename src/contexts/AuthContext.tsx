
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isNewUser: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  markProfileComplete: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  // Check if user's profile is complete
  const checkProfileComplete = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_profile_complete')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('[AuthContext] Error checking profile:', error);
        return;
      }
      
      setIsNewUser(!data?.is_profile_complete);
    } catch (error) {
      console.error('[AuthContext] Error checking profile complete:', error);
    }
  }, []);

  useEffect(() => {
    console.log('[AuthContext] Initializing auth...');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[AuthContext] Auth state changed:', event, 'User:', session?.user?.email);
        
        // Handle token errors by clearing invalid sessions
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.log('[AuthContext] Token refresh failed, clearing session');
          setSession(null);
          setUser(null);
          setIsNewUser(false);
          setLoading(false);
          return;
        }
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setIsNewUser(false);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Check profile completion after auth state change (defer to avoid deadlock)
        if (session?.user) {
          setTimeout(() => {
            checkProfileComplete(session.user.id);
          }, 0);
        } else {
          setIsNewUser(false);
        }
      }
    );

    // THEN get initial session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.error('[AuthContext] Error getting session:', error);
        // Clear any invalid session state on error
        if (error.message?.includes('invalid') || error.message?.includes('expired') || error.message?.includes('signature')) {
          console.log('[AuthContext] Invalid/expired/corrupt session, clearing local storage and signing out');
          // Clear all Supabase auth data from localStorage to prevent redirect loops
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-') || key.includes('supabase')) {
              localStorage.removeItem(key);
            }
          });
          try {
            await supabase.auth.signOut({ scope: 'local' });
          } catch (signOutError) {
            console.error('[AuthContext] Error during signOut cleanup:', signOutError);
          }
        }
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }
      console.log('[AuthContext] Initial session:', session?.user?.email || 'No session');
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Check profile completion for initial session
      if (session?.user) {
        checkProfileComplete(session.user.id);
      }
    });

    return () => {
      console.log('[AuthContext] Cleaning up subscription');
      subscription.unsubscribe();
    };
  }, [checkProfileComplete]);

  const signInWithGoogle = useCallback(async () => {
    try {
      // Use the current origin for redirect to ensure we go back to the same site
      const redirectUrl = `${window.location.origin}/`;
      console.log('[AuthContext] Starting Google OAuth with redirect to:', redirectUrl);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });
      
      if (error) {
        console.error('Google sign in error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in signInWithGoogle:', error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        console.error('Error signing out:', error);
        throw error;
      }
      // Force page reload for clean state and redirect to home
      window.location.href = '/';
    } catch (error) {
      console.error('Error in signOut:', error);
      throw error;
    }
  }, []);

  const markProfileComplete = useCallback(() => {
    setIsNewUser(false);
  }, []);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    isNewUser,
    signInWithGoogle,
    signOut,
    markProfileComplete,
  }), [user, session, loading, isNewUser, signInWithGoogle, signOut, markProfileComplete]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
