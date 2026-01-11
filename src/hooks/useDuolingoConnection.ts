import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const SUPABASE_URL = "https://yyidkpmrqvgvzbjvtnjy.supabase.co";

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
  const queryClient = useQueryClient();

  const checkConnectionStatus = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

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

  const syncActivities = useCallback(async (): Promise<SyncResult | null> => {
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
        toast.error(result.message || result.error || "Sync failed");
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

      if (result.habitsCompleted > 0) {
        toast.success(`Synced ${result.habitsCompleted} habit${result.habitsCompleted > 1 ? 's' : ''} from Duolingo!`);
        queryClient.invalidateQueries({ queryKey: ["habit-completions"] });
      } else if (result.streakMaintained) {
        toast.success(`Duolingo synced! Streak: ${result.streak} 🔥`);
      } else {
        toast.info("Duolingo synced - no new completions");
      }

      return result as SyncResult;
    } catch (error) {
      console.error("Error syncing Duolingo:", error);
      toast.error("Failed to sync with Duolingo");
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [session, connection, queryClient]);

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
  };
}
