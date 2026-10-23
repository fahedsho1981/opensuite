/**
 * Browser Compatibility Utilities for OpenSuite Document Editor
 * Provides browser detection, feature detection, polyfills,
 * and compatibility helpers for cross-browser support.
 */

// ============================================================
// Browser Detection
// ============================================================

export interface BrowserInfo {
  name: string;
  version: string;
  major: number;
  os: string;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  engine: string;
}

/**
 * Detect browser information
 */
export function detectBrowser(): BrowserInfo {
  const ua = navigator.userAgent;
  let name = 'Unknown';
  let version = '0';
  let engine = 'Unknown';
  
  // Browser detection
  if (ua.indexOf('Firefox') > -1) {
    name = 'Firefox';
    engine = 'Gecko';
    const match = ua.match(/Firefox\/(\d+(\.\d+)?)/);
    version = match ? match[1] : '0';
  } else if (ua.indexOf('Edg') > -1) {
    name = 'Edge';
    engine = 'Blink';
    const match = ua.match(/Edg\/(\d+(\.\d+)?)/);
    version = match ? match[1] : '0';
  } else if (ua.indexOf('OPR') > -1) {
    name = 'Opera';
    engine = 'Blink';
    const match = ua.match(/OPR\/(\d+(\.\d+)?)/);
    version = match ? match[1] : '0';
  } else if (ua.indexOf('Chrome') > -1) {
    name = 'Chrome';
    engine = 'Blink';
    const match = ua.match(/Chrome\/(\d+(\.\d+)?)/);
    version = match ? match[1] : '0';
  } else if (ua.indexOf('Safari') > -1) {
    name = 'Safari';
    engine = 'WebKit';
    const match = ua.match(/Version\/(\d+(\.\d+)?)/);
    version = match ? match[1] : '0';
  } else if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident/') > -1) {
    name = 'Internet Explorer';
    engine = 'Trident';
    const match = ua.match(/(?:MSIE |rv:)(\d+(\.\d+)?)/);
    version = match ? match[1] : '0';
  }
  
  // OS detection
  let os = 'Unknown';
  if (ua.indexOf('Win') > -1) os = 'Windows';
  else if (ua.indexOf('Mac') > -1) os = 'macOS';
  else if (ua.indexOf('Linux') > -1) os = 'Linux';
  else if (ua.indexOf('Android') > -1) os = 'Android';
  else if (ua.indexOf('iOS') > -1 || ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) os = 'iOS';
  
  // Device type detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);
  const isDesktop = !isMobile && !isTablet;
  
  return {
    name,
    version,
    major: parseInt(version.split('.')[0], 10),
    os,
    isMobile,
    isTablet,
    isDesktop,
    engine,
  };
}

/**
 * Check if browser is supported
 */
export function isBrowserSupported(): { supported: boolean; message?: string } {
  const browser = detectBrowser();
  
  // Minimum browser versions
  const minimumVersions: Record<string, number> = {
    Chrome: 90,
    Firefox: 88,
    Safari: 14,
    Edge: 90,
    Opera: 76,
  };
  
  const minVersion = minimumVersions[browser.name];
  
  if (!minVersion) {
    return {
      supported: false,
      message: `Browser "${browser.name}" is not officially supported. Please use Chrome, Firefox, Safari, or Edge.`,
    };
  }
  
  if (browser.major < minVersion) {
    return {
      supported: false,
      message: `${browser.name} ${browser.version} is not supported. Please upgrade to version ${minVersion} or later.`,
    };
  }
  
  // Check for Internet Explorer
  if (browser.name === 'Internet Explorer') {
    return {
      supported: false,
      message: 'Internet Explorer is not supported. Please use a modern browser like Chrome, Firefox, Safari, or Edge.',
    };
  }
  
  return { supported: true };
}

// ============================================================
// Feature Detection
// ============================================================

export interface FeatureSupport {
  // Core APIs
  contentEditable: boolean;
  execCommand: boolean;
  clipboard: boolean;
  fileAPI: boolean;
  blob: boolean;
  url: boolean;
  
  // Storage
  localStorage: boolean;
  sessionStorage: boolean;
  indexedDB: boolean;
  
  // Graphics
  canvas: boolean;
  webGL: boolean;
  svg: boolean;
  
  // Modern APIs
  intersectionObserver: boolean;
  resizeObserver: boolean;
  mutationObserver: boolean;
  performanceObserver: boolean;
  
  // Web APIs
  fetch: boolean;
  webSocket: boolean;
  webRTC: boolean;
  webWorkers: boolean;
  serviceWorker: boolean;
  
  // CSS Features
  cssGrid: boolean;
  flexbox: boolean;
  customProperties: boolean;
  transforms: boolean;
  transitions: boolean;
  animations: boolean;
  
  // Security
  crypto: boolean;
  subtleCrypto: boolean;
  
  // Input
  touchEvents: boolean;
  pointerEvents: boolean;
  gamepad: boolean;
  
  // Media
  mediaRecorder: boolean;
  getUserMedia: boolean;
  
  // Other
  webShare: boolean;
  notification: boolean;
  geolocation: boolean;
}

/**
 * Detect feature support
 */
export function detectFeatures(): FeatureSupport {
  return {
    // Core APIs
    contentEditable: 'contentEditable' in document.createElement('div'),
    execCommand: typeof document.execCommand === 'function',
    clipboard: 'clipboard' in navigator,
    fileAPI: 'File' in window && 'FileReader' in window,
    blob: 'Blob' in window,
    url: 'URL' in window,
    
    // Storage
    localStorage: (() => {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        return true;
      } catch {
        return false;
      }
    })(),
    sessionStorage: (() => {
      try {
        sessionStorage.setItem('test', 'test');
        sessionStorage.removeItem('test');
        return true;
      } catch {
        return false;
      }
    })(),
    indexedDB: 'indexedDB' in window,
    
    // Graphics
    canvas: (() => {
      const elem = document.createElement('canvas');
      return !!(elem.getContext && elem.getContext('2d'));
    })(),
    webGL: (() => {
      try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
      } catch {
        return false;
      }
    })(),
    svg: !!document.createElementNS && !!document.createElementNS('http://www.w3.org/2000/svg', 'svg').createSVGRect,
    
    // Modern APIs
    intersectionObserver: 'IntersectionObserver' in window,
    resizeObserver: 'ResizeObserver' in window,
    mutationObserver: 'MutationObserver' in window,
    performanceObserver: 'PerformanceObserver' in window,
    
    // Web APIs
    fetch: 'fetch' in window,
    webSocket: 'WebSocket' in window,
    webRTC: 'RTCPeerConnection' in window,
    webWorkers: 'Worker' in window,
    serviceWorker: 'serviceWorker' in navigator,
    
    // CSS Features
    cssGrid: (() => {
      const elem = document.createElement('div');
      elem.style.display = 'grid';
      return elem.style.display === 'grid';
    })(),
    flexbox: (() => {
      const elem = document.createElement('div');
      elem.style.display = 'flex';
      return elem.style.display === 'flex';
    })(),
    customProperties: (() => {
      const elem = document.createElement('div');
      elem.style.setProperty('--test', '0');
      return elem.style.getPropertyValue('--test') === '0';
    })(),
    transforms: (() => {
      const elem = document.createElement('div');
      return 'transform' in elem.style || 'webkitTransform' in elem.style;
    })(),
    transitions: (() => {
      const elem = document.createElement('div');
      return 'transition' in elem.style || 'webkitTransition' in elem.style;
    })(),
    animations: (() => {
      const elem = document.createElement('div');
      return 'animation' in elem.style || 'webkitAnimation' in elem.style;
    })(),
    
    // Security
    crypto: 'crypto' in window,
    subtleCrypto: 'crypto' in window && 'subtle' in window.crypto,
    
    // Input
    touchEvents: 'ontouchstart' in window,
    pointerEvents: 'PointerEvent' in window,
    gamepad: 'GamepadEvent' in window,
    
    // Media
    mediaRecorder: 'MediaRecorder' in window,
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    
    // Other
    webShare: 'share' in navigator,
    notification: 'Notification' in window,
    geolocation: 'geolocation' in navigator,
  };
}

/**
 * Get missing critical features
 */
export function getMissingCriticalFeatures(): string[] {
  const features = detectFeatures();
  const missing: string[] = [];
  
  const criticalFeatures: Array<[keyof FeatureSupport, string]> = [
    ['contentEditable', 'Content Editable API'],
    ['execCommand', 'Document.execCommand API'],
    ['localStorage', 'Local Storage'],
    ['canvas', 'Canvas API'],
    ['fetch', 'Fetch API'],
    ['cssGrid', 'CSS Grid'],
    ['flexbox', 'Flexbox'],
  ];
  
  criticalFeatures.forEach(([key, name]) => {
    if (!features[key]) {
      missing.push(name);
    }
  });
  
  return missing;
}

/**
 * Check if all critical features are supported
 */
export function hasAllCriticalFeatures(): boolean {
  return getMissingCriticalFeatures().length === 0;
}

// ============================================================
// Polyfills
// ============================================================

/**
 * Install required polyfills
 */
export function installPolyfills(): void {
  // Array.from polyfill
  if (!Array.from) {
    Array.from = <T>(object: ArrayLike<T>): T[] => {
      return [].slice.call(object);
    };
  }
  
  // Object.assign polyfill
  if (typeof Object.assign !== 'function') {
    Object.assign = function (target: any, ...sources: any[]) {
      if (target == null) {
        throw new TypeError('Cannot convert undefined or null to object');
      }
      
      const to = Object(target);
      
      for (const source of sources) {
        if (source != null) {
          for (const key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
              to[key] = source[key];
            }
          }
        }
      }
      
      return to;
    };
  }
  
  // Promise polyfill (basic)
  if (typeof Promise === 'undefined') {
    (window as any).Promise = class SimplePromise<T> {
      private state: 'pending' | 'fulfilled' | 'rejected' = 'pending';
      private value: T | undefined;
      private reason: any;
      private onFulfilled: Array<(value: T) => void> = [];
      private onRejected: Array<(reason: any) => void> = [];
      
      constructor(executor: (resolve: (value: T) => void, reject: (reason?: any) => void) => void) {
        try {
          executor(
            (value: T) => {
              if (this.state === 'pending') {
                this.state = 'fulfilled';
                this.value = value;
                this.onFulfilled.forEach((fn) => fn(value));
              }
            },
            (reason: any) => {
              if (this.state === 'pending') {
                this.state = 'rejected';
                this.reason = reason;
                this.onRejected.forEach((fn) => fn(reason));
              }
            }
          );
        } catch (error) {
          this.reason = error;
          this.state = 'rejected';
          this.onRejected.forEach((fn) => fn(error));
        }
      }
      
      then(onFulfilled?: (value: T) => any, onRejected?: (reason: any) => any): any {
        return new SimplePromise((resolve, reject) => {
          const handleFulfilled = (value: T) => {
            try {
              resolve(onFulfilled ? onFulfilled(value) : value);
            } catch (error) {
              reject(error);
            }
          };
          
          const handleRejected = (reason: any) => {
            try {
              if (onRejected) {
                resolve(onRejected(reason));
              } else {
                reject(reason);
              }
            } catch (error) {
              reject(error);
            }
          };
          
          if (this.state === 'fulfilled') {
            handleFulfilled(this.value!);
          } else if (this.state === 'rejected') {
            handleRejected(this.reason);
          } else {
            this.onFulfilled.push(handleFulfilled);
            this.onRejected.push(handleRejected);
          }
        });
      }
      
      catch(onRejected: (reason: any) => any): any {
        return this.then(undefined, onRejected);
      }
    };
  }
  
  // requestAnimationFrame polyfill
  if (!window.requestAnimationFrame) {
    let lastTime = 0;
    window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
      const currTime = Date.now();
      const timeToCall = Math.max(0, 16 - (currTime - lastTime));
      const id = window.setTimeout(() => {
        callback(currTime + timeToCall);
      }, timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };
  }
  
  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = (id: number): void => {
      clearTimeout(id);
    };
  }
}

// ============================================================
// Vendor Prefixes
// ============================================================

/**
 * Get vendor-prefixed property name
 */
export function getVendorPropertyName(property: string): string {
  const elem = document.createElement('div');
  const prefixes = ['', 'webkit', 'moz', 'ms', 'o'];
  const camelProperty = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  
  for (const prefix of prefixes) {
    const vendorProperty = prefix ? prefix + camelProperty.charAt(0).toUpperCase() + camelProperty.slice(1) : camelProperty;
    
    if (vendorProperty in elem.style) {
      return vendorProperty;
    }
  }
  
  return camelProperty;
}

/**
 * Get vendor-prefixed CSS value
 */
export function getVendorCSSValue(property: string, value: string): string {
  const elem = document.createElement('div');
  const vendorProperty = getVendorPropertyName(property);
  
  elem.style[vendorProperty as any] = value;
  
  return elem.style[vendorProperty as any];
}

/**
 * Apply vendor-prefixed styles
 */
export function applyVendorStyles(element: HTMLElement, styles: Record<string, string>): void {
  Object.entries(styles).forEach(([property, value]) => {
    const vendorProperty = getVendorPropertyName(property);
    (element.style as any)[vendorProperty] = value;
  });
}

// ============================================================
// CSS Compatibility
// ============================================================

/**
 * Check if CSS property is supported
 */
export function isCSSPropertySupported(property: string, value?: string): boolean {
  const elem = document.createElement('div');
  const vendorProperty = getVendorPropertyName(property);
  
  try {
    if (value !== undefined) {
      (elem.style as any)[vendorProperty] = value;
      return (elem.style as any)[vendorProperty] !== '';
    }
    return vendorProperty in elem.style;
  } catch {
    return false;
  }
}

/**
 * Get supported CSS properties
 */
export function getSupportedCSSProperties(properties: string[]): string[] {
  return properties.filter((prop) => isCSSPropertySupported(prop));
}

/**
 * Get unsupported CSS properties
 */
export function getUnsupportedCSSProperties(properties: string[]): string[] {
  return properties.filter((prop) => !isCSSPropertySupported(prop));
}

// ============================================================
// Event Compatibility
// ============================================================

/**
 * Normalize event properties across browsers
 */
export function normalizeEvent(event: Event): any {
  const e = event as any;
  
  // Normalize target
  if (!e.target) {
    e.target = e.srcElement || document;
  }
  
  // Normalize relatedTarget
  if (e.type === 'mouseover') {
    e.relatedTarget = e.fromElement;
  } else if (e.type === 'mouseout') {
    e.relatedTarget = e.toElement;
  }
  
  // Normalize key properties
  if (e.key === undefined) {
    e.key = e.keyIdentifier || e.keyCode;
  }
  
  // Normalize wheel event
  if (e.type === 'wheel' || e.type === 'mousewheel') {
    e.deltaY = e.deltaY || e.wheelDeltaY || -e.wheelDelta;
    e.deltaX = e.deltaX || e.wheelDeltaX || 0;
  }
  
  return e;
}

/**
 * Add event listener with options support
 */
export function addEventListenerWithOptions(
  element: EventTarget,
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions
): void {
  try {
    element.addEventListener(type, listener, options);
  } catch {
    // Fallback for browsers that don't support options parameter
    element.addEventListener(type, listener, typeof options === 'boolean' ? options : false);
  }
}

// ============================================================
// Touch & Pointer Compatibility
// ============================================================

/**
 * Normalize touch and pointer events
 */
export interface NormalizedPointerEvent {
  x: number;
  y: number;
  pressure: number;
  pointerType: 'mouse' | 'touch' | 'pen';
  originalEvent: Event;
}

/**
 * Normalize pointer/touch/mouse event
 */
export function normalizePointerEvent(event: Event): NormalizedPointerEvent {
  const e = event as any;
  
  let x = 0;
  let y = 0;
  let pressure = 0;
  let pointerType: 'mouse' | 'touch' | 'pen' = 'mouse';
  
  if (e.touches && e.touches.length > 0) {
    // Touch event
    x = e.touches[0].clientX;
    y = e.touches[0].clientY;
    pressure = e.touches[0].force || 1;
    pointerType = 'touch';
  } else if (e.pointerType) {
    // Pointer event
    x = e.clientX;
    y = e.clientY;
    pressure = e.pressure || 0.5;
    pointerType = e.pointerType;
  } else {
    // Mouse event
    x = e.clientX;
    y = e.clientY;
    pressure = e.buttons > 0 ? 0.5 : 0;
    pointerType = 'mouse';
  }
  
  return {
    x,
    y,
    pressure,
    pointerType,
    originalEvent: event,
  };
}

/**
 * Add unified pointer event listener
 */
export function addPointerEventListener(
  element: HTMLElement,
  type: 'down' | 'move' | 'up',
  handler: (event: NormalizedPointerEvent) => void
): () => void {
  const eventMap = {
    down: ['mousedown', 'touchstart', 'pointerdown'],
    move: ['mousemove', 'touchmove', 'pointermove'],
    up: ['mouseup', 'touchend', 'pointerup'],
  };
  
  const events = eventMap[type];
  const listeners: Array<[string, EventListener]> = [];
  
  events.forEach((eventType) => {
    const listener = (e: Event) => {
      e.preventDefault();
      handler(normalizePointerEvent(e));
    };
    
    element.addEventListener(eventType, listener, { passive: false });
    listeners.push([eventType, listener]);
  });
  
  // Return cleanup function
  return () => {
    listeners.forEach(([eventType, listener]) => {
      element.removeEventListener(eventType, listener);
    });
  };
}

// ============================================================
// Compatibility Report
// ============================================================

export interface CompatibilityReport {
  browser: BrowserInfo;
  features: FeatureSupport;
  missingCritical: string[];
  score: number;
  recommendations: string[];
}

/**
 * Generate comprehensive compatibility report
 */
export function generateCompatibilityReport(): CompatibilityReport {
  const browser = detectBrowser();
  const features = detectFeatures();
  const missingCritical = getMissingCriticalFeatures();
  
  // Calculate compatibility score
  const totalFeatures = Object.keys(features).length;
  const supportedFeatures = Object.values(features).filter(Boolean).length;
  const score = Math.round((supportedFeatures / totalFeatures) * 100);
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (!features.localStorage) {
    recommendations.push('Enable localStorage for data persistence');
  }
  
  if (!features.indexedDB) {
    recommendations.push('Enable IndexedDB for large data storage');
  }
  
  if (!features.intersectionObserver) {
    recommendations.push('Consider using a polyfill for IntersectionObserver');
  }
  
  if (!features.resizeObserver) {
    recommendations.push('Consider using a polyfill for ResizeObserver');
  }
  
  if (!features.webGL) {
    recommendations.push('WebGL not supported - some visual features may be limited');
  }
  
  if (!features.webSocket) {
    recommendations.push('WebSocket not supported - real-time collaboration will not work');
  }
  
  if (!features.serviceWorker) {
    recommendations.push('Service Worker not supported - offline mode will not work');
  }
  
  if (browser.name === 'Internet Explorer') {
    recommendations.push('Internet Explorer is not supported. Please use a modern browser.');
  }
  
  if (browser.major < 90 && ['Chrome', 'Edge', 'Opera'].includes(browser.name)) {
    recommendations.push(`Consider upgrading ${browser.name} to the latest version for best experience`);
  }
  
  return {
    browser,
    features,
    missingCritical,
    score,
    recommendations,
  };
}

/**
 * Display compatibility report in console
 */
export function logCompatibilityReport(): void {
  const report = generateCompatibilityReport();
  
  console.group('🌐 Browser Compatibility Report');
  console.log(`Browser: ${report.browser.name} ${report.browser.version}`);
  console.log(`OS: ${report.browser.os}`);
  console.log(`Device: ${report.browser.isMobile ? 'Mobile' : report.browser.isTablet ? 'Tablet' : 'Desktop'}`);
  console.log(`Engine: ${report.browser.engine}`);
  console.log(`Compatibility Score: ${report.score}/100`);
  
  if (report.missingCritical.length > 0) {
    console.error('❌ Missing Critical Features:');
    report.missingCritical.forEach((feature) => console.error(`  - ${feature}`));
  } else {
    console.log('✅ All critical features supported');
  }
  
  if (report.recommendations.length > 0) {
    console.warn('⚠️ Recommendations:');
    report.recommendations.forEach((rec) => console.warn(`  - ${rec}`));
  }
  
  console.groupEnd();
}
