/**
 * Security Utilities for OpenSuite Document Editor
 * Provides XSS protection, input sanitization, CSRF protection,
 * content security, and vulnerability prevention.
 */

// ============================================================
// XSS Protection
// ============================================================

/**
 * Sanitize HTML to prevent XSS attacks
 * Removes dangerous elements, attributes, and protocols
 */
export function sanitizeHTML(html: string): string {
  if (!html) return '';
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Remove dangerous elements entirely
  const dangerousElements = ['script', 'iframe', 'object', 'embed', 'form', 'applet', 'base', 'link', 'meta'];
  dangerousElements.forEach(tag => {
    tempDiv.querySelectorAll(tag).forEach(el => el.remove());
  });
  
  // Clean all remaining elements
  tempDiv.querySelectorAll('*').forEach(el => {
    const attrs = Array.from(el.attributes);
    attrs.forEach(attr => {
      const name = attr.name.toLowerCase();
      const value = attr.value.toLowerCase().trim();
      
      // Remove event handlers (onclick, onerror, onload, etc.)
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
        return;
      }
      
      // Remove dangerous attribute values
      if (['href', 'src', 'action', 'formaction', 'xlink:href', 'data'].includes(name)) {
        if (
          value.startsWith('javascript:') ||
          value.startsWith('vbscript:') ||
          value.startsWith('data:text/html') ||
          value.startsWith('')
        ) {
          el.removeAttribute(attr.name);
          return;
        }
      }
      
      // Remove style attributes that could be dangerous
      if (name === 'style') {
        const styleValue = attr.value.toLowerCase();
        if (styleValue.includes('expression(') || 
            styleValue.includes('url(javascript:') ||
            styleValue.includes('-moz-binding')) {
          el.removeAttribute(attr.name);
        }
      }
      
      // Remove data attributes that could execute code
      if (name.startsWith('data-') && name !== 'data-testid') {
        const styleValue = attr.value.toLowerCase();
        if (styleValue.includes('javascript:') || styleValue.includes('<script')) {
          el.removeAttribute(attr.name);
        }
      }
    });
  });
  
  return tempDiv.innerHTML;
}

/**
 * Sanitize text content - escape HTML entities
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };
  return text.replace(/[&<>"'`=\/]/g, (char) => map[char] || char);
}

/**
 * Sanitize URL to prevent XSS via URLs
 */
export function sanitizeURL(url: string): string {
  if (!url) return '';
  
  const trimmed = url.trim().toLowerCase();
  
  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'vbscript:', 'data:text/html', ''];
  for (const protocol of dangerousProtocols) {
    if (trimmed.startsWith(protocol)) {
      return '';
    }
  }
  
  // Ensure URL has a safe protocol
  const safeProtocols = ['http://', 'https://', 'mailto:', 'tel:', 'ftp://'];
  const hasProtocol = safeProtocols.some(p => trimmed.startsWith(p));
  
  if (!hasProtocol && !trimmed.startsWith('/') && !trimmed.startsWith('#')) {
    return `https://${url}`;
  }
  
  return url;
}

/**
 * Validate URL format
 */
export function validateURL(url: string): boolean {
  if (!url) return false;
  const sanitized = sanitizeURL(url);
  if (!sanitized) return false;
  
  try {
    new URL(sanitized);
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// CSRF Protection
// ============================================================

/**
 * Generate a CSRF token
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(token: string, storedToken: string): boolean {
  if (!token || !storedToken) return false;
  if (token.length !== storedToken.length) return false;
  
  // Timing-safe comparison
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ storedToken.charCodeAt(i);
  }
  return result === 0;
}

// ============================================================
// Input Validation
// ============================================================

/**
 * Validate and sanitize file uploads
 */
export function validateFileUpload(file: File, allowedTypes: string[], maxSizeMB: number): { valid: boolean; error?: string } {
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` };
  }
  
  // Check file type
  if (allowedTypes.length > 0) {
    const isAllowed = allowedTypes.some(type => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      return file.type === type || file.type.startsWith(type.replace('*', ''));
    });
    
    if (!isAllowed) {
      return { valid: false, error: `File type not allowed. Accepted: ${allowedTypes.join(', ')}` };
    }
  }
  
  // Check for double extensions (e.g., file.exe.jpg)
  const parts = file.name.split('.');
  if (parts.length > 2) {
    const suspiciousExtensions = ['exe', 'bat', 'cmd', 'com', 'cpl', 'dll', 'hta', 'inf', 'jar', 'js', 'msi', 'ps1', 'reg', 'scr', 'vbs', 'wsf'];
    for (let i = 0; i < parts.length - 1; i++) {
      if (suspiciousExtensions.includes(parts[i].toLowerCase())) {
        return { valid: false, error: 'Suspicious file extension detected' };
      }
    }
  }
  
  return { valid: true };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; score: number; feedback: string[] } {
  const feedback: string[] = [];
  let score = 0;
  
  if (password.length >= 8) score++;
  else feedback.push('Use at least 8 characters');
  
  if (password.length >= 12) score++;
  
  if (/[a-z]/.test(password)) score++;
  else feedback.push('Add lowercase letters');
  
  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Add uppercase letters');
  
  if (/[0-9]/.test(password)) score++;
  else feedback.push('Add numbers');
  
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  else feedback.push('Add special characters');
  
  // Check for common patterns
  const commonPatterns = ['password', '123456', 'qwerty', 'abc123', 'letmein', 'admin'];
  if (commonPatterns.some(p => password.toLowerCase().includes(p))) {
    score = Math.max(0, score - 2);
    feedback.push('Avoid common password patterns');
  }
  
  return {
    valid: score >= 4,
    score: Math.min(score, 6),
    feedback,
  };
}

// ============================================================
// Content Security
// ============================================================

/**
 * Generate Content Security Policy header value
 */
export function generateCSP(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

/**
 * Generate security headers
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': generateCSP(),
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  };
}

// ============================================================
// Rate Limiting
// ============================================================

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

/**
 * Simple client-side rate limiter
 */
export class RateLimiter {
  private requests: number[] = [];
  private config: RateLimitConfig;
  
  constructor(config: RateLimitConfig) {
    this.config = config;
  }
  
  canMakeRequest(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.config.windowMs);
    
    if (this.requests.length >= this.config.maxRequests) {
      return false;
    }
    
    this.requests.push(now);
    return true;
  }
  
  getRemainingRequests(): number {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.config.windowMs);
    return Math.max(0, this.config.maxRequests - this.requests.length);
  }
  
  getResetTime(): number {
    if (this.requests.length === 0) return 0;
    return this.requests[0] + this.config.windowMs - Date.now();
  }
}

// ============================================================
// Secure Storage
// ============================================================

/**
 * Encrypt data for localStorage
 */
export async function encryptData(data: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoder.encode(data)
  );
  
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt data from localStorage
 */
export async function decryptData(encryptedData: string, key: string): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );
  
  return new TextDecoder().decode(decrypted);
}

// ============================================================
// Audit Logging
// ============================================================

export interface AuditLogEntry {
  timestamp: string;
  action: string;
  userId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Audit logger for security events
 */
export class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private maxLogs = 1000;
  
  log(action: string, details?: Record<string, unknown>): void {
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      action,
      details,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };
    
    this.logs.push(entry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Persist to localStorage
    try {
      localStorage.setItem('audit_logs', JSON.stringify(this.logs));
    } catch {
      // Storage full or unavailable
    }
  }
  
  getLogs(filter?: { action?: string; startDate?: string; endDate?: string }): AuditLogEntry[] {
    let filtered = [...this.logs];
    
    if (filter?.action) {
      filtered = filtered.filter(log => log.action === filter.action);
    }
    if (filter?.startDate) {
      filtered = filtered.filter(log => log.timestamp >= filter.startDate!);
    }
    if (filter?.endDate) {
      filtered = filtered.filter(log => log.timestamp <= filter.endDate!);
    }
    
    return filtered;
  }
  
  clear(): void {
    this.logs = [];
    localStorage.removeItem('audit_logs');
  }
  
  export(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// ============================================================
// Security Scan
// ============================================================

export interface SecurityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  message: string;
  recommendation: string;
  location?: string;
}

/**
 * Run a security scan on document content
 */
export function scanDocumentSecurity(html: string): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  
  // Check for inline scripts
  if (/<script[\s>]/i.test(html)) {
    issues.push({
      severity: 'critical',
      category: 'XSS',
      message: 'Inline script tags detected',
      recommendation: 'Remove all <script> tags from document content',
    });
  }
  
  // Check for event handlers
  const eventHandlerMatch = html.match(/\bon\w+\s*=\s*["'][^"']*["']/gi);
  if (eventHandlerMatch) {
    issues.push({
      severity: 'high',
      category: 'XSS',
      message: `${eventHandlerMatch.length} inline event handler(s) detected`,
      recommendation: 'Remove all inline event handlers (onclick, onerror, etc.)',
    });
  }
  
  // Check for javascript: URLs
  if (/javascript:/i.test(html)) {
    issues.push({
      severity: 'critical',
      category: 'XSS',
      message: 'JavaScript protocol URLs detected',
      recommendation: 'Remove all javascript: URLs',
    });
  }
  
  // Check for iframes
  if (/<iframe[\s>]/i.test(html)) {
    issues.push({
      severity: 'medium',
      category: 'Content Security',
      message: 'Iframe elements detected',
      recommendation: 'Review iframes for trusted sources only',
    });
  }
  
  // Check for external resources
  const externalResources = html.match(/(src|href)\s*=\s*["']https?:\/\/[^"']*["']/gi);
  if (externalResources) {
    issues.push({
      severity: 'low',
      category: 'Content Security',
      message: `${externalResources.length} external resource(s) detected`,
      recommendation: 'Verify all external resources are from trusted sources',
    });
  }
  
  // Check for data: URLs
  const dataUrls = html.match(/(src|href)\s*=\s*["']data:[^"']*["']/gi);
  if (dataUrls) {
    const htmlDataUrls = dataUrls.filter(u => /data:text\/html/i.test(u));
    if (htmlDataUrls.length > 0) {
      issues.push({
        severity: 'high',
        category: 'XSS',
        message: 'Data URLs with HTML content detected',
        recommendation: 'Remove data:text/html URLs',
      });
    }
  }
  
  // Check for form elements
  if (/<form[\s>]/i.test(html)) {
    issues.push({
      severity: 'medium',
      category: 'Content Security',
      message: 'Form elements detected',
      recommendation: 'Review forms for proper action URLs and CSRF protection',
    });
  }
  
  // Check for base tag
  if (/<base[\s>]/i.test(html)) {
    issues.push({
      severity: 'high',
      category: 'XSS',
      message: 'Base tag detected',
      recommendation: 'Remove <base> tags to prevent URL hijacking',
    });
  }
  
  return issues;
}

/**
 * Get overall security score (0-100)
 */
export function getSecurityScore(issues: SecurityIssue[]): number {
  const weights: Record<string, number> = {
    critical: 25,
    high: 15,
    medium: 8,
    low: 3,
    info: 0,
  };
  
  const totalDeduction = issues.reduce((sum, issue) => sum + (weights[issue.severity] || 0), 0);
  return Math.max(0, 100 - totalDeduction);
}
