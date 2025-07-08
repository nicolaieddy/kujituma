import { backgroundSyncService } from './backgroundSyncService';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observer: PerformanceObserver | null = null;

  constructor() {
    this.initializeObserver();
    this.monitorWebVitals();
  }

  private initializeObserver() {
    if ('PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.recordMetric(entry.name, entry.duration, 'ms');
          
          // Send critical metrics to background sync
          if (entry.duration > 1000) { // Slow operations
            backgroundSyncService.trackEvent('slow_performance', {
              name: entry.name,
              duration: entry.duration,
              timestamp: Date.now()
            });
          }
        });
      });

      try {
        this.observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
      } catch (error) {
        console.warn('PerformanceObserver not fully supported:', error);
      }
    }
  }

  private monitorWebVitals() {
    // Monitor First Contentful Paint
    if ('performance' in window && 'getEntriesByType' in performance) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            this.recordMetric('FCP', entry.startTime, 'ms');
            backgroundSyncService.trackEvent('web_vital', {
              metric: 'FCP',
              value: entry.startTime
            });
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['paint'] });
      } catch (error) {
        console.warn('Paint observer not supported:', error);
      }
    }

    // Monitor Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        this.recordMetric('LCP', lastEntry.startTime, 'ms');
        backgroundSyncService.trackEvent('web_vital', {
          metric: 'LCP',
          value: lastEntry.startTime
        });
      });

      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        console.warn('LCP observer not supported:', error);
      }
    }

    // Monitor Cumulative Layout Shift
    if ('PerformanceObserver' in window) {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        
        this.recordMetric('CLS', clsValue, 'score');
        backgroundSyncService.trackEvent('web_vital', {
          metric: 'CLS',
          value: clsValue
        });
      });

      try {
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('CLS observer not supported:', error);
      }
    }
  }

  recordMetric(name: string, value: number, unit: string = 'ms') {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now()
    };

    this.metrics.push(metric);
    
    // Keep only last 100 metrics in memory
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  // Mark timing for custom measurements
  mark(name: string) {
    if ('performance' in window && 'mark' in performance) {
      performance.mark(name);
    }
  }

  // Measure time between marks
  measure(name: string, startMark: string, endMark?: string) {
    if ('performance' in window && 'measure' in performance) {
      try {
        performance.measure(name, startMark, endMark);
        const measures = performance.getEntriesByName(name, 'measure');
        const lastMeasure = measures[measures.length - 1];
        
        if (lastMeasure) {
          this.recordMetric(name, lastMeasure.duration, 'ms');
        }
      } catch (error) {
        console.warn('Performance measurement failed:', error);
      }
    }
  }

  // Time a function execution
  timeFunction<T>(name: string, fn: () => T): T {
    const startTime = Date.now();
    this.mark(`${name}-start`);
    
    try {
      const result = fn();
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.mark(`${name}-end`);
      this.measure(name, `${name}-start`, `${name}-end`);
      this.recordMetric(name, duration, 'ms');
      
      return result;
    } catch (error) {
      this.recordMetric(`${name}-error`, Date.now() - startTime, 'ms');
      throw error;
    }
  }

  // Time an async function
  async timeAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    this.mark(`${name}-start`);
    
    try {
      const result = await fn();
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.mark(`${name}-end`);
      this.measure(name, `${name}-start`, `${name}-end`);
      this.recordMetric(name, duration, 'ms');
      
      return result;
    } catch (error) {
      this.recordMetric(`${name}-error`, Date.now() - startTime, 'ms');
      throw error;
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getMetricsSummary() {
    const summary: Record<string, { count: number; avg: number; min: number; max: number }> = {};
    
    this.metrics.forEach(metric => {
      if (!summary[metric.name]) {
        summary[metric.name] = { count: 0, avg: 0, min: Infinity, max: -Infinity };
      }
      
      const s = summary[metric.name];
      s.count++;
      s.min = Math.min(s.min, metric.value);
      s.max = Math.max(s.max, metric.value);
      s.avg = (s.avg * (s.count - 1) + metric.value) / s.count;
    });
    
    return summary;
  }

  clearMetrics() {
    this.metrics = [];
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();
