import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const SUPABASE_URL = "https://yyidkpmrqvgvzbjvtnjy.supabase.co";

export default function StravaCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  
  // Use ref to prevent double-processing (React Strict Mode, race conditions)
  const isProcessing = useRef(false);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;
    
    // Prevent double-processing
    if (isProcessing.current) return;

    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");

    // Handle Strava errors
    if (errorParam) {
      setStatus("error");
      setError("Authorization was denied or cancelled");
      return;
    }

    // No code means invalid callback
    if (!code) {
      setStatus("error");
      setError("No authorization code received");
      return;
    }

    // If no session, user needs to log in first
    if (!session) {
      setStatus("error");
      setError("Please log in and try connecting Strava again from your profile settings");
      return;
    }

    // Mark as processing immediately
    isProcessing.current = true;

    const handleCallback = async () => {
      try {
        // Exchange code for tokens
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/strava-auth?action=callback&code=${encodeURIComponent(code)}`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to complete connection");
        }

        setStatus("success");

        // Try to sync activities (non-blocking)
        try {
          await fetch(`${SUPABASE_URL}/functions/v1/strava-sync`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
          });
        } catch (syncError) {
          console.warn("Initial sync failed, user can retry later:", syncError);
        }

        // Redirect after a short delay
        setTimeout(() => {
          navigate("/profile?tab=integrations", { replace: true });
        }, 2000);
      } catch (err) {
        console.error("Failed to complete Strava connection:", err);
        setStatus("error");
        setError((err as Error).message || "Failed to connect Strava");
      }
    };

    handleCallback();
  }, [searchParams, navigate, session, authLoading]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <svg viewBox="0 0 24 24" className="h-12 w-12" fill="#FC4C02">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
          </div>
          <CardTitle>
            {status === "loading" && "Connecting Strava..."}
            {status === "success" && "Strava Connected!"}
            {status === "error" && "Connection Failed"}
          </CardTitle>
          <CardDescription>
            {status === "loading" && "Please wait while we complete the connection"}
            {status === "success" && "Your workouts will now sync automatically"}
            {status === "error" && (error || "Something went wrong")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === "loading" && (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          )}
          
          {status === "success" && (
            <CheckCircle2 className="h-12 w-12 text-green-500" />
          )}
          
          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 text-destructive" />
              <Button onClick={() => navigate("/profile?tab=integrations", { replace: true })}>
                Back to Settings
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
