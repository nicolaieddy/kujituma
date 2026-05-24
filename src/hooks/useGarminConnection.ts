import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const SUPABASE_URL = "https://yyidkpmrqvgvzbjvtnjy.supabase.co";

interface GarminConnection {
  garmin_user_id: string;
  connected_at: string;
  last_sync_at: string | null;
  scopes: string | null;
  last_error: string | null;
}

export function useGarminConnection() {
  const { user, session } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connection, setConnection] = useState<GarminConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const initiateConnect = useCallback(async () => {
    if (!session) {
      toast.error("Please log in to connect Garmin");
      return;
    }
    try {
      const redirectUri = `${window.location.origin}/garmin-callback`;
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/garmin-auth?action=authorize&redirect_uri=${encodeURIComponent(redirectUri)}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to get authorization URL");
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      console.error("Failed to initiate Garmin connection:", err);
      toast.error((err as Error).message || "Failed to connect Garmin");
    }
  }, [session]);

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
      console.error(err);
      toast.error("Failed to disconnect Garmin");
    }
  }, [session]);

  return {
    isConnected,
    connection,
    isLoading,
    initiateConnect,
    disconnect,
    refreshStatus: checkStatus,
  };
}
