// Shared per-run sync logger. Writes a single row to public.sync_run_logs at the end
// of a sync run. Edge functions accumulate per-item details + counters via addItem /
// incCounter and call finalize() before returning.

type SupabaseClient = {
  from: (table: string) => any;
};

export interface SyncItem {
  /** what was attempted: 'activity' | 'fit_file' | 'sleep' | 'wellness' | 'body' | 'auth' | 'session' | 'file' */
  kind: string;
  /** human-readable identifier (activity id, date, filename, athlete id) */
  ref?: string | null;
  /** did this item succeed? */
  ok: boolean;
  /** machine-readable status: 'created' | 'updated' | 'skipped' | 'duplicate' | 'rate_limited' | 'failed' */
  status?: string;
  /** short, user-visible message (success summary or failure reason) */
  message?: string | null;
  /** optional structured summary (e.g. name, type, distance, duration, dates) */
  summary?: Record<string, unknown> | null;
}

export type RunStatus = "success" | "partial" | "failed" | "rate_limited" | "running";

export class SyncRunLogger {
  private items: SyncItem[] = [];
  private counters: Record<string, number> = {};
  private startedAt = Date.now();

  constructor(
    private admin: SupabaseClient,
    private userId: string,
    private provider: "garmin" | "strava" | "fit_upload" | "sleep_csv",
    private trigger: "manual" | "scheduled" | "upload" | "webhook" = "manual",
  ) {}

  addItem(item: SyncItem) {
    // Cap per-run items to avoid bloating jsonb (most syncs are well under 200)
    if (this.items.length < 500) this.items.push(item);
  }

  incCounter(key: string, by = 1) {
    this.counters[key] = (this.counters[key] ?? 0) + by;
  }

  setCounter(key: string, value: number) {
    this.counters[key] = value;
  }

  async finalize(status: RunStatus, error?: string | null): Promise<string | null> {
    const finishedAt = new Date();
    const row = {
      user_id: this.userId,
      provider: this.provider,
      trigger: this.trigger,
      status,
      started_at: new Date(this.startedAt).toISOString(),
      finished_at: finishedAt.toISOString(),
      duration_ms: Date.now() - this.startedAt,
      counters: this.counters,
      items: this.items,
      error: error ?? null,
    };
    try {
      const { data, error: insertError } = await this.admin
        .from("sync_run_logs")
        .insert(row)
        .select("id")
        .single();
      if (insertError) {
        console.warn("[sync-logger] failed to record run:", insertError.message);
        return null;
      }
      // Best-effort prune of >30d entries for this user
      try {
        const cutoff = new Date(Date.now() - 30 * 86400_000).toISOString();
        await this.admin
          .from("sync_run_logs")
          .delete()
          .eq("user_id", this.userId)
          .lt("started_at", cutoff);
      } catch (e) {
        // non-fatal
      }
      return data?.id ?? null;
    } catch (e) {
      console.warn("[sync-logger] insert threw:", (e as Error).message);
      return null;
    }
  }
}
