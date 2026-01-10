import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SUPABASE_URL = "https://yyidkpmrqvgvzbjvtnjy.supabase.co";

interface StravaConnection {
  strava_athlete_id: number;
  athlete_firstname: string | null;
  athlete_lastname: string | null;
  created_at: string;
  updated_at: string;
}

interface SyncResult {
  success: boolean;
  activities?: number;
  synced?: number;
  matched?: number;
  skipped?: number;
  error?: string;
}

export function useStravaConnection() {
  const { user, session } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connection, setConnection] = useState<StravaConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const checkConnectionStatus = useCallback(async () => {
    if (!user || !session) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("strava-auth", {
        body: null,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        method: "GET",
      });

      // Parse URL params to call with action=status
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/strava-auth?action=status`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        setIsConnected(result.connected);
        setConnection(result.connection);
      }
    } catch (error) {
      console.error("Failed to check Strava status:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, session]);

  useEffect(() => {
    checkConnectionStatus();
  }, [checkConnectionStatus]);

  const initiateConnect = useCallback(async () => {
    if (!session) {
      toast.error("Please log in to connect Strava");
      return;
    }

    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/strava-auth?action=authorize&redirect_uri=${encodeURIComponent(window.location.origin + "/strava-callback")}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get authorization URL");
      }

      const { url, state } = await response.json();
      
      // Store state for CSRF verification
      sessionStorage.setItem("strava_oauth_state", state);
      
      // Redirect to Strava
      window.location.href = url;
    } catch (error) {
      console.error("Failed to initiate Strava connection:", error);
      toast.error("Failed to connect to Strava");
    }
  }, [session]);

  const completeConnect = useCallback(async (code: string, state: string) => {
    if (!session) {
      throw new Error("Not authenticated");
    }

    // Verify state
    const storedState = sessionStorage.getItem("strava_oauth_state");
    if (storedState && storedState !== state) {
      throw new Error("Invalid state parameter");
    }
    sessionStorage.removeItem("strava_oauth_state");

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/strava-auth?action=callback&code=${code}`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to complete connection");
    }

    const result = await response.json();
    await checkConnectionStatus();
    return result;
  }, [session, checkConnectionStatus]);

  const disconnect = useCallback(async () => {
    if (!session) {
      toast.error("Please log in first");
      return;
    }

    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/strava-auth?action=disconnect`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to disconnect");
      }

      setIsConnected(false);
      setConnection(null);
      toast.success("Strava disconnected");
    } catch (error) {
      console.error("Failed to disconnect Strava:", error);
      toast.error("Failed to disconnect Strava");
    }
  }, [session]);

  const syncActivities = useCallback(async (): Promise<SyncResult> => {
    if (!session) {
      return { success: false, error: "Not authenticated" };
    }

    setIsSyncing(true);

    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/strava-sync`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Sync failed");
      }

      if (result.matched > 0) {
        toast.success(`Synced ${result.matched} workout${result.matched > 1 ? "s" : ""} from Strava!`);
      } else if (result.synced > 0) {
        toast.info(`Found ${result.synced} activities, but none matched your habit mappings`);
      } else {
        toast.info("No new activities to sync");
      }

      return result;
    } catch (error) {
      console.error("Failed to sync Strava activities:", error);
      toast.error("Failed to sync Strava activities");
      return { success: false, error: (error as Error).message };
    } finally {
      setIsSyncing(false);
    }
  }, [session]);

  return {
    isConnected,
    connection,
    isLoading,
    isSyncing,
    initiateConnect,
    completeConnect,
    disconnect,
    syncActivities,
    refreshStatus: checkConnectionStatus,
  };
}