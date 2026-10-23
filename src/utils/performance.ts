/**
 * Performance Utilities for OpenSuite Document Editor
 * Provides performance monitoring, optimization, lazy loading,
 * virtualization, and caching strategies.
 */

import React from 'react';

// ============================================================
// Performance Monitoring
// ============================================================

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  unit: string;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];
  
  constructor() {
    this.setupObservers();
  }
  
  private setupObservers(): void {
    // Web Vitals observers
    if (typeof PerformanceObserver !== 'undefined') {
      // Largest Contentful Paint
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.record('LCP', lastEntry.startTime, 'ms');
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        this.observers.push(lcpObserver);
      } catch {
        // Not supported
      }
      
      // First Input Delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            this.record('FID', entry.processingStart - entry.startTime, 'ms');
          });
        });
        fidObserver.observe({ type: 'first-input', buffered: true });
        this.observers.push(fidObserver);
      } catch {
        // Not supported
      }
      
      // Cumulative Layout Shift
      try {
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          let cls = 0;
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              cls += entry.value;
            }
          });
          this.record('CLS', cls, '');
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
        this.observers.push(clsObserver);
      } catch {
        // Not supported
      }
    }
  }
  
  record(name: string, value: number, unit: string): void {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      unit,
    });
    
    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }
  
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }
  
  getAverage(name: string): number {
    const filtered = this.metrics.filter(m => m.name === name);
    if (filtered.length === 0) return 0;
    return filtered.reduce((sum, m) => sum + m.value, 0) / filtered.length;
  }
  
  clear(): void {
    this.metrics = [];
  }
  
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics = [];
  }
  
  getReport(): string {
    const lcp = this.getAverage('LCP');
    const fid = this.getAverage('FID');
    const cls = this.getAverage('CLS');
    
    return `
Performance Report:
- LCP (Largest Contentful Paint): ${lcp.toFixed(2)}ms ${lcp < 2500 ? '✅' : '⚠️'}
- FID (First Input Delay): ${fid.toFixed(2)}ms ${fid < 100 ? '✅' : '⚠️'}
- CLS (Cumulative Layout Shift): ${cls.toFixed(4)} ${cls < 0.1 ? '✅' : '⚠️'}
    `.trim();
  }
}

// ============================================================
// Debounce & Throttle
// ============================================================

/**
 * Debounce function - delays execution until after wait period
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) {
        func(...args);
      }
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(later, wait);
    
    if (callNow) {
      func(...args);
    }
  };
}

/**
 * Throttle function - limits execution to once per wait period
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// ============================================================
// Lazy Loading
// ============================================================

/**
 * Lazy load images using Intersection Observer
 */
export function lazyLoadImages(container: HTMLElement): void {
  if (!('IntersectionObserver' in window)) {
    // Fallback: load all images immediately
    container.querySelectorAll('img[data-src]').forEach((img: any) => {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    });
    return;
  }
  
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          img.classList.add('loaded');
        }
        observer.unobserve(img);
      }
    });
  }, {
    rootMargin: '50px 0px',
    threshold: 0.01,
  });
  
  container.querySelectorAll('img[data-src]').forEach(img => {
    imageObserver.observe(img);
  });
}

/**
 * Lazy load components using dynamic import
 */
export function lazyLoadComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return React.lazy(importFn);
}

// ============================================================
// Virtualization
// ============================================================

export interface VirtualScrollConfig {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

/**
 * Calculate visible range for virtual scrolling
 */
export function getVisibleRange(
  scrollTop: number,
  config: VirtualScrollConfig
): { start: number; end: number; offset: number } {
  const { itemHeight, containerHeight, overscan = 5 } = config;
  
  const start = Math.floor(scrollTop / itemHeight);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const end = Math.min(start + visibleCount + overscan * 2, Number.MAX_SAFE_INTEGER);
  const offset = start * itemHeight;
  
  return {
    start: Math.max(0, start - overscan),
    end,
    offset,
  };
}

/**
 * Virtual list hook helper
 */
export function useVirtualList<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
): {
  virtualItems: T[];
  offset: number;
  totalHeight: number;
} {
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const range = getVisibleRange(scrollTop, {
    itemHeight,
    containerHeight,
  });
  
  const virtualItems = items.slice(range.start, range.end);
  const totalHeight = items.length * itemHeight;
  
  return {
    virtualItems,
    offset: range.offset,
    totalHeight,
  };
}

// ============================================================
// Caching
// ============================================================

/**
 * In-memory cache with TTL
 */
export class MemoryCache<T> {
  private cache = new Map<string, { value: T; expiry: number }>();
  private defaultTTL: number;
  
  constructor(defaultTTL = 60000) {
    this.defaultTTL = defaultTTL;
  }
  
  set(key: string, value: T, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expiry });
  }
  
  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.value;
  }
  
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }
  
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
  
  size(): number {
    return this.cache.size;
  }
}

/**
 * IndexedDB cache for persistent storage
 */
export class IndexedDBCache {
  private dbName: string;
  private storeName: string;
  private db: IDBDatabase | null = null;
  
  constructor(dbName = 'OpenSuiteCache', storeName = 'cache') {
    this.dbName = dbName;
    this.storeName = storeName;
  }
  
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }
  
  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.db) await this.init();
    
    const item = {
      value,
      expiry: ttl ? Date.now() + ttl : null,
    };
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(item, key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
  
  async get(key: string): Promise<any> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const item = request.result;
        if (!item) {
          resolve(undefined);
          return;
        }
        
        if (item.expiry && Date.now() > item.expiry) {
          this.delete(key);
          resolve(undefined);
          return;
        }
        
        resolve(item.value);
      };
    });
  }
  
  async delete(key: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
  
  async clear(): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

// ============================================================
// Image Optimization
// ============================================================

/**
 * Compress image using Canvas API
 */
export async function compressImage(
  file: File,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }
    
    img.onload = () => {
      let { width, height } = img;
      
      // Calculate new dimensions
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Generate image thumbnails
 */
export async function generateThumbnail(
  file: File,
  size = 150
): Promise<string> {
  const blob = await compressImage(file, size, size, 0.7);
  return URL.createObjectURL(blob);
}

// ============================================================
// Resource Preloading
// ============================================================

/**
 * Preload images
 */
export function preloadImages(urls: string[]): Promise<void[]> {
  return Promise.all(
    urls.map(url => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to preload: ${url}`));
        img.src = url;
      });
    })
  );
}

/**
 * Preload fonts
 */
export function preloadFonts(fontUrls: string[]): void {
  fontUrls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
    link.href = url;
    document.head.appendChild(link);
  });
}

/**
 * Prefetch resources
 */
export function prefetchResources(urls: string[]): void {
  urls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  });
}

// ============================================================
// Performance Optimization Helpers
// ============================================================

/**
 * Request idle callback with fallback
 */
export function requestIdleCallbackCompat(
  callback: IdleRequestCallback,
  options?: IdleRequestOptions
): number {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  }
  
  // Fallback for browsers that don't support requestIdleCallback
  const start = Date.now();
  return setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
    });
  }, 1) as unknown as number;
}

/**
 * Measure function execution time
 */
export function measureExecution<T>(
  name: string,
  fn: () => T
): { result: T; duration: number } {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  
  console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
  
  return { result, duration };
}

/**
 * Batch DOM updates using requestAnimationFrame
 */
export function batchDOMUpdates(updates: Array<() => void>): void {
  requestAnimationFrame(() => {
    updates.forEach(update => update());
  });
}

/**
 * Optimize scroll performance
 */
export function optimizeScroll(
  element: HTMLElement,
  callback: (event: Event) => void,
  throttleMs = 16
): () => void {
  const throttledCallback = throttle(callback, throttleMs);
  element.addEventListener('scroll', throttledCallback, { passive: true });
  
  return () => {
    element.removeEventListener('scroll', throttledCallback);
  };
}

/**
 * Detect slow operations
 */
export function detectSlowOperations(threshold = 50): void {
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.duration > threshold) {
          console.warn(
            `[Performance] Slow operation detected: ${entry.name} took ${entry.duration.toFixed(2)}ms`
          );
        }
      });
    });
    
    observer.observe({ entryTypes: ['measure', 'function'] });
  }
}

// ============================================================
// Memory Management
// ============================================================

/**
 * Clear unused resources
 */
export function clearUnusedResources(): void {
  // Clear object URLs
  if ('gc' in window) {
    (window as any).gc();
  }
  
  // Clear image cache
  if ('clearImageCache' in window) {
    (window as any).clearImageCache();
  }
}

/**
 * Monitor memory usage
 */
export function getMemoryUsage(): { used: number; total: number; limit: number } | null {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit,
    };
  }
  return null;
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
