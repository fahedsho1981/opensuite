import { describe, it, expect } from 'vitest';
import {
  sanitizeHTML,
  sanitizeURL,
  validateURL,
  scanDocumentSecurity,
  getSecurityScore,
} from '../utils/security';

describe('Security Utilities', () => {
  describe('sanitizeHTML', () => {
    it('removes script tags', () => {
      const input = '<p>Hello</p><script>alert("xss")</script>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Hello</p>');
    });

    it('removes event handlers', () => {
      const input = '<img src="x" onerror="alert(1)">';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('onerror');
    });

    it('removes javascript: URLs', () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('javascript:');
    });

    it('preserves safe HTML', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      const result = sanitizeHTML(input);
      expect(result).toBe(input);
    });
  });

  describe('sanitizeURL', () => {
    it('blocks javascript: protocol', () => {
      const result = sanitizeURL('javascript:alert(1)');
      expect(result).toBe('');
    });

    it('adds https:// to URLs without protocol', () => {
      const result = sanitizeURL('example.com');
      expect(result).toBe('https://example.com');
    });

    it('preserves valid URLs', () => {
      const result = sanitizeURL('https://example.com');
      expect(result).toBe('https://example.com');
    });
  });

  describe('validateURL', () => {
    it('validates correct URLs', () => {
      expect(validateURL('https://example.com')).toBe(true);
      expect(validateURL('http://example.com')).toBe(true);
    });

    it('rejects invalid URLs', () => {
      expect(validateURL('javascript:alert(1)')).toBe(false);
      expect(validateURL('')).toBe(false);
    });
  });

  describe('scanDocumentSecurity', () => {
    it('detects inline scripts', () => {
      const html = '<p>Hello</p><script>alert(1)</script>';
      const issues = scanDocumentSecurity(html);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].severity).toBe('critical');
    });

    it('detects event handlers', () => {
      const html = '<img src="x" onerror="alert(1)">';
      const issues = scanDocumentSecurity(html);
      expect(issues.some(i => i.category === 'XSS')).toBe(true);
    });

    it('returns empty array for safe HTML', () => {
      const html = '<p>Hello <strong>World</strong></p>';
      const issues = scanDocumentSecurity(html);
      expect(issues.length).toBe(0);
    });
  });

  describe('getSecurityScore', () => {
    it('returns 100 for no issues', () => {
      const score = getSecurityScore([]);
      expect(score).toBe(100);
    });

    it('reduces score for critical issues', () => {
      const issues = [{ severity: 'critical' as const, message: 'Test', category: 'XSS' }];
      const score = getSecurityScore(issues as any);
      expect(score).toBeLessThan(100);
    });
  });
});
