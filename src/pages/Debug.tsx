import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Trash2, Copy, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface StoredError {
  message: string;
  stack?: string;
  componentStack?: string;
  time: string;
  path: string;
}

interface NetworkFailure {
  url: string;
  status: number;
  statusText: string;
  time: string;
  method: string;
}

const Debug = () => {
  const { user, session, loading } = useAuth();
  const [lastError, setLastError] = useState<StoredError | null>(null);
  const [networkFailures, setNetworkFailures] = useState<NetworkFailure[]>([]);
  const [supabaseSession, setSupabaseSession] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Load last error from localStorage
    try {
      const stored = localStorage.getItem("app:lastError");
      if (stored) {
        setLastError(JSON.parse(stored));
      }
    } catch {
      // ignore
    }

    // Load network failures from localStorage
    try {
      const stored = localStorage.getItem("app:networkFailures");
      if (stored) {
        setNetworkFailures(JSON.parse(stored));
      }
    } catch {
      // ignore
    }

    // Get fresh Supabase session
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("[Debug] getSession error:", error);
      }
      setSupabaseSession(data.session);
    });
  }, []);

  const clearLastError = () => {
    localStorage.removeItem("app:lastError");
    setLastError(null);
    toast({ title: "Cleared", description: "Last error cleared from storage." });
  };

  const clearNetworkFailures = () => {
    localStorage.removeItem("app:networkFailures");
    setNetworkFailures([]);
    toast({ title: "Cleared", description: "Network failures cleared from storage." });
  };

  const refreshSession = async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSupabaseSession(data.session);
      toast({ title: "Refreshed", description: "Session refreshed successfully." });
    }
  };

  const copyDebugInfo = () => {
    const info = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      online: navigator.onLine,
      authContext: {
        loading,
        hasUser: !!user,
        userId: user?.id,
        email: user?.email,
      },
      supabaseSession: supabaseSession ? {
        hasSession: true,
        userId: supabaseSession.user?.id,
        expiresAt: supabaseSession.expires_at,
        tokenType: supabaseSession.token_type,
      } : null,
      lastError,
      networkFailures: networkFailures.slice(0, 5),
    };
    navigator.clipboard.writeText(JSON.stringify(info, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied", description: "Debug info copied to clipboard." });
  };

  const StatusBadge = ({ ok, label }: { ok: boolean; label: string }) => (
    <Badge variant={ok ? "default" : "destructive"} className="gap-1">
      {ok ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label}
    </Badge>
  );

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Debug Dashboard</h1>
            <p className="text-sm text-muted-foreground">Diagnostic information for troubleshooting</p>
          </div>
          <Button onClick={copyDebugInfo} variant="outline" className="gap-2">
            {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy All"}
          </Button>
        </div>

        {/* Quick Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Quick Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <StatusBadge ok={navigator.onLine} label={navigator.onLine ? "Online" : "Offline"} />
            <StatusBadge ok={!loading} label={loading ? "Auth Loading" : "Auth Ready"} />
            <StatusBadge ok={!!user} label={user ? "Logged In" : "Not Logged In"} />
            <StatusBadge ok={!!supabaseSession} label={supabaseSession ? "Session Active" : "No Session"} />
            <StatusBadge ok={!lastError} label={lastError ? "Has Error" : "No Errors"} />
          </CardContent>
        </Card>

        {/* Auth Context */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              Auth Context
              <Badge variant="outline" className="text-xs">{loading ? "loading" : "ready"}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Loading:</span>
              <span className="font-mono">{String(loading)}</span>
              <span className="text-muted-foreground">User ID:</span>
              <span className="font-mono text-xs break-all">{user?.id || "null"}</span>
              <span className="text-muted-foreground">Email:</span>
              <span className="font-mono">{user?.email || "null"}</span>
              <span className="text-muted-foreground">Has Session Object:</span>
              <span className="font-mono">{String(!!session)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Supabase Session */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Supabase Session</CardTitle>
              <Button size="sm" variant="ghost" onClick={refreshSession} className="gap-1">
                <RefreshCw className="h-3 w-3" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {supabaseSession ? (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">User ID:</span>
                <span className="font-mono text-xs break-all">{supabaseSession.user?.id}</span>
                <span className="text-muted-foreground">Email:</span>
                <span className="font-mono">{supabaseSession.user?.email}</span>
                <span className="text-muted-foreground">Expires At:</span>
                <span className="font-mono">{new Date(supabaseSession.expires_at * 1000).toLocaleString()}</span>
                <span className="text-muted-foreground">Token Type:</span>
                <span className="font-mono">{supabaseSession.token_type}</span>
                <span className="text-muted-foreground">Provider:</span>
                <span className="font-mono">{supabaseSession.user?.app_metadata?.provider || "unknown"}</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No active Supabase session.</p>
            )}
          </CardContent>
        </Card>

        {/* Last Error */}
        <Card className={lastError ? "border-destructive/50" : ""}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                {lastError && <AlertCircle className="h-4 w-4 text-destructive" />}
                Last Error
              </CardTitle>
              {lastError && (
                <Button size="sm" variant="ghost" onClick={clearLastError} className="gap-1 text-destructive">
                  <Trash2 className="h-3 w-3" />
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {lastError ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Time:</span>
                  <span className="font-mono">{new Date(lastError.time).toLocaleString()}</span>
                  <span className="text-muted-foreground">Path:</span>
                  <span className="font-mono">{lastError.path}</span>
                </div>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Message:</p>
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-32">{lastError.message}</pre>
                </div>
                {lastError.stack && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Stack:</p>
                    <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">{lastError.stack}</pre>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No errors recorded.</p>
            )}
          </CardContent>
        </Card>

        {/* Network Failures */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Network Failures</CardTitle>
              {networkFailures.length > 0 && (
                <Button size="sm" variant="ghost" onClick={clearNetworkFailures} className="gap-1">
                  <Trash2 className="h-3 w-3" />
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {networkFailures.length > 0 ? (
              <div className="space-y-2">
                {networkFailures.slice(0, 10).map((failure, i) => (
                  <div key={i} className="text-xs bg-muted p-2 rounded space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">{failure.status}</Badge>
                      <span className="font-mono">{failure.method}</span>
                      <span className="text-muted-foreground truncate flex-1">{failure.url}</span>
                    </div>
                    <p className="text-muted-foreground">{new Date(failure.time).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No network failures recorded. Note: failures are only tracked if instrumented.</p>
            )}
          </CardContent>
        </Card>

        {/* Environment */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Environment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">URL:</span>
              <span className="font-mono text-xs break-all">{window.location.href}</span>
              <span className="text-muted-foreground">User Agent:</span>
              <span className="font-mono text-xs break-all">{navigator.userAgent}</span>
              <span className="text-muted-foreground">Online:</span>
              <span className="font-mono">{String(navigator.onLine)}</span>
              <span className="text-muted-foreground">Timestamp:</span>
              <span className="font-mono">{new Date().toISOString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reload Page
            </Button>
            <Button variant="outline" onClick={() => window.location.href = "/"}>
              Go to Home
            </Button>
            <Button variant="outline" onClick={() => window.location.href = "/auth"}>
              Go to Auth
            </Button>
            <Button 
              variant="destructive" 
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/auth";
              }}
            >
              Force Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Debug;
