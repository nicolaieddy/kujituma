import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Globe, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface TimezoneFieldProps {
  userId?: string;
}

export const TimezoneField = ({ userId }: TimezoneFieldProps) => {
  const [storedTz, setStoredTz] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("profiles")
      .select("timezone")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        setStoredTz(data?.timezone || null);
      });
  }, [userId]);

  const handleUpdate = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await supabase
        .from("profiles")
        .update({ timezone: browserTz })
        .eq("id", userId);
      setStoredTz(browserTz);
      toast.success("Timezone updated", {
        description: `Set to ${browserTz}. Future uploads will use this timezone.`,
      });
    } catch {
      toast.error("Failed to update timezone");
    } finally {
      setLoading(false);
    }
  };

  const isDifferent = storedTz && storedTz !== browserTz;

  return (
    <div className="space-y-1.5">
      <Label className="text-foreground flex items-center gap-1.5">
        <Globe className="h-3.5 w-3.5" />
        Timezone
      </Label>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {storedTz || "Not set"}
        </span>
        {(isDifferent || !storedTz) && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUpdate}
            disabled={loading}
            className="h-7 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            {loading ? "Updating..." : `Update to ${browserTz}`}
          </Button>
        )}
      </div>
      {isDifferent && (
        <p className="text-xs text-muted-foreground">
          Your browser is in <strong>{browserTz}</strong> but your profile uses <strong>{storedTz}</strong>. 
          Updating won't change dates on existing activities.
        </p>
      )}
    </div>
  );
};
