import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Activity as ActivityIcon, X } from "lucide-react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface SyncedActivityLite {
  id: string;
  activity_name: string;
  activity_type: string;
  start_date: string;
  distance_meters: number | null;
  duration_seconds: number | null;
}

function formatDistance(m: number | null | undefined) {
  if (!m) return "";
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

interface Props {
  value: string | null;
  onChange: (id: string | null) => void;
  /** YYYY-MM-DD — used to surface nearby activities first */
  anchorDate?: string | null;
}

export function ActivityLinkPicker({ value, onChange, anchorDate }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["synced-activities-link-picker", user?.id],
    queryFn: async (): Promise<SyncedActivityLite[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("synced_activities")
        .select("id, activity_name, activity_type, start_date, distance_meters, duration_seconds")
        .eq("user_id", user.id)
        .order("start_date", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as SyncedActivityLite[];
    },
    enabled: !!user,
    staleTime: 1000 * 60,
  });

  const sorted = useMemo(() => {
    if (!anchorDate) return activities;
    const anchor = parseISO(anchorDate);
    return [...activities].sort((a, b) => {
      const da = Math.abs(differenceInCalendarDays(parseISO(a.start_date), anchor));
      const db = Math.abs(differenceInCalendarDays(parseISO(b.start_date), anchor));
      return da - db;
    });
  }, [activities, anchorDate]);

  const selected = activities.find((a) => a.id === value) ?? null;

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="flex-1 justify-between font-normal"
          >
            <span className="flex items-center gap-2 min-w-0 truncate">
              <ActivityIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              {selected ? (
                <span className="truncate">
                  {selected.activity_name || selected.activity_type} ·{" "}
                  <span className="text-muted-foreground">
                    {format(parseISO(selected.start_date), "d MMM yyyy")}
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground">Link a workout (optional)</span>
              )}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search activities…" />
            <CommandList>
              <CommandEmpty>
                {isLoading ? "Loading…" : "No activities found."}
              </CommandEmpty>
              <CommandGroup>
                {sorted.slice(0, 100).map((a) => {
                  const isSel = a.id === value;
                  const dist = formatDistance(a.distance_meters);
                  return (
                    <CommandItem
                      key={a.id}
                      value={`${a.activity_name} ${a.activity_type} ${a.start_date}`}
                      onSelect={() => {
                        onChange(a.id);
                        setOpen(false);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", isSel ? "opacity-100" : "opacity-0")} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">
                          {a.activity_name || a.activity_type}
                        </div>
                        <div className="text-[11px] text-muted-foreground tabular-nums">
                          {format(parseISO(a.start_date), "d MMM yyyy")} · {a.activity_type}
                          {dist ? ` · ${dist}` : ""}
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onChange(null)}
          aria-label="Clear linked activity"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
