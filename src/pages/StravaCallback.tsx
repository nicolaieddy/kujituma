import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStravaConnection } from "@/hooks/useStravaConnection";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const buildAuthReturnTo = () => {
  const returnTo = `${window.location.pathname}${window.location.search}`;
  return `/auth?returnTo=${encodeURIComponent(returnTo)}`;
};

export default function StravaCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const { completeConnect, syncActivities } = useStravaConnection();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setStatus("error");
      setError("Authorization was denied or cancelled");
      return;
    }

    if (!code) {
      setStatus("error");
      setError("No authorization code received");
      return;
    }

    // The Strava callback may land on a different subdomain (www vs non-www).
    // Supabase sessions are stored per-domain, so we may need the user to sign in
    // again on this domain to complete the connection.
    if (!session) {
      setStatus("error");
      setError("Please sign in to finish connecting Strava");

      // Redirect to auth with returnTo so we come back to this exact callback URL.
      navigate(buildAuthReturnTo(), { replace: true });
      return;
    }

    const handleCallback = async () => {
      try {
        await completeConnect(code, state || "");
        setStatus("success");

        // Sync activities after successful connection
        await syncActivities();

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
  }, [searchParams, completeConnect, syncActivities, navigate, session, authLoading]);

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