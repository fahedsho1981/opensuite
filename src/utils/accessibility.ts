/**
 * Accessibility Utilities for OpenSuite Document Editor
 * Provides WCAG compliance helpers, ARIA utilities, focus management,
 * keyboard navigation, and accessibility testing tools.
 */

// ============================================================
// WCAG Color Contrast
// ============================================================

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate relative luminance according to WCAG 2.0
 */
export function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 0;
  
  const lum1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Check if color combination meets WCAG AA standard
 */
export function meetsWCAGAA(foreground: string, background: string, isLargeText = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Check if color combination meets WCAG AAA standard
 */
export function meetsWCAGAAA(foreground: string, background: string, isLargeText = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 4.5 : ratio >= 7;
}

/**
 * Get WCAG compliance level for color combination
 */
export function getWCAGLevel(foreground: string, background: string, isLargeText = false): 'AAA' | 'AA' | 'Fail' {
  if (meetsWCAGAAA(foreground, background, isLargeText)) return 'AAA';
  if (meetsWCAGAA(foreground, background, isLargeText)) return 'AA';
  return 'Fail';
}

// ============================================================
// Focus Management
// ============================================================

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement = document.body): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ];
  
  const elements = container.querySelectorAll<HTMLElement>(focusableSelectors.join(', '));
  return Array.from(elements).filter((el) => {
    // Filter out elements that are not visible
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}

/**
 * Get first focusable element
 */
export function getFirstFocusableElement(container: HTMLElement = document.body): HTMLElement | null {
  const focusable = getFocusableElements(container);
  return focusable.length > 0 ? focusable[0] : null;
}

/**
 * Get last focusable element
 */
export function getLastFocusableElement(container: HTMLElement = document.body): HTMLElement | null {
  const focusable = getFocusableElements(container);
  return focusable.length > 0 ? focusable[focusable.length - 1] : null;
}

/**
 * Trap focus within a container (for modals, dialogs)
 */
export function trapFocus(container: HTMLElement): () => void {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    
    const focusable = getFocusableElements(container);
    if (focusable.length === 0) return;
    
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  
  container.addEventListener('keydown', handleKeyDown);
  
  // Focus first element
  const first = getFirstFocusableElement(container);
  if (first) first.focus();
  
  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Restore focus to previously focused element
 */
export function restoreFocus(element?: HTMLElement | null): void {
  if (element && typeof element.focus === 'function') {
    element.focus();
  }
}

/**
 * Check if element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  if (element.hasAttribute('disabled')) return false;
  if (element.getAttribute('tabindex') === '-1') return false;
  
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  
  const focusableTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
  if (focusableTags.includes(element.tagName)) return true;
  
  if (element.hasAttribute('tabindex')) return true;
  if (element.getAttribute('contenteditable') === 'true') return true;
  
  return false;
}

// ============================================================
// Keyboard Navigation
// ============================================================

export type ArrowKeyDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Handle arrow key navigation in a list/menu
 */
export function handleArrowNavigation(
  event: KeyboardEvent,
  elements: HTMLElement[],
  currentIndex: number,
  orientation: 'horizontal' | 'vertical' = 'vertical'
): number {
  const { key } = event;
  let newIndex = currentIndex;
  
  const isHorizontal = orientation === 'horizontal';
  const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';
  const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';
  
  switch (key) {
    case prevKey:
      event.preventDefault();
      newIndex = currentIndex > 0 ? currentIndex - 1 : elements.length - 1;
      break;
    case nextKey:
      event.preventDefault();
      newIndex = currentIndex < elements.length - 1 ? currentIndex + 1 : 0;
      break;
    case 'Home':
      event.preventDefault();
      newIndex = 0;
      break;
    case 'End':
      event.preventDefault();
      newIndex = elements.length - 1;
      break;
  }
  
  if (newIndex !== currentIndex && elements[newIndex]) {
    elements[newIndex].focus();
  }
  
  return newIndex;
}

/**
 * Create keyboard navigation handler for grid/matrix
 */
export function createGridNavigation(
  rows: number,
  cols: number,
  getElement: (row: number, col: number) => HTMLElement | null
): (event: KeyboardEvent, currentRow: number, currentCol: number) => { row: number; col: number } {
  return (event: KeyboardEvent, currentRow: number, currentCol: number) => {
    let newRow = currentRow;
    let newCol = currentCol;
    
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        newRow = currentRow > 0 ? currentRow - 1 : rows - 1;
        break;
      case 'ArrowDown':
        event.preventDefault();
        newRow = currentRow < rows - 1 ? currentRow + 1 : 0;
        break;
      case 'ArrowLeft':
        event.preventDefault();
        newCol = currentCol > 0 ? currentCol - 1 : cols - 1;
        break;
      case 'ArrowRight':
        event.preventDefault();
        newCol = currentCol < cols - 1 ? currentCol + 1 : 0;
        break;
      case 'Home':
        event.preventDefault();
        newCol = 0;
        break;
      case 'End':
        event.preventDefault();
        newCol = cols - 1;
        break;
    }
    
    const element = getElement(newRow, newCol);
    if (element) {
      element.focus();
    }
    
    return { row: newRow, col: newCol };
  };
}

/**
 * Handle roving tabindex pattern
 */
export function setupRovingTabindex(elements: HTMLElement[]): () => void {
  // Set initial tabindex
  elements.forEach((el, index) => {
    el.setAttribute('tabindex', index === 0 ? '0' : '-1');
  });
  
  const handleKeyDown = (event: KeyboardEvent) => {
    const currentIndex = elements.findIndex((el) => el === document.activeElement);
    if (currentIndex === -1) return;
    
    handleArrowNavigation(event, elements, currentIndex);
  };
  
  const handleFocus = (event: FocusEvent) => {
    elements.forEach((el) => {
      el.setAttribute('tabindex', el === event.target ? '0' : '-1');
    });
  };
  
  elements.forEach((el) => {
    el.addEventListener('keydown', handleKeyDown);
    el.addEventListener('focus', handleFocus);
  });
  
  return () => {
    elements.forEach((el) => {
      el.removeEventListener('keydown', handleKeyDown);
      el.removeEventListener('focus', handleFocus);
    });
  };
}

// ============================================================
// ARIA Utilities
// ============================================================

/**
 * Set ARIA attributes on an element
 */
export function setAriaAttributes(
  element: HTMLElement,
  attributes: Record<string, string | boolean | number>
): void {
  Object.entries(attributes).forEach(([key, value]) => {
    const attrName = key.startsWith('aria-') ? key : `aria-${key}`;
    element.setAttribute(attrName, String(value));
  });
}

/**
 * Generate unique ID for ARIA relationships
 */
export function generateAriaId(prefix = 'aria'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create ARIA live region for announcements
 */
export function createLiveRegion(
  politeness: 'polite' | 'assertive' = 'polite'
): HTMLElement {
  const region = document.createElement('div');
  region.setAttribute('aria-live', politeness);
  region.setAttribute('aria-atomic', 'true');
  region.setAttribute('role', 'status');
  region.style.position = 'absolute';
  region.style.left = '-10000px';
  region.style.width = '1px';
  region.style.height = '1px';
  region.style.overflow = 'hidden';
  
  document.body.appendChild(region);
  return region;
}

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(
  message: string,
  politeness: 'polite' | 'assertive' = 'polite'
): void {
  const region = createLiveRegion(politeness);
  region.textContent = message;
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(region);
  }, 1000);
}

/**
 * Validate ARIA attributes
 */
export function validateAriaAttributes(element: HTMLElement): string[] {
  const errors: string[] = [];
  const ariaAttributes = Array.from(element.attributes).filter((attr) =>
    attr.name.startsWith('aria-')
  );
  
  const validAriaAttributes = [
    'aria-activedescendant',
    'aria-atomic',
    'aria-autocomplete',
    'aria-busy',
    'aria-checked',
    'aria-colcount',
    'aria-colindex',
    'aria-colspan',
    'aria-controls',
    'aria-current',
    'aria-describedby',
    'aria-details',
    'aria-disabled',
    'aria-dropeffect',
    'aria-errormessage',
    'aria-expanded',
    'aria-flowto',
    'aria-grabbed',
    'aria-haspopup',
    'aria-hidden',
    'aria-invalid',
    'aria-keyshortcuts',
    'aria-label',
    'aria-labelledby',
    'aria-level',
    'aria-live',
    'aria-modal',
    'aria-multiline',
    'aria-multiselectable',
    'aria-orientation',
    'aria-owns',
    'aria-placeholder',
    'aria-posinset',
    'aria-pressed',
    'aria-readonly',
    'aria-relevant',
    'aria-required',
    'aria-roledescription',
    'aria-rowcount',
    'aria-rowindex',
    'aria-rowspan',
    'aria-selected',
    'aria-setsize',
    'aria-sort',
    'aria-valuemax',
    'aria-valuemin',
    'aria-valuenow',
    'aria-valuetext',
  ];
  
  ariaAttributes.forEach((attr) => {
    if (!validAriaAttributes.includes(attr.name)) {
      errors.push(`Invalid ARIA attribute: ${attr.name}`);
    }
  });
  
  // Check for required attributes based on role
  const role = element.getAttribute('role');
  if (role) {
    const requiredAttrs: Record<string, string[]> = {
      checkbox: ['aria-checked'],
      combobox: ['aria-expanded'],
      meter: ['aria-valuenow'],
      option: ['aria-selected'],
      progressbar: ['aria-valuenow'],
      scrollbar: ['aria-valuenow', 'aria-controls'],
      separator: [],
      slider: ['aria-valuenow'],
      switch: ['aria-checked'],
    };
    
    const required = requiredAttrs[role];
    if (required) {
      required.forEach((attr) => {
        if (!element.hasAttribute(attr)) {
          errors.push(`Missing required ARIA attribute for role="${role}": ${attr}`);
        }
      });
    }
  }
  
  return errors;
}

// ============================================================
// Screen Reader Utilities
// ============================================================

/**
 * Hide element from screen readers
 */
export function hideFromScreenReader(element: HTMLElement): void {
  element.setAttribute('aria-hidden', 'true');
}

/**
 * Show element to screen readers
 */
export function showToScreenReader(element: HTMLElement): void {
  element.removeAttribute('aria-hidden');
}

/**
 * Make element invisible but accessible to screen readers
 */
export function makeScreenReaderOnly(element: HTMLElement): void {
  element.style.position = 'absolute';
  element.style.left = '-10000px';
  element.style.width = '1px';
  element.style.height = '1px';
  element.style.overflow = 'hidden';
}

/**
 * Add screen reader text
 */
export function addScreenReaderText(element: HTMLElement, text: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = 'sr-only';
  span.textContent = text;
  element.appendChild(span);
  return span;
}

// ============================================================
// Accessibility Testing
// ============================================================

export interface AccessibilityIssue {
  severity: 'error' | 'warning' | 'info';
  wcagCriterion: string;
  message: string;
  element?: HTMLElement;
  recommendation: string;
}

/**
 * Run accessibility audit on container
 */
export function runAccessibilityAudit(container: HTMLElement = document.body): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  
  // Check for images without alt text
  const images = container.querySelectorAll('img');
  images.forEach((img) => {
    if (!img.hasAttribute('alt')) {
      issues.push({
        severity: 'error',
        wcagCriterion: '1.1.1',
        message: 'Image missing alt attribute',
        element: img as HTMLElement,
        recommendation: 'Add descriptive alt text to all images',
      });
    }
  });
  
  // Check for form inputs without labels
  const inputs = container.querySelectorAll('input, select, textarea');
  inputs.forEach((input) => {
    const id = input.getAttribute('id');
    const hasLabel = id && container.querySelector(`label[for="${id}"]`);
    const hasAriaLabel = input.hasAttribute('aria-label') || input.hasAttribute('aria-labelledby');
    const hasTitle = input.hasAttribute('title');
    
    if (!hasLabel && !hasAriaLabel && !hasTitle) {
      issues.push({
        severity: 'error',
        wcagCriterion: '1.3.1',
        message: 'Form input missing label',
        element: input as HTMLElement,
        recommendation: 'Add a label element or aria-label attribute',
      });
    }
  });
  
  // Check for buttons without accessible names
  const buttons = container.querySelectorAll('button');
  buttons.forEach((button) => {
    const hasText = button.textContent && button.textContent.trim().length > 0;
    const hasAriaLabel = button.hasAttribute('aria-label');
    const hasAriaLabelledby = button.hasAttribute('aria-labelledby');
    const hasTitle = button.hasAttribute('title');
    
    if (!hasText && !hasAriaLabel && !hasAriaLabelledby && !hasTitle) {
      issues.push({
        severity: 'error',
        wcagCriterion: '4.1.2',
        message: 'Button missing accessible name',
        element: button as HTMLElement,
        recommendation: 'Add text content, aria-label, or title attribute',
      });
    }
  });
  
  // Check for links without accessible names
  const links = container.querySelectorAll('a');
  links.forEach((link) => {
    const hasText = link.textContent && link.textContent.trim().length > 0;
    const hasAriaLabel = link.hasAttribute('aria-label');
    const hasTitle = link.hasAttribute('title');
    const hasImg = link.querySelector('img[alt]');
    
    if (!hasText && !hasAriaLabel && !hasTitle && !hasImg) {
      issues.push({
        severity: 'error',
        wcagCriterion: '4.1.2',
        message: 'Link missing accessible name',
        element: link as HTMLElement,
        recommendation: 'Add text content, aria-label, or title attribute',
      });
    }
  });
  
  // Check for color contrast issues
  const textElements = container.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, a, button, label');
  textElements.forEach((element) => {
    const styles = window.getComputedStyle(element);
    const color = styles.color;
    const backgroundColor = styles.backgroundColor;
    
    // Simple contrast check (would need proper color parsing for production)
    if (color && backgroundColor && color === backgroundColor) {
      issues.push({
        severity: 'warning',
        wcagCriterion: '1.4.3',
        message: 'Potential color contrast issue',
        element: element as HTMLElement,
        recommendation: 'Ensure text has sufficient contrast with background (4.5:1 for normal text, 3:1 for large text)',
      });
    }
  });
  
  // Check for missing heading hierarchy
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let lastLevel = 0;
  headings.forEach((heading) => {
    const level = parseInt(heading.tagName.charAt(1));
    if (level > lastLevel + 1 && lastLevel > 0) {
      issues.push({
        severity: 'warning',
        wcagCriterion: '1.3.1',
        message: `Heading level skipped: h${lastLevel} to h${level}`,
        element: heading as HTMLElement,
        recommendation: 'Maintain proper heading hierarchy (h1 > h2 > h3, etc.)',
      });
    }
    lastLevel = level;
  });
  
  // Check for missing language attribute
  if (!document.documentElement.hasAttribute('lang')) {
    issues.push({
      severity: 'error',
      wcagCriterion: '3.1.1',
      message: 'Document missing lang attribute',
      recommendation: 'Add lang attribute to <html> element',
    });
  }
  
  // Check for ARIA attribute validity
  const allElements = container.querySelectorAll('*');
  allElements.forEach((element) => {
    const errors = validateAriaAttributes(element as HTMLElement);
    errors.forEach((error) => {
      issues.push({
        severity: 'warning',
        wcagCriterion: '4.1.2',
        message: error,
        element: element as HTMLElement,
        recommendation: 'Use valid ARIA attributes according to WAI-ARIA specification',
      });
    });
  });
  
  return issues;
}

/**
 * Get accessibility score (0-100)
 */
export function getAccessibilityScore(issues: AccessibilityIssue[]): number {
  const weights = {
    error: 10,
    warning: 5,
    info: 1,
  };
  
  const totalDeduction = issues.reduce((sum, issue) => sum + weights[issue.severity], 0);
  return Math.max(0, 100 - totalDeduction);
}

/**
 * Generate accessibility report
 */
export function generateAccessibilityReport(issues: AccessibilityIssue[]): string {
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const info = issues.filter((i) => i.severity === 'info');
  const score = getAccessibilityScore(issues);
  
  return `
Accessibility Report
====================
Score: ${score}/100

Errors: ${errors.length}
Warnings: ${warnings.length}
Info: ${info.length}

${errors.length > 0 ? '\nCritical Issues:\n' + errors.map((e) => `- ${e.message}`).join('\n') : ''}
${warnings.length > 0 ? '\nWarnings:\n' + warnings.map((w) => `- ${w.message}`).join('\n') : ''}
  `.trim();
}

// ============================================================
// Skip Links
// ============================================================

/**
 * Create skip navigation link
 */
export function createSkipLink(targetId: string, text = 'Skip to main content'): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = `#${targetId}`;
  link.textContent = text;
  link.className = 'skip-link';
  link.style.cssText = `
    position: absolute;
    top: -40px;
    left: 0;
    background: #000;
    color: #fff;
    padding: 8px;
    text-decoration: none;
    z-index: 10000;
  `;
  
  link.addEventListener('focus', () => {
    link.style.top = '0';
  });
  
  link.addEventListener('blur', () => {
    link.style.top = '-40px';
  });
  
  return link;
}

/**
 * Add skip links to page
 */
export function addSkipLinks(targets: Array<{ id: string; text: string }>): void {
  targets.forEach(({ id, text }) => {
    const link = createSkipLink(id, text);
    document.body.insertBefore(link, document.body.firstChild);
  });
}

// ============================================================
// Focus Visible Polyfill
// ============================================================

/**
 * Add focus-visible class for better keyboard navigation indication
 */
export function setupFocusVisible(): () => void {
  let hadKeyboardEvent = false;
  
  const handleKeyDown = () => {
    hadKeyboardEvent = true;
  };
  
  const handlePointerDown = () => {
    hadKeyboardEvent = false;
  };
  
  const handleFocus = (e: FocusEvent) => {
    if (hadKeyboardEvent && e.target instanceof HTMLElement) {
      e.target.classList.add('focus-visible');
    }
  };
  
  const handleBlur = (e: FocusEvent) => {
    if (e.target instanceof HTMLElement) {
      e.target.classList.remove('focus-visible');
    }
  };
  
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('mousedown', handlePointerDown);
  document.addEventListener('pointerdown', handlePointerDown);
  document.addEventListener('touchstart', handlePointerDown);
  document.addEventListener('focus', handleFocus, true);
  document.addEventListener('blur', handleBlur, true);
  
  return () => {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('mousedown', handlePointerDown);
    document.removeEventListener('pointerdown', handlePointerDown);
    document.removeEventListener('touchstart', handlePointerDown);
    document.removeEventListener('focus', handleFocus, true);
    document.removeEventListener('blur', handleBlur, true);
  };
}
