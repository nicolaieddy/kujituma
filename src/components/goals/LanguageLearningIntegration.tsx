import { useDuolingoConnection } from "@/hooks/useDuolingoConnection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, ExternalLink, RefreshCw, Link2, Loader2, Clock } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

interface LanguageLearningIntegrationProps {
  compact?: boolean;
}

export const LanguageLearningIntegration = ({ compact = false }: LanguageLearningIntegrationProps) => {
  const { 
    isConnected, 
    connection, 
    isLoading, 
    isConnecting, 
    isSyncing,
    connect, 
    syncActivities,
    lastSyncDisplay
  } = useDuolingoConnection();
  
  const [showConnect, setShowConnect] = useState(false);
  const [username, setUsername] = useState("");

  const handleConnect = async () => {
    if (!username.trim()) return;
    const success = await connect(username.trim());
    if (success) {
      setShowConnect(false);
      setUsername("");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Checking Duolingo...</span>
      </div>
    );
  }

  if (isConnected && connection) {
    if (compact) {
      return (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 bg-[#58CC02]/10 border-[#58CC02]/30 text-[#58CC02]">
            <Flame className="h-3 w-3" />
            {connection.current_streak} day streak
          </Badge>
          {lastSyncDisplay && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {lastSyncDisplay}
            </span>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 px-2 text-xs"
            onClick={() => syncActivities()}
            disabled={isSyncing}
          >
            {isSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-[#58CC02]/5 border border-[#58CC02]/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#58CC02] flex items-center justify-center">
            <span className="text-white font-bold text-lg">🦉</span>
          </div>
          <div>
            <p className="font-medium text-sm">{connection.display_name || connection.duolingo_username}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 text-[#FF9600]">
                <Flame className="h-3 w-3" />
                {connection.current_streak} day streak
              </span>
              <span>•</span>
              <span>{connection.total_xp?.toLocaleString() || 0} XP</span>
            </div>
            {lastSyncDisplay && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <Clock className="h-3 w-3" />
                Synced {lastSyncDisplay}
              </p>
            )}
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => syncActivities()}
          disabled={isSyncing}
          className="gap-1.5"
        >
          {isSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Sync
        </Button>
      </div>
    );
  }

  // Not connected state
  if (showConnect) {
    return (
      <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🦉</span>
          <div>
            <p className="font-medium text-sm">Connect Duolingo</p>
            <p className="text-xs text-muted-foreground">
              Your profile must be public on Duolingo
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Duolingo username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConnect()}
            className="h-9"
          />
          <Button 
            size="sm" 
            onClick={handleConnect}
            disabled={!username.trim() || isConnecting}
            className="bg-[#58CC02] hover:bg-[#58CC02]/90"
          >
            {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect"}
          </Button>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => setShowConnect(false)}
          >
            Cancel
          </Button>
        </div>
        <a 
          href="https://www.duolingo.com/settings/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          Make profile public <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg bg-gradient-to-r from-[#58CC02]/10 to-[#89E219]/10 border border-[#58CC02]/20">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🦉</span>
          <div>
            <p className="font-medium">Track with Duolingo</p>
            <p className="text-sm text-muted-foreground">
              Connect your account to auto-track your language learning streak
            </p>
          </div>
        </div>
        <Button 
          size="sm" 
          onClick={() => setShowConnect(true)}
          className="gap-1.5 bg-[#58CC02] hover:bg-[#58CC02]/90"
        >
          <Link2 className="h-4 w-4" />
          Connect
        </Button>
      </div>
    </div>
  );
};