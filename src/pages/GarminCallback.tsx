import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, CheckCircle2, XCircle, Watch } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const SUPABASE_URL = "https://yyidkpmrqvgvzbjvtnjy.supabase.co";

export default function GarminCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const isProcessing = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (isProcessing.current) return;

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setStatus("error");
      setError("Authorization was denied or cancelled");
      return;
    }
    if (!code || !state) {
      setStatus("error");
      setError("Missing authorization code");
      return;
    }
    if (!session) {
      setStatus("error");
      setError("Please log in and try connecting Garmin again from Profile → Integrations");
      return;
    }

    isProcessing.current = true;

    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/garmin-auth?action=callback&code=${encodeURIComponent(
            code,
          )}&state=${encodeURIComponent(state)}`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
          },
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to complete connection");
        }
        setStatus("success");
        setTimeout(() => navigate("/profile?tab=integrations", { replace: true }), 2000);
      } catch (err) {
        console.error("Failed to complete Garmin connection:", err);
        setStatus("error");
        setError((err as Error).message || "Failed to connect Garmin");
      }
    })();
  }, [searchParams, navigate, session, authLoading]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Watch className="h-12 w-12 text-[#007CC3]" />
          </div>
          <CardTitle>
            {status === "loading" && "Connecting Garmin..."}
            {status === "success" && "Garmin Connected!"}
            {status === "error" && "Connection Failed"}
          </CardTitle>
          <CardDescription>
            {status === "loading" && "Please wait while we complete the connection"}
            {status === "success" && "Your activities and sleep will now stream in automatically"}
            {status === "error" && (error || "Something went wrong")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === "loading" && <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />}
          {status === "success" && <CheckCircle2 className="h-12 w-12 text-green-500" />}
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
