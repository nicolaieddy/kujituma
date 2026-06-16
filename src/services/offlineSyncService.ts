import { get, set, del } from 'idb-keyval';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface QueuedMutation {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  attempts?: number;
  lastError?: string;
  nextAttemptAt?: number;
}

const QUEUE_KEY = 'offline_sync_queue';

// Exponential backoff configuration
const BASE_DELAY_MS = 2_000; // 2s
const MAX_DELAY_MS = 5 * 60 * 1000; // 5 min cap
const MAX_ATTEMPTS = 8; // ~ up to ~5 min between tries, gives up after 8

function computeBackoff(attempts: number): number {
  // exp backoff with jitter
  const exp = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * Math.pow(2, attempts - 1));
  const jitter = Math.random() * 0.3 * exp;
  return exp + jitter;
}

function isTransientError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('timeout') || msg.includes('failed to fetch')) {
    return true;
  }
  // Supabase / PostgREST style: retry on 5xx + 408/429
  const code = err.status ?? err.statusCode;
  if (typeof code === 'number') {
    if (code >= 500) return true;
    if (code === 408 || code === 429) return true;
    return false;
  }
  // Unknown errors -> treat as transient (we'll still cap attempts)
  return true;
}

class OfflineSyncService {
  private isOnline = navigator.onLine;
  private isSyncing = false;
  private listeners: Set<() => void> = new Set();
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processQueue();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.clearRetryTimer();
    });
    // Kick a retry pass on load in case of pending queued mutations
    if (this.isOnline) {
      setTimeout(() => this.processQueue(), 1_000);
    }
  }

  // Subscribe to queue changes
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  private clearRetryTimer() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private scheduleNextRetry(queue: QueuedMutation[]) {
    this.clearRetryTimer();
    const now = Date.now();
    const upcoming = queue
      .map(m => m.nextAttemptAt ?? now)
      .filter(t => t > now);
    if (upcoming.length === 0) return;
    const next = Math.min(...upcoming);
    const delay = Math.max(500, next - now);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.processQueue();
    }, delay);
  }

  // Add a mutation to the queue with toast notification
  async queueMutation(mutation: Omit<QueuedMutation, 'id' | 'timestamp'>): Promise<void> {
    const queue = await this.getQueue();
    const newMutation: QueuedMutation = {
      ...mutation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      attempts: 0,
      nextAttemptAt: Date.now(),
    };
    queue.push(newMutation);
    await set(QUEUE_KEY, queue);
    this.notifyListeners();
    console.log('Queued offline mutation:', newMutation);

    toast({
      title: "Saved offline",
      description: "Your change will sync when you're back online.",
    });

    // If we're online, try syncing now
    if (this.isOnline) this.processQueue();
  }

  async getQueue(): Promise<QueuedMutation[]> {
    return (await get<QueuedMutation[]>(QUEUE_KEY)) || [];
  }

  async getPendingCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  // Process the queue when back online
  async processQueue(): Promise<void> {
    if (!this.isOnline || this.isSyncing) return;

    const queue = await this.getQueue();
    if (queue.length === 0) return;

    this.isSyncing = true;
    this.notifyListeners();

    const now = Date.now();
    const due = queue.filter(m => (m.nextAttemptAt ?? 0) <= now);
    const deferred = queue.filter(m => (m.nextAttemptAt ?? 0) > now);

    if (due.length === 0) {
      this.isSyncing = false;
      this.notifyListeners();
      this.scheduleNextRetry(queue);
      return;
    }

    console.log(`Processing ${due.length} due mutations (${deferred.length} deferred)...`);

    const remaining: QueuedMutation[] = [...deferred];
    const droppedMutations: QueuedMutation[] = [];
    let succeeded = 0;

    for (const mutation of due) {
      try {
        let error: any = null;

        switch (mutation.type) {
          case 'create':
            if (mutation.table === 'daily_check_ins') {
              const r = await (supabase as any).from(mutation.table)
                .upsert(mutation.data, { onConflict: 'user_id,check_in_date' });
              error = r.error;
            } else if (mutation.table === 'weekly_planning_sessions') {
              const r = await (supabase as any).from(mutation.table)
                .upsert(mutation.data, { onConflict: 'user_id,week_start' });
              error = r.error;
            } else {
              const r = await (supabase as any).from(mutation.table).insert(mutation.data);
              error = r.error;
            }
            break;
          case 'update': {
            const r = await (supabase as any).from(mutation.table)
              .update(mutation.data.updates).eq('id', mutation.data.id);
            error = r.error;
            break;
          }
          case 'delete': {
            const r = await (supabase as any).from(mutation.table)
              .delete().eq('id', mutation.data.id);
            error = r.error;
            break;
          }
        }

        if (error) throw error;
        succeeded++;
        console.log('Synced mutation:', mutation.id);
      } catch (err: any) {
        const attempts = (mutation.attempts ?? 0) + 1;
        const transient = isTransientError(err);
        console.warn(`Mutation ${mutation.id} failed (attempt ${attempts}, transient=${transient}):`, err);

        if (transient && attempts < MAX_ATTEMPTS) {
          const delay = computeBackoff(attempts);
          remaining.push({
            ...mutation,
            attempts,
            lastError: err?.message ?? String(err),
            nextAttemptAt: Date.now() + delay,
          });
        } else {
          // Either non-transient (permanent) or out of retries — drop from queue
          droppedMutations.push({
            ...mutation,
            attempts,
            lastError: err?.message ?? String(err),
          });
        }
      }
    }

    await set(QUEUE_KEY, remaining);
    this.isSyncing = false;
    this.notifyListeners();

    if (succeeded > 0) {
      toast({
        title: "Synced successfully",
        description: `${succeeded} offline change${succeeded !== 1 ? 's' : ''} saved to server.`,
      });
    }
    if (droppedMutations.length > 0) {
      toast({
        title: "Some changes couldn't sync",
        description: `${droppedMutations.length} change${droppedMutations.length !== 1 ? 's' : ''} failed permanently and were discarded.`,
        variant: "destructive",
      });
    }

    // Schedule the next retry pass for whatever is still queued
    this.scheduleNextRetry(remaining);
  }

  async clearQueue(): Promise<void> {
    await del(QUEUE_KEY);
    this.clearRetryTimer();
    this.notifyListeners();
  }

  get online() { return this.isOnline; }
  get syncing() { return this.isSyncing; }
}

export const offlineSyncService = new OfflineSyncService();
