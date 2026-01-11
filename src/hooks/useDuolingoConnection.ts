import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const SUPABASE_URL = "https://yyidkpmrqvgvzbjvtnjy.supabase.co";
const AUTO_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

// Global flag to track if auto-sync has been attempted this session
let globalAutoSyncAttempted = false;

export interface DuolingoConnection {
  id: string;
  user_id: string;
  duolingo_username: string;
  display_name: string | null;
  current_streak: number;
  total_xp: number;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SyncResult {
  success: boolean;
  streak: number;
  totalXp: number;
  streakMaintained: boolean;
  habitsCompleted: number;
}

export function useDuolingoConnection() {
  const { user, session } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connection, setConnection] = useState<DuolingoConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const connectionCheckedRef = useRef(false);
  const queryClient = useQueryClient();

  const checkConnectionStatus = useCallback(async () => {
    if (!user || connectionCheckedRef.current) {
      if (!user) setIsLoading(false);
      return;
    }

    connectionCheckedRef.current = true;

    try {
      const { data, error } = await supabase
        .from("duolingo_connections")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConnection(data as DuolingoConnection);
        setIsConnected(true);
      } else {
        setConnection(null);
        setIsConnected(false);
      }
    } catch (error) {
      console.error("Error checking Duolingo connection:", error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkConnectionStatus();
  }, [checkConnectionStatus]);

  const connect = useCallback(async (username: string): Promise<boolean> => {
    if (!session) {
      toast.error("Please log in first");
      return false;
    }

    setIsConnecting(true);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/duolingo-sync`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "connect", username }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.message || result.error || "Failed to connect");
        return false;
      }

      setConnection(result.connection);
      setIsConnected(true);
      toast.success(`Connected to Duolingo as ${result.duolingoUser.name || result.duolingoUser.username}!`);
      return true;
    } catch (error) {
      console.error("Error connecting to Duolingo:", error);
      toast.error("Failed to connect to Duolingo");
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [session]);

  const disconnect = useCallback(async () => {
    if (!session) return;

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/duolingo-sync`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "disconnect" }),
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect");
      }

      setConnection(null);
      setIsConnected(false);
      toast.success("Disconnected from Duolingo");
    } catch (error) {
      console.error("Error disconnecting from Duolingo:", error);
      toast.error("Failed to disconnect");
    }
  }, [session]);

  const syncActivities = useCallback(async (silent = false): Promise<SyncResult | null> => {
    if (!session) return null;

    setIsSyncing(true);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/duolingo-sync`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "sync" }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (!silent) {
          toast.error(result.message || result.error || "Sync failed");
        }
        return null;
      }

      // Update local connection state
      if (connection) {
        setConnection({
          ...connection,
          current_streak: result.streak,
          total_xp: result.totalXp,
          last_synced_at: new Date().toISOString(),
        });
      }

      if (!silent) {
        if (result.habitsCompleted > 0) {
          toast.success(`Synced ${result.habitsCompleted} habit${result.habitsCompleted > 1 ? 's' : ''} from Duolingo!`);
          queryClient.invalidateQueries({ queryKey: ["habit-completions"] });
        } else if (result.streakMaintained) {
          toast.success(`Duolingo synced! Streak: ${result.streak} 🔥`);
        } else {
          toast.info("Duolingo synced - no new completions");
        }
      } else {
        // Silent sync - still invalidate if habits completed
        if (result.habitsCompleted > 0) {
          queryClient.invalidateQueries({ queryKey: ["habit-completions"] });
        }
      }

      return result as SyncResult;
    } catch (error) {
      console.error("Error syncing Duolingo:", error);
      if (!silent) {
        toast.error("Failed to sync with Duolingo");
      }
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [session, connection, queryClient]);

  const syncActivitiesRef = useRef(syncActivities);
  syncActivitiesRef.current = syncActivities;

  // Auto-sync logic - runs once globally when connection is loaded and stale
  useEffect(() => {
    if (!isConnected || !connection || isLoading || globalAutoSyncAttempted) {
      return;
    }

    const shouldAutoSync = () => {
      if (!connection.last_synced_at) return true;
      
      const lastSync = new Date(connection.last_synced_at);
      const now = new Date();
      const timeSinceSync = now.getTime() - lastSync.getTime();
      
      return timeSinceSync > AUTO_SYNC_INTERVAL_MS;
    };

    if (shouldAutoSync()) {
      globalAutoSyncAttempted = true;
      console.log("[Duolingo] Auto-syncing (last sync was stale)");
      // Use ref to avoid dependency on syncActivities
      syncActivitiesRef.current(true);
    }
  }, [isConnected, connection, isLoading]);

  // Calculate time since last sync for display
  const getLastSyncDisplay = useCallback(() => {
    const lastSyncTime = connection?.last_synced_at;
    if (!lastSyncTime) return null;

    const lastSync = new Date(lastSyncTime);
    const now = new Date();
    const diffMs = now.getTime() - lastSync.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }, [connection?.last_synced_at]);

  return {
    isConnected,
    connection,
    isLoading,
    isConnecting,
    isSyncing,
    connect,
    disconnect,
    syncActivities,
    refreshConnection: checkConnectionStatus,
    lastSyncDisplay: getLastSyncDisplay(),
  };
}
