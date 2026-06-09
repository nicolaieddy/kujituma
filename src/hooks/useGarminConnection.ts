import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";

const SUPABASE_URL = "https://yyidkpmrqvgvzbjvtnjy.supabase.co";

interface GarminConnection {
  garmin_user_id: string | null;
  connected_at: string;
  last_sync_at: string | null;
  last_login_at: string | null;
  last_error: string | null;
}

export function useGarminConnection() {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [connection, setConnection] = useState<GarminConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!user || !session) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/garmin-auth?action=status`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      if (res.ok) {
        const json = await res.json();
        setIsConnected(json.connected);
        setConnection(json.connection ?? null);
      }
    } catch (err) {
      console.error("Failed to check Garmin status:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, session]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const connect = useCallback(
    async (email: string, password: string) => {
      if (!session) {
        toast.error("Please log in to connect Garmin");
        return false;
      }
      setIsSubmitting(true);
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/garmin-auth?action=connect`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ email, password }),
          },
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to connect");
        if (json.rateLimited) {
          toast.success(
            "Garmin connected. They rate-limited the first sync — auto-sync will retry within ~6h.",
          );
        } else {
          toast.success("Garmin connected — pulling your data now");
        }
        await checkStatus();
        queryClient.invalidateQueries({ queryKey: qk.training.syncedActivities() });
        queryClient.invalidateQueries({ queryKey: qk.training.sleepEntries() });
        return true;
      } catch (err) {
        toast.error((err as Error).message);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [session, checkStatus, queryClient],
  );

  const syncNow = useCallback(async () => {
    if (!session) return;
    setIsSyncing(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/garmin-auth?action=sync-now`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );
      if (!res.ok) throw new Error("Sync failed");
      toast.success("Garmin sync complete");
      await checkStatus();
      queryClient.invalidateQueries({ queryKey: qk.training.syncedActivities() });
      queryClient.invalidateQueries({ queryKey: qk.training.sleepEntries() });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsSyncing(false);
    }
  }, [session, checkStatus, queryClient]);

  const disconnect = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/garmin-auth?action=disconnect`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );
      if (!res.ok) throw new Error("Failed to disconnect");
      setIsConnected(false);
      setConnection(null);
      toast.success("Garmin disconnected");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, [session]);

  return {
    isConnected,
    connection,
    isLoading,
    isSubmitting,
    isSyncing,
    connect,
    syncNow,
    disconnect,
    refreshStatus: checkStatus,
  };
}
