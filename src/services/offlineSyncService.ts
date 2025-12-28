import { get, set, del } from 'idb-keyval';
import { toast } from '@/hooks/use-toast';

interface QueuedMutation {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
}

const QUEUE_KEY = 'offline_sync_queue';

class OfflineSyncService {
  private isOnline = navigator.onLine;
  private isSyncing = false;
  private listeners: Set<() => void> = new Set();

  constructor() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processQueue();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // Subscribe to queue changes
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  // Add a mutation to the queue with toast notification
  async queueMutation(mutation: Omit<QueuedMutation, 'id' | 'timestamp'>): Promise<void> {
    const queue = await this.getQueue();
    const newMutation: QueuedMutation = {
      ...mutation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    queue.push(newMutation);
    await set(QUEUE_KEY, queue);
    this.notifyListeners();
    console.log('Queued offline mutation:', newMutation);
    
    // Show toast notification
    toast({
      title: "Saved offline",
      description: "Your change will sync when you're back online.",
    });
  }

  // Get all queued mutations
  async getQueue(): Promise<QueuedMutation[]> {
    return (await get<QueuedMutation[]>(QUEUE_KEY)) || [];
  }

  // Get pending count
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
    console.log(`Processing ${queue.length} queued mutations...`);

    const { supabase } = await import('@/integrations/supabase/client');
    const failedMutations: QueuedMutation[] = [];

    for (const mutation of queue) {
      try {
        let error = null;
        
        switch (mutation.type) {
          case 'create':
            // Use type assertion for dynamic table access
            const insertResult = await (supabase as any)
              .from(mutation.table)
              .insert(mutation.data);
            error = insertResult.error;
            break;
          case 'update':
            const updateResult = await (supabase as any)
              .from(mutation.table)
              .update(mutation.data.updates)
              .eq('id', mutation.data.id);
            error = updateResult.error;
            break;
          case 'delete':
            const deleteResult = await (supabase as any)
              .from(mutation.table)
              .delete()
              .eq('id', mutation.data.id);
            error = deleteResult.error;
            break;
        }

        if (error) {
          console.error('Failed to sync mutation:', mutation, error);
          failedMutations.push(mutation);
        } else {
          console.log('Successfully synced mutation:', mutation.id);
        }
      } catch (error) {
        console.error('Error processing mutation:', mutation, error);
        failedMutations.push(mutation);
      }
    }

    // Keep only failed mutations in the queue
    await set(QUEUE_KEY, failedMutations);
    this.isSyncing = false;
    this.notifyListeners();

    // Show appropriate toast based on sync results
    if (failedMutations.length > 0) {
      console.warn(`${failedMutations.length} mutations failed to sync`);
      toast({
        title: "Some changes couldn't sync",
        description: `${failedMutations.length} change${failedMutations.length !== 1 ? 's' : ''} will retry later.`,
        variant: "destructive",
      });
    } else if (queue.length > 0) {
      console.log('All mutations synced successfully');
      toast({
        title: "Synced successfully",
        description: `${queue.length} offline change${queue.length !== 1 ? 's' : ''} saved to server.`,
      });
    }
  }

  // Clear the queue
  async clearQueue(): Promise<void> {
    await del(QUEUE_KEY);
    this.notifyListeners();
  }

  get online() {
    return this.isOnline;
  }

  get syncing() {
    return this.isSyncing;
  }
}

export const offlineSyncService = new OfflineSyncService();

