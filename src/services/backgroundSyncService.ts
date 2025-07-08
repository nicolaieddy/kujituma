interface BackgroundTask {
  id: string;
  type: 'analytics' | 'notification' | 'cache_update' | 'user_activity' | 'custom';
  priority: 'low' | 'medium' | 'high';
  payload: any;
  retryCount: number;
  maxRetries: number;
  timestamp: number;
  executeAfter?: number;
}

interface TaskOptions {
  priority?: 'low' | 'medium' | 'high';
  maxRetries?: number;
  delay?: number;
}

class BackgroundSyncService {
  private queue: BackgroundTask[] = [];
  private processing = false;
  private readonly MAX_CONCURRENT = 3;
  private readonly RETRY_DELAYS = [1000, 3000, 5000, 10000]; // Progressive delays
  private currentTasks = new Set<string>();

  constructor() {
    // Start processing when the browser is idle
    this.scheduleProcessing();
    
    // Handle visibility changes for better UX
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseProcessing();
      } else {
        this.resumeProcessing();
      }
    });

    // Process queue when coming back online
    window.addEventListener('online', () => {
      this.resumeProcessing();
    });
  }

  // Add task to queue
  enqueue(type: BackgroundTask['type'], payload: any, options: TaskOptions = {}): string {
    const taskId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const task: BackgroundTask = {
      id: taskId,
      type,
      priority: options.priority || 'low',
      payload,
      retryCount: 0,
      maxRetries: options.maxRetries || 3,
      timestamp: Date.now(),
      executeAfter: options.delay ? Date.now() + options.delay : undefined
    };

    // Insert based on priority
    const insertIndex = this.findInsertPosition(task);
    this.queue.splice(insertIndex, 0, task);
    
    this.scheduleProcessing();
    return taskId;
  }

  // Analytics tracking
  trackEvent(event: string, properties: Record<string, any> = {}) {
    return this.enqueue('analytics', {
      event,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      }
    }, { priority: 'low' });
  }

  // User activity tracking
  trackUserActivity(activity: string, metadata: Record<string, any> = {}) {
    return this.enqueue('user_activity', {
      activity,
      metadata,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId()
    }, { priority: 'low' });
  }

  // Send notification
  queueNotification(userId: string, notification: any) {
    return this.enqueue('notification', {
      userId,
      notification,
      timestamp: new Date().toISOString()
    }, { priority: 'medium' });
  }

  // Cache update
  queueCacheUpdate(cacheKey: string, updateFunction: () => Promise<any>) {
    return this.enqueue('cache_update', {
      cacheKey,
      updateFunction: updateFunction.toString()
    }, { priority: 'low', delay: 2000 });
  }

  // Custom task
  queueCustomTask(payload: any, options: TaskOptions = {}) {
    return this.enqueue('custom', payload, options);
  }

  // Get queue status
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      currentTasks: this.currentTasks.size,
      tasksByPriority: {
        high: this.queue.filter(t => t.priority === 'high').length,
        medium: this.queue.filter(t => t.priority === 'medium').length,
        low: this.queue.filter(t => t.priority === 'low').length
      }
    };
  }

  // Clear queue
  clear() {
    this.queue = [];
    this.currentTasks.clear();
  }

  private findInsertPosition(task: BackgroundTask): number {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    
    for (let i = 0; i < this.queue.length; i++) {
      if (priorityOrder[task.priority] > priorityOrder[this.queue[i].priority]) {
        return i;
      }
    }
    
    return this.queue.length;
  }

  private scheduleProcessing() {
    if (this.processing || this.queue.length === 0) return;

    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => this.processQueue(), { timeout: 5000 });
    } else {
      setTimeout(() => this.processQueue(), 100);
    }
  }

  private async processQueue() {
    if (this.processing || !navigator.onLine) return;
    
    this.processing = true;
    
    try {
      while (this.queue.length > 0 && this.currentTasks.size < this.MAX_CONCURRENT) {
        const task = this.queue.shift();
        if (!task) break;

        // Check if task should be delayed
        if (task.executeAfter && Date.now() < task.executeAfter) {
          this.queue.unshift(task); // Put it back
          break;
        }

        this.currentTasks.add(task.id);
        this.executeTask(task).finally(() => {
          this.currentTasks.delete(task.id);
        });
      }
    } finally {
      this.processing = false;
      
      // Schedule next processing if there are more tasks
      if (this.queue.length > 0) {
        setTimeout(() => this.scheduleProcessing(), 1000);
      }
    }
  }

  private async executeTask(task: BackgroundTask): Promise<void> {
    try {
      await this.handleTask(task);
    } catch (error) {
      console.warn(`Background task ${task.type} failed:`, error);
      
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        task.executeAfter = Date.now() + this.RETRY_DELAYS[Math.min(task.retryCount - 1, this.RETRY_DELAYS.length - 1)];
        
        // Re-queue for retry
        const insertIndex = this.findInsertPosition(task);
        this.queue.splice(insertIndex, 0, task);
      }
    }
  }

  private async handleTask(task: BackgroundTask): Promise<void> {
    switch (task.type) {
      case 'analytics':
        await this.handleAnalytics(task.payload);
        break;
      case 'user_activity':
        await this.handleUserActivity(task.payload);
        break;
      case 'notification':
        await this.handleNotification(task.payload);
        break;
      case 'cache_update':
        await this.handleCacheUpdate(task.payload);
        break;
      case 'custom':
        await this.handleCustomTask(task.payload);
        break;
      default:
        console.warn(`Unknown task type: ${task.type}`);
    }
  }

  private async handleAnalytics(payload: any): Promise<void> {
    // In a real app, this would send to analytics service
    console.log('Analytics event:', payload);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async handleUserActivity(payload: any): Promise<void> {
    // Track user activity - could update last_active, etc.
    console.log('User activity:', payload);
    
    // This could call the update_user_last_active function
    try {
      // Import supabase here to avoid circular dependencies
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase.rpc('update_user_last_active');
    } catch (error) {
      console.warn('Failed to update user activity:', error);
      throw error;
    }
  }

  private async handleNotification(payload: any): Promise<void> {
    // Handle notification sending
    console.log('Notification queued:', payload);
    
    // In a real app, this might trigger push notifications or email sending
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  private async handleCacheUpdate(payload: any): Promise<void> {
    // Handle cache updates
    console.log('Cache update:', payload);
    
    // This could refresh specific cache entries
    const { cacheService } = await import('./cacheService');
    
    if (payload.cacheKey) {
      // Clear the cache key to force refresh
      cacheService.delete(payload.cacheKey);
    }
  }

  private async handleCustomTask(payload: any): Promise<void> {
    // Handle custom tasks based on payload structure
    if (payload.handler && typeof payload.handler === 'function') {
      await payload.handler(payload.data);
    } else {
      console.log('Custom task:', payload);
    }
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  }

  private pauseProcessing() {
    this.processing = false;
  }

  private resumeProcessing() {
    if (this.queue.length > 0) {
      this.scheduleProcessing();
    }
  }
}

export const backgroundSyncService = new BackgroundSyncService();