/**
 * Monitoring & Alerting Utilities for OpenSuite Document Editor
 * Provides error tracking, performance monitoring, health checks,
 * and alerting capabilities for production environments.
 */

// ============================================================
// Error Tracking
// ============================================================

export interface ErrorReport {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  severity: 'critical' | 'high' | 'medium' | 'low';
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
}

export class ErrorTracker {
  private errors: ErrorReport[] = [];
  private maxErrors = 1000;
  private sentryDsn?: string;
  
  constructor(config?: { sentryDsn?: string }) {
    this.sentryDsn = config?.sentryDsn;
    this.loadErrors();
  }
  
  private loadErrors(): void {
    try {
      const stored = localStorage.getItem('error_reports');
      if (stored) {
        this.errors = JSON.parse(stored);
      }
    } catch {
      this.errors = [];
    }
  }
  
  private saveErrors(): void {
    try {
      localStorage.setItem('error_reports', JSON.stringify(this.errors.slice(-this.maxErrors)));
    } catch {
      // Storage full or unavailable
    }
  }
  
  captureError(error: Error | string, context?: Record<string, unknown>, severity: ErrorReport['severity'] = 'medium'): void {
    const report: ErrorReport = {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      context,
      severity,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
    
    this.errors.push(report);
    this.saveErrors();
    
    // Send to external service if configured
    if (this.sentryDsn) {
      this.sendToSentry(report);
    }
    
    // Alert if critical
    if (severity === 'critical') {
      this.triggerAlert(report);
    }
    
    console.error('[ErrorTracker]', report);
  }
  
  private async sendToSentry(report: ErrorReport): Promise<void> {
    try {
      // Simplified Sentry integration
      await fetch(this.sentryDsn!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: report.message,
          level: report.severity,
          timestamp: report.timestamp,
          extra: report.context,
          request: {
            url: report.url,
            headers: { 'User-Agent': report.userAgent },
          },
        }),
      });
    } catch (error) {
      console.error('Failed to send error to Sentry:', error);
    }
  }
  
  private triggerAlert(report: ErrorReport): void {
    // Send alert notification
    console.warn('🚨 CRITICAL ERROR ALERT:', report);
    
    // Could integrate with Slack, PagerDuty, etc.
    // Example: fetch('https://hooks.slack.com/...', { ... })
  }
  
  getErrors(filter?: { severity?: ErrorReport['severity']; limit?: number }): ErrorReport[] {
    let filtered = [...this.errors];
    
    if (filter?.severity) {
      filtered = filtered.filter(e => e.severity === filter.severity);
    }
    
    if (filter?.limit) {
      filtered = filtered.slice(-filter.limit);
    }
    
    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  
  getErrorCount(): number {
    return this.errors.length;
  }
  
  clearErrors(): void {
    this.errors = [];
    this.saveErrors();
  }
  
  exportErrors(): string {
    return JSON.stringify(this.errors, null, 2);
  }
}

// ============================================================
// Performance Monitoring
// ============================================================

export interface PerformanceReport {
  timestamp: string;
  metrics: {
    loadTime: number;
    firstContentfulPaint?: number;
    largestContentfulPaint?: number;
    firstInputDelay?: number;
    cumulativeLayoutShift?: number;
    memoryUsage?: number;
    domNodes?: number;
  };
}

export class PerformanceMonitor {
  private reports: PerformanceReport[] = [];
  private maxReports = 100;
  
  constructor() {
    this.loadReports();
    this.startMonitoring();
  }
  
  private loadReports(): void {
    try {
      const stored = localStorage.getItem('performance_reports');
      if (stored) {
        this.reports = JSON.parse(stored);
      }
    } catch {
      this.reports = [];
    }
  }
  
  private saveReports(): void {
    try {
      localStorage.setItem('performance_reports', JSON.stringify(this.reports.slice(-this.maxReports)));
    } catch {
      // Storage full
    }
  }
  
  private startMonitoring(): void {
    // Monitor Web Vitals
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.recordMetric('largestContentfulPaint', lastEntry.startTime);
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch {
        // Not supported
      }
      
      // First Input Delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            this.recordMetric('firstInputDelay', entry.processingStart - entry.startTime);
          });
        });
        fidObserver.observe({ type: 'first-input', buffered: true });
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
          this.recordMetric('cumulativeLayoutShift', cls);
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch {
        // Not supported
      }
    }
    
    // Monitor memory usage
    setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.recordMetric('memoryUsage', memory.usedJSHeapSize);
      }
    }, 30000); // Every 30 seconds
    
    // Monitor DOM nodes
    setInterval(() => {
      const domNodes = document.querySelectorAll('*').length;
      this.recordMetric('domNodes', domNodes);
    }, 60000); // Every minute
  }
  
  private recordMetric(name: string, value: number): void {
    const report: PerformanceReport = {
      timestamp: new Date().toISOString(),
      metrics: {
        loadTime: performance.now(),
        [name]: value,
      } as any,
    };
    
    this.reports.push(report);
    this.saveReports();
    
    // Alert on poor performance
    if (name === 'largestContentfulPaint' && value > 2500) {
      console.warn('⚠️ Poor LCP detected:', value, 'ms');
    }
    if (name === 'firstInputDelay' && value > 100) {
      console.warn('⚠️ Poor FID detected:', value, 'ms');
    }
    if (name === 'cumulativeLayoutShift' && value > 0.1) {
      console.warn('⚠️ Poor CLS detected:', value);
    }
  }
  
  recordLoadTime(): void {
    const loadTime = performance.now();
    this.recordMetric('loadTime', loadTime);
  }
  
  getReports(limit = 10): PerformanceReport[] {
    return this.reports.slice(-limit);
  }
  
  getAverageMetrics(): Record<string, number> {
    if (this.reports.length === 0) return {};
    
    const metrics: Record<string, number[]> = {};
    
    this.reports.forEach(report => {
      Object.entries(report.metrics).forEach(([key, value]) => {
        if (!metrics[key]) metrics[key] = [];
        metrics[key].push(value);
      });
    });
    
    const averages: Record<string, number> = {};
    Object.entries(metrics).forEach(([key, values]) => {
      averages[key] = values.reduce((sum, val) => sum + val, 0) / values.length;
    });
    
    return averages;
  }
  
  clearReports(): void {
    this.reports = [];
    this.saveReports();
  }
  
  exportReports(): string {
    return JSON.stringify(this.reports, null, 2);
  }
}

// ============================================================
// Health Checks
// ============================================================

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  message?: string;
  timestamp: string;
}

export class HealthChecker {
  private checks: Array<{ name: string; check: () => Promise<boolean> }> = [];
  
  registerCheck(name: string, check: () => Promise<boolean>): void {
    this.checks.push({ name, check });
  }
  
  async runAllChecks(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    
    for (const { name, check } of this.checks) {
      const start = Date.now();
      try {
        const healthy = await check();
        results.push({
          service: name,
          status: healthy ? 'healthy' : 'unhealthy',
          latency: Date.now() - start,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        results.push({
          service: name,
          status: 'unhealthy',
          latency: Date.now() - start,
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }
    }
    
    return results;
  }
  
  async getOverallStatus(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    const results = await this.runAllChecks();
    
    if (results.every(r => r.status === 'healthy')) {
      return 'healthy';
    }
    
    if (results.some(r => r.status === 'unhealthy')) {
      return 'unhealthy';
    }
    
    return 'degraded';
  }
}

// ============================================================
// Uptime Monitoring
// ============================================================

export class UptimeMonitor {
  private startTime: number;
  private downtime: number = 0;
  private lastDowntimeStart?: number;
  
  constructor() {
    this.startTime = Date.now();
    this.loadState();
  }
  
  private loadState(): void {
    try {
      const stored = localStorage.getItem('uptime_monitor');
      if (stored) {
        const state = JSON.parse(stored);
        this.startTime = state.startTime;
        this.downtime = state.downtime;
      }
    } catch {
      // Use defaults
    }
  }
  
  private saveState(): void {
    try {
      localStorage.setItem('uptime_monitor', JSON.stringify({
        startTime: this.startTime,
        downtime: this.downtime,
      }));
    } catch {
      // Storage unavailable
    }
  }
  
  reportDowntime(): void {
    if (!this.lastDowntimeStart) {
      this.lastDowntimeStart = Date.now();
    }
  }
  
  reportRecovery(): void {
    if (this.lastDowntimeStart) {
      this.downtime += Date.now() - this.lastDowntimeStart;
      this.lastDowntimeStart = undefined;
      this.saveState();
    }
  }
  
  getUptimePercentage(): number {
    const totalTime = Date.now() - this.startTime;
    const uptime = totalTime - this.downtime;
    return (uptime / totalTime) * 100;
  }
  
  getUptimeString(): string {
    const percentage = this.getUptimePercentage();
    return `${percentage.toFixed(3)}%`;
  }
  
  getTotalDowntime(): number {
    return this.downtime + (this.lastDowntimeStart ? Date.now() - this.lastDowntimeStart : 0);
  }
  
  reset(): void {
    this.startTime = Date.now();
    this.downtime = 0;
    this.lastDowntimeStart = undefined;
    this.saveState();
  }
}

// ============================================================
// Alerting System
// ============================================================

export interface Alert {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  acknowledged: boolean;
}

export class AlertManager {
  private alerts: Alert[] = [];
  private maxAlerts = 100;
  private webhookUrl?: string;
  
  constructor(config?: { webhookUrl?: string }) {
    this.webhookUrl = config?.webhookUrl;
    this.loadAlerts();
  }
  
  private loadAlerts(): void {
    try {
      const stored = localStorage.getItem('alerts');
      if (stored) {
        this.alerts = JSON.parse(stored);
      }
    } catch {
      this.alerts = [];
    }
  }
  
  private saveAlerts(): void {
    try {
      localStorage.setItem('alerts', JSON.stringify(this.alerts.slice(-this.maxAlerts)));
    } catch {
      // Storage full
    }
  }
  
  async triggerAlert(title: string, message: string, severity: Alert['severity'] = 'warning'): Promise<void> {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      title,
      message,
      severity,
      acknowledged: false,
    };
    
    this.alerts.push(alert);
    this.saveAlerts();
    
    // Send to webhook if configured
    if (this.webhookUrl) {
      await this.sendToWebhook(alert);
    }
    
    // Show browser notification if permitted
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        tag: alert.id,
      });
    }
    
    console.log(`[${severity.toUpperCase()}] ${title}: ${message}`);
  }
  
  private async sendToWebhook(alert: Alert): Promise<void> {
    try {
      await fetch(this.webhookUrl!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `*${alert.title}*\n${alert.message}\nSeverity: ${alert.severity}`,
        }),
      });
    } catch (error) {
      console.error('Failed to send alert to webhook:', error);
    }
  }
  
  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.saveAlerts();
    }
  }
  
  getAlerts(filter?: { severity?: Alert['severity']; acknowledged?: boolean }): Alert[] {
    let filtered = [...this.alerts];
    
    if (filter?.severity) {
      filtered = filtered.filter(a => a.severity === filter.severity);
    }
    
    if (filter?.acknowledged !== undefined) {
      filtered = filtered.filter(a => a.acknowledged === filter.acknowledged);
    }
    
    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  
  getUnacknowledgedCount(): number {
    return this.alerts.filter(a => !a.acknowledged).length;
  }
  
  clearAlerts(): void {
    this.alerts = [];
    this.saveAlerts();
  }
  
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
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
}

// ============================================================
// Log Aggregation
// ============================================================

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, unknown>;
}

export class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 5000;
  private level: LogEntry['level'] = 'info';
  
  constructor(config?: { level?: LogEntry['level'] }) {
    this.level = config?.level || 'info';
    this.loadLogs();
  }
  
  private loadLogs(): void {
    try {
      const stored = localStorage.getItem('application_logs');
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch {
      this.logs = [];
    }
  }
  
  private saveLogs(): void {
    try {
      localStorage.setItem('application_logs', JSON.stringify(this.logs.slice(-this.maxLogs)));
    } catch {
      // Storage full
    }
  }
  
  private shouldLog(level: LogEntry['level']): boolean {
    const levels: LogEntry['level'][] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }
  
  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      this.log('debug', message, context);
    }
  }
  
  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      this.log('info', message, context);
    }
  }
  
  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      this.log('warn', message, context);
    }
  }
  
  error(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      this.log('error', message, context);
    }
  }
  
  private log(level: LogEntry['level'], message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };
    
    this.logs.push(entry);
    this.saveLogs();
    
    // Console output
    const consoleMethod = level === 'warn' ? 'warn' : level === 'error' ? 'error' : 'log';
    console[consoleMethod](`[${level.toUpperCase()}] ${message}`, context || '');
  }
  
  getLogs(filter?: { level?: LogEntry['level']; limit?: number }): LogEntry[] {
    let filtered = [...this.logs];
    
    if (filter?.level) {
      filtered = filtered.filter(l => l.level === filter.level);
    }
    
    if (filter?.limit) {
      filtered = filtered.slice(-filter.limit);
    }
    
    return filtered;
  }
  
  clearLogs(): void {
    this.logs = [];
    this.saveLogs();
  }
  
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
  
  setLevel(level: LogEntry['level']): void {
    this.level = level;
  }
}

// ============================================================
// Metrics Collection
// ============================================================

export interface Metric {
  name: string;
  value: number;
  timestamp: string;
  tags?: Record<string, string>;
}

export class MetricsCollector {
  private metrics: Metric[] = [];
  private maxMetrics = 10000;
  
  record(name: string, value: number, tags?: Record<string, string>): void {
    const metric: Metric = {
      name,
      value,
      timestamp: new Date().toISOString(),
      tags,
    };
    
    this.metrics.push(metric);
    
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }
  
  getMetrics(name?: string, limit = 100): Metric[] {
    let filtered = [...this.metrics];
    
    if (name) {
      filtered = filtered.filter(m => m.name === name);
    }
    
    return filtered.slice(-limit);
  }
  
  getAverage(name: string, timeWindow = 3600000): number {
    const cutoff = Date.now() - timeWindow;
    const relevant = this.metrics.filter(m => 
      m.name === name && new Date(m.timestamp).getTime() > cutoff
    );
    
    if (relevant.length === 0) return 0;
    
    return relevant.reduce((sum, m) => sum + m.value, 0) / relevant.length;
  }
  
  clearMetrics(): void {
    this.metrics = [];
  }
  
  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2);
  }
}

// ============================================================
// Dashboard Utilities
// ============================================================

export function generateDashboardData(): {
  errors: ErrorReport[];
  performance: PerformanceReport[];
  alerts: Alert[];
  uptime: string;
  metrics: Record<string, number>;
} {
  const errorTracker = new ErrorTracker();
  const perfMonitor = new PerformanceMonitor();
  const alertManager = new AlertManager();
  const uptimeMonitor = new UptimeMonitor();
  const metricsCollector = new MetricsCollector();
  
  return {
    errors: errorTracker.getErrors({ limit: 10 }),
    performance: perfMonitor.getReports(10),
    alerts: alertManager.getAlerts().slice(0, 10),
    uptime: uptimeMonitor.getUptimeString(),
    metrics: metricsCollector.getAverage('requests_per_second') > 0 
      ? { requests_per_second: metricsCollector.getAverage('requests_per_second') }
      : {},
  };
}
