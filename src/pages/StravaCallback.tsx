import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStravaConnection } from "@/hooks/useStravaConnection";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function StravaCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const { completeConnect, syncActivities } = useStravaConnection();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [hasProcessed, setHasProcessed] = useState(false);

  useEffect(() => {
    // Wait for auth to load
    if (authLoading) return;
    
    // Prevent double-processing
    if (hasProcessed) return;

    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");

    // Handle Strava errors
    if (errorParam) {
      setStatus("error");
      setError("Authorization was denied or cancelled");
      setHasProcessed(true);
      return;
    }

    // No code means invalid callback
    if (!code) {
      setStatus("error");
      setError("No authorization code received");
      setHasProcessed(true);
      return;
    }

    // If no session, user needs to log in first
    // This can happen if cookies aren't shared across domains
    if (!session) {
      setStatus("error");
      setError("Please log in and try connecting Strava again from your profile settings");
      setHasProcessed(true);
      return;
    }

    // Process the callback
    const handleCallback = async () => {
      setHasProcessed(true);
      
      try {
        await completeConnect(code);
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
  }, [searchParams, completeConnect, syncActivities, navigate, session, authLoading, hasProcessed]);

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
