import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGarminConnection } from "@/hooks/useGarminConnection";
import {
  Loader2,
  Unlink,
  Watch,
  Clock,
  RefreshCw,
  ShieldAlert,
  AlarmClock,
} from "lucide-react";
import { formatDistanceToNow, formatDistanceToNowStrict } from "date-fns";
import { SyncRunLogPanel } from "@/components/sync/SyncRunLogPanel";

// Garmin typically throttles for 2–6h after a 429. We use 2h as the floor.
const COOLDOWN_MS = 2 * 60 * 60 * 1000;
const COOLDOWN_KEY = "garmin:cooldownUntil";

function detectRateLimit(msg?: string | null): boolean {
  if (!msg) return false;
  return /\b429\b|too many requests|rate limit/i.test(msg);
}

export function GarminConnectionCard() {
  const {
    isConnected,
    connection,
    isLoading,
    isSubmitting,
    isSyncing,
    connect,
    syncNow,
    disconnect,
  } = useGarminConnection();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [localCooldown, setLocalCooldown] = useState<number | null>(() => {
    const v = Number(localStorage.getItem(COOLDOWN_KEY) ?? 0);
    return v > Date.now() ? v : null;
  });

  // Tick every 15s so the countdown stays fresh
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(id);
  }, []);

  // Derive cooldown from server-side last_error + last_login_at
  const serverCooldown = useMemo(() => {
    if (!connection?.last_error || !detectRateLimit(connection.last_error)) {
      return null;
    }
    const anchor = connection.last_login_at ?? connection.last_sync_at;
    if (!anchor) return null;
    const end = new Date(anchor).getTime() + COOLDOWN_MS;
    return end > Date.now() ? end : null;
  }, [connection?.last_error, connection?.last_login_at, connection?.last_sync_at]);

  const cooldownUntil = Math.max(serverCooldown ?? 0, localCooldown ?? 0) || null;
  const inCooldown = !!cooldownUntil && cooldownUntil > now;

  // Persist new local cooldown if server signals one
  useEffect(() => {
    if (serverCooldown && serverCooldown > (localCooldown ?? 0)) {
      localStorage.setItem(COOLDOWN_KEY, String(serverCooldown));
      setLocalCooldown(serverCooldown);
    }
  }, [serverCooldown, localCooldown]);

  // Clear stale cooldown
  useEffect(() => {
    if (localCooldown && localCooldown <= now) {
      localStorage.removeItem(COOLDOWN_KEY);
      setLocalCooldown(null);
    }
  }, [localCooldown, now]);

  const handleSync = async () => {
    if (inCooldown) return;
    try {
      await syncNow();
    } finally {
      // Re-check after sync — if server reports a fresh 429, the next render picks it up.
      // As a safety net, optimistically set a local cooldown if the connection error contains 429.
      // (Status will refresh via syncNow's checkStatus call.)
    }
  };

  // Watch for fresh 429 surfacing post-sync — bump local cooldown
  useEffect(() => {
    if (detectRateLimit(connection?.last_error)) {
      const end = Date.now() + COOLDOWN_MS;
      const prev = Number(localStorage.getItem(COOLDOWN_KEY) ?? 0);
      if (end > prev) {
        localStorage.setItem(COOLDOWN_KEY, String(end));
        setLocalCooldown(end);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection?.last_error]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await connect(email, password);
    if (ok) {
      setEmail("");
      setPassword("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Watch className="h-5 w-5 text-[#007CC3]" />
          Garmin
        </CardTitle>
        <CardDescription>
          Auto-sync your activities and sleep from Garmin Connect every couple
          of hours.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected && connection ? (
          <>
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
              <div>
                <p className="font-medium text-sm">Garmin connected</p>
                <p className="text-xs text-muted-foreground">
                  Linked{" "}
                  {formatDistanceToNow(new Date(connection.connected_at), {
                    addSuffix: true,
                  })}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />
                  {connection.last_sync_at
                    ? `Last sync ${formatDistanceToNow(new Date(connection.last_sync_at), { addSuffix: true })}`
                    : "Waiting for first sync"}
                </p>
              </div>
              <div
                className="flex h-2 w-2 rounded-full bg-emerald-500"
                title="Connected"
              />
            </div>

            {inCooldown ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 flex gap-2">
                <AlarmClock className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Garmin rate-limited this account.</strong> Manual sync
                  is paused to avoid extending the throttle. You can retry in{" "}
                  <span className="font-medium">
                    {formatDistanceToNowStrict(new Date(cooldownUntil!))}
                  </span>
                  . The scheduled 6h sync will also auto-retry.
                </div>
              </div>
            ) : (
              connection.last_error && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                  {connection.last_error}
                </div>
              )
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={isSyncing || inCooldown}
                title={
                  inCooldown
                    ? `Cooldown — retry in ${formatDistanceToNowStrict(new Date(cooldownUntil!))}`
                    : undefined
                }
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {inCooldown ? "Cooldown" : "Sync now"}
              </Button>
              <Button variant="ghost" size="sm" onClick={disconnect}>
                <Unlink className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </div>

            <SyncRunLogPanel provider="garmin" title="Garmin sync history" />
          </>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 flex gap-2">
              <ShieldAlert className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Unofficial bridge.</strong> Your Garmin email + password
                are encrypted at rest and only used server-side to log in.
                Requires 2FA off. We'll swap to the official Garmin API once
                approved.
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="garmin-email">Garmin email</Label>
              <Input
                id="garmin-email"
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="garmin-password">Garmin password</Label>
              <Input
                id="garmin-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              style={{ backgroundColor: "#007CC3", color: "white" }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Watch className="h-4 w-4 mr-2" />
              )}
              Connect Garmin
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
