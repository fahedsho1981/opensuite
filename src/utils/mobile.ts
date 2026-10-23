/**
 * Mobile & PWA Utilities for OpenSuite Document Editor
 * Provides progressive web app support, responsive design helpers,
 * touch gesture handling, and mobile optimization features.
 */

// ============================================================
// PWA Support
// ============================================================

export interface PWAConfig {
  name: string;
  shortName: string;
  description: string;
  startUrl: string;
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  orientation: 'any' | 'natural' | 'landscape' | 'portrait';
  themeColor: string;
  backgroundColor: string;
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
  }>;
}

export class PWAInstaller {
  private deferredPrompt: any = null;
  
  constructor() {
    this.setupInstallPrompt();
  }
  
  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
    });
  }
  
  async install(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.warn('Install prompt not available');
      return false;
    }
    
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    
    this.deferredPrompt = null;
    return outcome === 'accepted';
  }
  
  canInstall(): boolean {
    return this.deferredPrompt !== null;
  }
  
  isInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches || 
           (window.navigator as any).standalone === true;
  }
  
  generateManifest(config: PWAConfig): string {
    return JSON.stringify({
      name: config.name,
      short_name: config.shortName,
      description: config.description,
      start_url: config.startUrl,
      display: config.display,
      orientation: config.orientation,
      theme_color: config.themeColor,
      background_color: config.backgroundColor,
      icons: config.icons,
    }, null, 2);
  }
  
  registerServiceWorker(swPath: string = '/service-worker.js'): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service workers not supported');
      return Promise.resolve(null);
    }
    
    return navigator.serviceWorker.register(swPath)
      .then(registration => {
        console.log('✅ Service worker registered:', registration.scope);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('🔄 New version available');
                // Notify user about update
              }
            });
          }
        });
        
        return registration;
      })
      .catch(error => {
        console.error('❌ Service worker registration failed:', error);
        return null;
      });
  }
}

// ============================================================
// Touch Gesture Handling
// ============================================================

export interface TouchGesture {
  type: 'tap' | 'doubletap' | 'swipe' | 'pinch' | 'rotate' | 'longpress';
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
  scale?: number;
  rotation?: number;
  duration?: number;
}

export class TouchGestureHandler {
  private element: HTMLElement;
  private startX = 0;
  private startY = 0;
  private startTime = 0;
  private lastTapTime = 0;
  private initialDistance = 0;
  private initialAngle = 0;
  private handlers: Map<string, Array<(gesture: TouchGesture) => void>> = new Map();
  
  constructor(element: HTMLElement) {
    this.element = element;
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
  }
  
  private handleTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      this.startX = e.touches[0].clientX;
      this.startY = e.touches[0].clientY;
      this.startTime = Date.now();
    } else if (e.touches.length === 2) {
      this.initialDistance = this.getDistance(e.touches[0], e.touches[1]);
      this.initialAngle = this.getAngle(e.touches[0], e.touches[1]);
    }
  }
  
  private handleTouchMove(e: TouchEvent): void {
    if (e.touches.length === 2) {
      e.preventDefault();
      
      const currentDistance = this.getDistance(e.touches[0], e.touches[1]);
      const currentAngle = this.getAngle(e.touches[0], e.touches[1]);
      
      const scale = currentDistance / this.initialDistance;
      const rotation = currentAngle - this.initialAngle;
      
      this.trigger('pinch', { type: 'pinch', scale });
      this.trigger('rotate', { type: 'rotate', rotation });
    }
  }
  
  private handleTouchEnd(e: TouchEvent): void {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    if (e.changedTouches.length === 1) {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      
      const deltaX = endX - this.startX;
      const deltaY = endY - this.startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // Detect tap
      if (distance < 10 && duration < 300) {
        const tapTime = Date.now();
        
        // Detect double tap
        if (tapTime - this.lastTapTime < 300) {
          this.trigger('doubletap', { type: 'doubletap', duration });
        } else {
          this.trigger('tap', { type: 'tap', duration });
        }
        
        this.lastTapTime = tapTime;
      }
      
      // Detect swipe
      if (distance > 50 && duration < 500) {
        const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
        let direction: 'up' | 'down' | 'left' | 'right';
        
        if (angle >= -45 && angle < 45) {
          direction = 'right';
        } else if (angle >= 45 && angle < 135) {
          direction = 'down';
        } else if (angle >= -135 && angle < -45) {
          direction = 'up';
        } else {
          direction = 'left';
        }
        
        this.trigger('swipe', { type: 'swipe', direction, distance, duration });
      }
      
      // Detect long press
      if (distance < 10 && duration > 500) {
        this.trigger('longpress', { type: 'longpress', duration });
      }
    }
  }
  
  private getDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  private getAngle(touch1: Touch, touch2: Touch): number {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.atan2(dy, dx) * 180 / Math.PI;
  }
  
  on(gesture: string, handler: (gesture: TouchGesture) => void): void {
    if (!this.handlers.has(gesture)) {
      this.handlers.set(gesture, []);
    }
    this.handlers.get(gesture)!.push(handler);
  }
  
  off(gesture: string, handler: (gesture: TouchGesture) => void): void {
    const handlers = this.handlers.get(gesture);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
  
  private trigger(gesture: string, data: TouchGesture): void {
    const handlers = this.handlers.get(gesture);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }
  
  destroy(): void {
    this.handlers.clear();
  }
}

// ============================================================
// Responsive Design Helpers
// ============================================================

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface BreakpointConfig {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
}

export const DEFAULT_BREAKPOINTS: BreakpointConfig = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export class ResponsiveHelper {
  private breakpoints: BreakpointConfig;
  private currentBreakpoint: Breakpoint = 'md';
  private listeners: Array<(breakpoint: Breakpoint) => void> = [];
  
  constructor(breakpoints: BreakpointConfig = DEFAULT_BREAKPOINTS) {
    this.breakpoints = breakpoints;
    this.setupResizeListener();
    this.updateBreakpoint();
  }
  
  private setupResizeListener(): void {
    let timeout: NodeJS.Timeout;
    
    window.addEventListener('resize', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        this.updateBreakpoint();
      }, 100);
    });
  }
  
  private updateBreakpoint(): void {
    const width = window.innerWidth;
    let breakpoint: Breakpoint = 'xs';
    
    if (width >= this.breakpoints['2xl']) {
      breakpoint = '2xl';
    } else if (width >= this.breakpoints.xl) {
      breakpoint = 'xl';
    } else if (width >= this.breakpoints.lg) {
      breakpoint = 'lg';
    } else if (width >= this.breakpoints.md) {
      breakpoint = 'md';
    } else if (width >= this.breakpoints.sm) {
      breakpoint = 'sm';
    }
    
    if (breakpoint !== this.currentBreakpoint) {
      this.currentBreakpoint = breakpoint;
      this.notifyListeners();
    }
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentBreakpoint));
  }
  
  getCurrentBreakpoint(): Breakpoint {
    return this.currentBreakpoint;
  }
  
  isMobile(): boolean {
    return this.currentBreakpoint === 'xs' || this.currentBreakpoint === 'sm';
  }
  
  isTablet(): boolean {
    return this.currentBreakpoint === 'md';
  }
  
  isDesktop(): boolean {
    return ['lg', 'xl', '2xl'].includes(this.currentBreakpoint);
  }
  
  onChange(listener: (breakpoint: Breakpoint) => void): () => void {
    this.listeners.push(listener);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  
  getMediaQuery(breakpoint: Breakpoint): string {
    return `(min-width: ${this.breakpoints[breakpoint]}px)`;
  }
  
  matches(breakpoint: Breakpoint): boolean {
    return window.matchMedia(this.getMediaQuery(breakpoint)).matches;
  }
}

// ============================================================
// Mobile Optimization
// ============================================================

export class MobileOptimizer {
  private responsiveHelper: ResponsiveHelper;
  
  constructor() {
    this.responsiveHelper = new ResponsiveHelper();
  }
  
  optimizeForMobile(): void {
    if (!this.responsiveHelper.isMobile()) return;
    
    // Disable hover effects on mobile
    document.body.classList.add('mobile-device');
    
    // Optimize touch targets
    this.optimizeTouchTargets();
    
    // Enable smooth scrolling
    this.enableSmoothScrolling();
    
    // Optimize images
    this.optimizeImages();
    
    // Reduce animations
    this.reduceAnimations();
  }
  
  private optimizeTouchTargets(): void {
    const buttons = document.querySelectorAll('button, a, [role="button"]');
    buttons.forEach(element => {
      const el = element as HTMLElement;
      const rect = el.getBoundingClientRect();
      
      // Ensure minimum touch target size (44x44px per Apple HIG)
      if (rect.width < 44 || rect.height < 44) {
        el.style.minWidth = '44px';
        el.style.minHeight = '44px';
      }
    });
  }
  
  private enableSmoothScrolling(): void {
    document.documentElement.style.scrollBehavior = 'smooth';
  }
  
  private optimizeImages(): void {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      // Add lazy loading
      if (!img.hasAttribute('loading')) {
        img.setAttribute('loading', 'lazy');
      }
      
      // Optimize for mobile screens
      const maxWidth = window.innerWidth;
      if (img.naturalWidth > maxWidth * 2) {
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
      }
    });
  }
  
  private reduceAnimations(): void {
    // Check if user prefers reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.style.setProperty('--animation-duration', '0ms');
    }
  }
  
  isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  
  getOrientation(): 'portrait' | 'landscape' {
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  }
  
  onOrientationChange(callback: (orientation: 'portrait' | 'landscape') => void): () => void {
    const handler = () => {
      callback(this.getOrientation());
    };
    
    window.addEventListener('orientationchange', handler);
    
    return () => {
      window.removeEventListener('orientationchange', handler);
    };
  }
  
  preventZoom(): void {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }
  }
  
  enableZoom(): void {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
    }
  }
  
  getDeviceInfo(): {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    orientation: 'portrait' | 'landscape';
    pixelRatio: number;
    screenWidth: number;
    screenHeight: number;
  } {
    return {
      isMobile: this.isMobileDevice(),
      isTablet: /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent),
      isDesktop: !this.isMobileDevice(),
      orientation: this.getOrientation(),
      pixelRatio: window.devicePixelRatio || 1,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
    };
  }
}

// ============================================================
// Offline Support
// ============================================================

export class OfflineManager {
  private isOnline: boolean = navigator.onLine;
  private listeners: Array<(online: boolean) => void> = [];
  private pendingActions: Array<() => Promise<void>> = [];
  
  constructor() {
    this.setupListeners();
  }
  
  private setupListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners();
      this.processPendingActions();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners();
    });
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.isOnline));
  }
  
  private async processPendingActions(): Promise<void> {
    while (this.pendingActions.length > 0) {
      const action = this.pendingActions.shift();
      if (action) {
        try {
          await action();
        } catch (error) {
          console.error('Failed to process pending action:', error);
        }
      }
    }
  }
  
  isCurrentlyOnline(): boolean {
    return this.isOnline;
  }
  
  onStatusChange(listener: (online: boolean) => void): () => void {
    this.listeners.push(listener);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  
  async queueAction(action: () => Promise<void>): Promise<void> {
    if (this.isOnline) {
      await action();
    } else {
      this.pendingActions.push(action);
    }
  }
  
  getPendingActionsCount(): number {
    return this.pendingActions.length;
  }
  
  async syncData(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }
    
    await this.processPendingActions();
  }
}

// ============================================================
// Service Worker Cache Manager
// ============================================================

export class CacheManager {
  private cacheName: string;
  
  constructor(cacheName: string = 'opensuite-v1') {
    this.cacheName = cacheName;
  }
  
  async cacheUrls(urls: string[]): Promise<void> {
    if (!('caches' in window)) {
      console.warn('Cache API not supported');
      return;
    }
    
    const cache = await caches.open(this.cacheName);
    await cache.addAll(urls);
  }
  
  async getCachedResponse(url: string): Promise<Response | undefined> {
    if (!('caches' in window)) {
      return undefined;
    }
    
    const cache = await caches.open(this.cacheName);
    return cache.match(url);
  }
  
  async removeFromCache(url: string): Promise<void> {
    if (!('caches' in window)) {
      return;
    }
    
    const cache = await caches.open(this.cacheName);
    await cache.delete(url);
  }
  
  async clearCache(): Promise<void> {
    if (!('caches' in window)) {
      return;
    }
    
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(key => key.startsWith(this.cacheName))
        .map(key => caches.delete(key))
    );
  }
  
  async getCacheSize(): Promise<number> {
    if (!('caches' in window)) {
      return 0;
    }
    
    const cache = await caches.open(this.cacheName);
    const keys = await cache.keys();
    
    let totalSize = 0;
    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
    
    return totalSize;
  }
}

// ============================================================
// Push Notifications
// ============================================================

export class PushNotificationManager {
  private subscription: PushSubscription | null = null;
  
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    
    return false;
  }
  
  async subscribe(publicKey: string): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service workers not supported');
      return null;
    }
    
    const registration = await navigator.serviceWorker.ready;
    
    try {
      this.subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(publicKey),
      });
      
      return this.subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }
  
  async unsubscribe(): Promise<boolean> {
    if (this.subscription) {
      const result = await this.subscription.unsubscribe();
      this.subscription = null;
      return result;
    }
    return false;
  }
  
  getSubscription(): PushSubscription | null {
    return this.subscription;
  }
  
  showLocalNotification(title: string, options?: NotificationOptions): void {
    if (Notification.permission === 'granted') {
      new Notification(title, options);
    }
  }
  
  private urlBase64ToUint8Array(base64String: string): ArrayBuffer {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray.buffer;
  }
}

// ============================================================
// Mobile-Specific UI Components
// ============================================================

export function createMobileMenu(): HTMLElement {
  const menu = document.createElement('div');
  menu.className = 'mobile-menu';
  menu.innerHTML = `
    <button class="mobile-menu-toggle" aria-label="Toggle menu">
      <span></span>
      <span></span>
      <span></span>
    </button>
    <nav class="mobile-menu-nav">
      <!-- Menu items will be added here -->
    </nav>
  `;
  
  const toggle = menu.querySelector('.mobile-menu-toggle');
  const nav = menu.querySelector('.mobile-menu-nav');
  
  toggle?.addEventListener('click', () => {
    nav?.classList.toggle('open');
    toggle?.classList.toggle('active');
  });
  
  return menu;
}

export function createBottomSheet(): HTMLElement {
  const sheet = document.createElement('div');
  sheet.className = 'bottom-sheet';
  sheet.innerHTML = `
    <div class="bottom-sheet-overlay"></div>
    <div class="bottom-sheet-content">
      <div class="bottom-sheet-handle"></div>
      <div class="bottom-sheet-body"></div>
    </div>
  `;
  
  return sheet;
}

export function createSwipeableTabs(): HTMLElement {
  const tabs = document.createElement('div');
  tabs.className = 'swipeable-tabs';
  tabs.innerHTML = `
    <div class="tabs-header">
      <!-- Tab buttons will be added here -->
    </div>
    <div class="tabs-content">
      <!-- Tab panels will be added here -->
    </div>
  `;
  
  return tabs;
}
