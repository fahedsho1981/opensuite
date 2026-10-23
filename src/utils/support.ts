/**
 * User Support & Onboarding Utilities for OpenSuite Document Editor
 * Provides help center, onboarding tours, tooltips, FAQs,
 * and user support features.
 */

// ============================================================
// Help Center
// ============================================================

export interface HelpArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
  lastUpdated: string;
  views: number;
}

export class HelpCenter {
  private articles: HelpArticle[] = [];
  
  constructor() {
    this.loadArticles();
  }
  
  private loadArticles(): void {
    // Default help articles
    this.articles = [
      {
        id: 'getting-started',
        title: 'Getting Started with OpenSuite',
        category: 'Basics',
        content: `
          <h2>Welcome to OpenSuite!</h2>
          <p>OpenSuite is a powerful document editor that helps you create, edit, and collaborate on documents in real-time.</p>
          
          <h3>Creating Your First Document</h3>
          <ol>
            <li>Click the "New Document" button in the top-left corner</li>
            <li>Choose a template or start with a blank document</li>
            <li>Start typing to add content</li>
            <li>Use the toolbar to format your text</li>
          </ol>
          
          <h3>Saving Your Work</h3>
          <p>Documents are automatically saved as you type. You can also manually save by pressing Ctrl+S (Cmd+S on Mac).</p>
          
          <h3>Sharing Documents</h3>
          <p>Click the "Share" button to invite collaborators. You can control their access level (view, comment, or edit).</p>
        `,
        tags: ['getting started', 'basics', 'tutorial'],
        lastUpdated: '2024-01-20',
        views: 0,
      },
      {
        id: 'formatting-text',
        title: 'Formatting Text',
        category: 'Editing',
        content: `
          <h2>Text Formatting</h2>
          <p>OpenSuite provides comprehensive text formatting options to make your documents look professional.</p>
          
          <h3>Basic Formatting</h3>
          <ul>
            <li><strong>Bold:</strong> Select text and press Ctrl+B or click the Bold button</li>
            <li><em>Italic:</em> Select text and press Ctrl+I or click the Italic button</li>
            <li><u>Underline:</u> Select text and press Ctrl+U or click the Underline button</li>
          </ul>
          
          <h3>Font and Size</h3>
          <p>Use the font dropdown to change the typeface and the size dropdown to adjust text size.</p>
          
          <h3>Text Color</h3>
          <p>Click the text color button to choose from a palette of colors or enter a custom hex code.</p>
          
          <h3>Alignment</h3>
          <p>Use the alignment buttons to left-align, center, right-align, or justify your text.</p>
        `,
        tags: ['formatting', 'text', 'style'],
        lastUpdated: '2024-01-20',
        views: 0,
      },
      {
        id: 'collaboration',
        title: 'Real-time Collaboration',
        category: 'Collaboration',
        content: `
          <h2>Working Together</h2>
          <p>OpenSuite makes it easy to collaborate with others in real-time.</p>
          
          <h3>Inviting Collaborators</h3>
          <ol>
            <li>Click the "Share" button in the top-right corner</li>
            <li>Enter the email addresses of people you want to invite</li>
            <li>Choose their permission level (View, Comment, or Edit)</li>
            <li>Click "Send Invites"</li>
          </ol>
          
          <h3>Seeing Others' Changes</h3>
          <p>When collaborators are editing, you'll see their cursors and names in real-time. Changes appear instantly.</p>
          
          <h3>Comments</h3>
          <p>Select text and click the comment icon to add a comment. Others can reply to your comments.</p>
          
          <h3>Version History</h3>
          <p>Click "File" > "Version History" to see all changes and restore previous versions.</p>
        `,
        tags: ['collaboration', 'sharing', 'real-time'],
        lastUpdated: '2024-01-20',
        views: 0,
      },
      {
        id: 'keyboard-shortcuts',
        title: 'Keyboard Shortcuts',
        category: 'Productivity',
        content: `
          <h2>Keyboard Shortcuts</h2>
          <p>Speed up your workflow with these keyboard shortcuts.</p>
          
          <h3>General</h3>
          <ul>
            <li><kbd>Ctrl+S</kbd> - Save document</li>
            <li><kbd>Ctrl+Z</kbd> - Undo</li>
            <li><kbd>Ctrl+Y</kbd> - Redo</li>
            <li><kbd>Ctrl+F</kbd> - Find</li>
            <li><kbd>Ctrl+H</kbd> - Find and Replace</li>
          </ul>
          
          <h3>Formatting</h3>
          <ul>
            <li><kbd>Ctrl+B</kbd> - Bold</li>
            <li><kbd>Ctrl+I</kbd> - Italic</li>
            <li><kbd>Ctrl+U</kbd> - Underline</li>
            <li><kbd>Ctrl+Shift+></kbd> - Increase font size</li>
            <li><kbd>Ctrl+Shift+<</kbd> - Decrease font size</li>
          </ul>
          
          <h3>Navigation</h3>
          <ul>
            <li><kbd>Ctrl+Home</kbd> - Go to beginning</li>
            <li><kbd>Ctrl+End</kbd> - Go to end</li>
            <li><kbd>Ctrl+G</kbd> - Go to page</li>
          </ul>
        `,
        tags: ['shortcuts', 'keyboard', 'productivity'],
        lastUpdated: '2024-01-20',
        views: 0,
      },
      {
        id: 'troubleshooting',
        title: 'Troubleshooting Common Issues',
        category: 'Support',
        content: `
          <h2>Troubleshooting</h2>
          <p>Having issues? Here are solutions to common problems.</p>
          
          <h3>Document Won't Save</h3>
          <ul>
            <li>Check your internet connection</li>
            <li>Try refreshing the page</li>
            <li>Clear your browser cache</li>
            <li>Try a different browser</li>
          </ul>
          
          <h3>Formatting Not Applying</h3>
          <ul>
            <li>Make sure text is selected before applying formatting</li>
            <li>Try using keyboard shortcuts instead of toolbar buttons</li>
            <li>Check if you're in "View Only" mode</li>
          </ul>
          
          <h3>Collaboration Not Working</h3>
          <ul>
            <li>Verify you have edit permissions</li>
            <li>Check that all users are on the same document</li>
            <li>Refresh the page to reconnect</li>
          </ul>
          
          <h3>Still Having Issues?</h3>
          <p>Contact our support team at support@opensuite.com or use the in-app chat.</p>
        `,
        tags: ['troubleshooting', 'help', 'support'],
        lastUpdated: '2024-01-20',
        views: 0,
      },
    ];
  }
  
  getArticles(category?: string): HelpArticle[] {
    if (category) {
      return this.articles.filter(a => a.category === category);
    }
    return [...this.articles];
  }
  
  getArticle(id: string): HelpArticle | undefined {
    const article = this.articles.find(a => a.id === id);
    if (article) {
      article.views++;
    }
    return article;
  }
  
  searchArticles(query: string): HelpArticle[] {
    const lowerQuery = query.toLowerCase();
    return this.articles.filter(article => 
      article.title.toLowerCase().includes(lowerQuery) ||
      article.content.toLowerCase().includes(lowerQuery) ||
      article.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }
  
  getCategories(): string[] {
    const categories = new Set(this.articles.map(a => a.category));
    return Array.from(categories);
  }
  
  getPopularArticles(limit = 5): HelpArticle[] {
    return [...this.articles]
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  }
}

// ============================================================
// Onboarding Tour
// ============================================================

export interface TourStep {
  target: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void;
}

export class OnboardingTour {
  private steps: TourStep[] = [];
  private currentStep = 0;
  private overlay: HTMLElement | null = null;
  private tooltip: HTMLElement | null = null;
  private onComplete?: () => void;
  
  constructor(steps: TourStep[], onComplete?: () => void) {
    this.steps = steps;
    this.onComplete = onComplete;
  }
  
  start(): void {
    this.currentStep = 0;
    this.createOverlay();
    this.showStep();
  }
  
  private createOverlay(): void {
    this.overlay = document.createElement('div');
    this.overlay.className = 'tour-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9998;
      pointer-events: none;
    `;
    
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'tour-tooltip';
    this.tooltip.style.cssText = `
      position: fixed;
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      z-index: 9999;
      max-width: 400px;
      pointer-events: auto;
    `;
    
    document.body.appendChild(this.overlay);
    document.body.appendChild(this.tooltip);
  }
  
  private showStep(): void {
    if (this.currentStep >= this.steps.length) {
      this.complete();
      return;
    }
    
    const step = this.steps[this.currentStep];
    const target = document.querySelector(step.target) as HTMLElement;
    
    if (!target) {
      this.next();
      return;
    }
    
    // Highlight target
    target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.5)';
    target.style.borderRadius = '4px';
    
    // Position tooltip
    const rect = target.getBoundingClientRect();
    const position = step.position || 'bottom';
    
    let top = 0;
    let left = 0;
    
    switch (position) {
      case 'top':
        top = rect.top - 10;
        left = rect.left + rect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + 10;
        left = rect.left + rect.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - 10;
        break;
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + 10;
        break;
    }
    
    if (this.tooltip) {
      this.tooltip.innerHTML = `
        <h3 style="margin: 0 0 10px 0; font-size: 18px;">${step.title}</h3>
        <p style="margin: 0 0 15px 0; color: #666;">${step.content}</p>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #999; font-size: 14px;">Step ${this.currentStep + 1} of ${this.steps.length}</span>
          <div>
            ${this.currentStep > 0 ? '<button class="tour-prev" style="margin-right: 8px; padding: 8px 16px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;">Previous</button>' : ''}
            <button class="tour-next" style="padding: 8px 16px; border: none; border-radius: 4px; background: #3b82f6; color: white; cursor: pointer;">${this.currentStep === this.steps.length - 1 ? 'Finish' : 'Next'}</button>
          </div>
        </div>
      `;
      
      this.tooltip.style.top = `${top}px`;
      this.tooltip.style.left = `${left}px`;
      this.tooltip.style.transform = 'translate(-50%, 0)';
      
      // Add event listeners
      const prevBtn = this.tooltip.querySelector('.tour-prev');
      const nextBtn = this.tooltip.querySelector('.tour-next');
      
      prevBtn?.addEventListener('click', () => this.previous());
      nextBtn?.addEventListener('click', () => this.next());
    }
    
    // Execute action if defined
    if (step.action) {
      step.action();
    }
  }
  
  next(): void {
    // Remove highlight from current target
    if (this.currentStep < this.steps.length) {
      const target = document.querySelector(this.steps[this.currentStep].target) as HTMLElement;
      if (target) {
        target.style.boxShadow = '';
        target.style.borderRadius = '';
      }
    }
    
    this.currentStep++;
    this.showStep();
  }
  
  previous(): void {
    if (this.currentStep > 0) {
      // Remove highlight from current target
      const target = document.querySelector(this.steps[this.currentStep].target) as HTMLElement;
      if (target) {
        target.style.boxShadow = '';
        target.style.borderRadius = '';
      }
      
      this.currentStep--;
      this.showStep();
    }
  }
  
  private complete(): void {
    this.destroy();
    if (this.onComplete) {
      this.onComplete();
    }
    
    // Mark tour as completed
    localStorage.setItem('onboarding_completed', 'true');
  }
  
  skip(): void {
    this.complete();
  }
  
  destroy(): void {
    if (this.overlay) {
      document.body.removeChild(this.overlay);
      this.overlay = null;
    }
    
    if (this.tooltip) {
      document.body.removeChild(this.tooltip);
      this.tooltip = null;
    }
  }
  
  isCompleted(): boolean {
    return localStorage.getItem('onboarding_completed') === 'true';
  }
  
  reset(): void {
    localStorage.removeItem('onboarding_completed');
  }
}

// ============================================================
// Tooltips
// ============================================================

export interface TooltipConfig {
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export class TooltipManager {
  private tooltips: Map<HTMLElement, TooltipConfig> = new Map();
  private activeTooltip: HTMLElement | null = null;
  
  constructor() {
    this.setupGlobalListeners();
  }
  
  private setupGlobalListeners(): void {
    document.addEventListener('mouseover', (e) => {
      const target = e.target as HTMLElement;
      const config = this.tooltips.get(target);
      
      if (config) {
        setTimeout(() => {
          this.showTooltip(target, config);
        }, config.delay || 200);
      }
    });
    
    document.addEventListener('mouseout', (e) => {
      const target = e.target as HTMLElement;
      if (this.tooltips.has(target)) {
        this.hideTooltip();
      }
    });
  }
  
  register(element: HTMLElement, config: TooltipConfig): void {
    this.tooltips.set(element, config);
  }
  
  unregister(element: HTMLElement): void {
    this.tooltips.delete(element);
  }
  
  private showTooltip(element: HTMLElement, config: TooltipConfig): void {
    this.hideTooltip();
    
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = config.text;
    tooltip.style.cssText = `
      position: fixed;
      background: #333;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 10000;
      pointer-events: none;
      white-space: nowrap;
    `;
    
    document.body.appendChild(tooltip);
    
    const rect = element.getBoundingClientRect();
    const position = config.position || 'top';
    
    let top = 0;
    let left = 0;
    
    switch (position) {
      case 'top':
        top = rect.top - tooltip.offsetHeight - 8;
        left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2;
        break;
      case 'bottom':
        top = rect.bottom + 8;
        left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltip.offsetHeight / 2;
        left = rect.left - tooltip.offsetWidth - 8;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tooltip.offsetHeight / 2;
        left = rect.right + 8;
        break;
    }
    
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
    
    this.activeTooltip = tooltip;
  }
  
  private hideTooltip(): void {
    if (this.activeTooltip) {
      document.body.removeChild(this.activeTooltip);
      this.activeTooltip = null;
    }
  }
  
  registerAll(selector: string, config: TooltipConfig): void {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      this.register(element as HTMLElement, config);
    });
  }
}

// ============================================================
// FAQ System
// ============================================================

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful?: number;
  notHelpful?: number;
}

export class FAQSystem {
  private faqs: FAQ[] = [];
  
  constructor() {
    this.loadFAQs();
  }
  
  private loadFAQs(): void {
    this.faqs = [
      {
        id: 'faq-1',
        question: 'How do I share a document?',
        answer: 'Click the "Share" button in the top-right corner, enter email addresses, choose permission levels, and click "Send Invites".',
        category: 'Sharing',
        helpful: 0,
        notHelpful: 0,
      },
      {
        id: 'faq-2',
        question: 'Can I work offline?',
        answer: 'Yes! OpenSuite automatically saves your work locally. Changes will sync when you reconnect to the internet.',
        category: 'General',
        helpful: 0,
        notHelpful: 0,
      },
      {
        id: 'faq-3',
        question: 'How do I export my document?',
        answer: 'Go to File > Export and choose your desired format (PDF, DOCX, HTML, or Markdown).',
        category: 'Export',
        helpful: 0,
        notHelpful: 0,
      },
      {
        id: 'faq-4',
        question: 'Can I undo changes?',
        answer: 'Yes! Press Ctrl+Z (Cmd+Z on Mac) to undo. You can also click the Undo button in the toolbar.',
        category: 'Editing',
        helpful: 0,
        notHelpful: 0,
      },
      {
        id: 'faq-5',
        question: 'How do I add comments?',
        answer: 'Select the text you want to comment on, then click the comment icon in the toolbar or press Ctrl+Alt+M.',
        category: 'Collaboration',
        helpful: 0,
        notHelpful: 0,
      },
    ];
  }
  
  getFAQs(category?: string): FAQ[] {
    if (category) {
      return this.faqs.filter(f => f.category === category);
    }
    return [...this.faqs];
  }
  
  searchFAQs(query: string): FAQ[] {
    const lowerQuery = query.toLowerCase();
    return this.faqs.filter(faq =>
      faq.question.toLowerCase().includes(lowerQuery) ||
      faq.answer.toLowerCase().includes(lowerQuery)
    );
  }
  
  markHelpful(faqId: string, helpful: boolean): void {
    const faq = this.faqs.find(f => f.id === faqId);
    if (faq) {
      if (helpful) {
        faq.helpful = (faq.helpful || 0) + 1;
      } else {
        faq.notHelpful = (faq.notHelpful || 0) + 1;
      }
    }
  }
  
  getCategories(): string[] {
    const categories = new Set(this.faqs.map(f => f.category));
    return Array.from(categories);
  }
}

// ============================================================
// User Feedback
// ============================================================

export interface Feedback {
  id: string;
  type: 'bug' | 'feature' | 'improvement' | 'other';
  message: string;
  email?: string;
  timestamp: string;
  userAgent: string;
  url: string;
}

export class FeedbackCollector {
  private feedbacks: Feedback[] = [];
  
  constructor() {
    this.loadFeedbacks();
  }
  
  private loadFeedbacks(): void {
    try {
      const stored = localStorage.getItem('user_feedback');
      if (stored) {
        this.feedbacks = JSON.parse(stored);
      }
    } catch {
      this.feedbacks = [];
    }
  }
  
  private saveFeedbacks(): void {
    try {
      localStorage.setItem('user_feedback', JSON.stringify(this.feedbacks));
    } catch {
      console.error('Failed to save feedback');
    }
  }
  
  submitFeedback(
    type: Feedback['type'],
    message: string,
    email?: string
  ): Feedback {
    const feedback: Feedback = {
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      email,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
    
    this.feedbacks.push(feedback);
    this.saveFeedbacks();
    
    return feedback;
  }
  
  getFeedbacks(): Feedback[] {
    return [...this.feedbacks].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
  
  exportFeedbacks(): string {
    return JSON.stringify(this.feedbacks, null, 2);
  }
}

// ============================================================
// Contextual Help
// ============================================================

export class ContextualHelp {
  private helpMap: Map<string, string> = new Map();
  
  constructor() {
    this.loadHelpMap();
  }
  
  private loadHelpMap(): void {
    this.helpMap.set('toolbar-bold', 'Make text bold. Shortcut: Ctrl+B (Cmd+B on Mac)');
    this.helpMap.set('toolbar-italic', 'Make text italic. Shortcut: Ctrl+I (Cmd+I on Mac)');
    this.helpMap.set('toolbar-underline', 'Underline text. Shortcut: Ctrl+U (Cmd+U on Mac)');
    this.helpMap.set('toolbar-align-left', 'Align text to the left');
    this.helpMap.set('toolbar-align-center', 'Center text');
    this.helpMap.set('toolbar-align-right', 'Align text to the right');
    this.helpMap.set('toolbar-list', 'Create a bulleted list');
    this.helpMap.set('toolbar-numbered-list', 'Create a numbered list');
    this.helpMap.set('toolbar-link', 'Insert a hyperlink');
    this.helpMap.set('toolbar-image', 'Insert an image');
    this.helpMap.set('toolbar-table', 'Insert a table');
    this.helpMap.set('share-button', 'Share this document with others');
    this.helpMap.set('comment-button', 'Add a comment to selected text');
  }
  
  getHelp(elementId: string): string | undefined {
    return this.helpMap.get(elementId);
  }
  
  registerHelp(elementId: string, helpText: string): void {
    this.helpMap.set(elementId, helpText);
  }
  
  setupContextualHelp(): void {
    const tooltipManager = new TooltipManager();
    
    this.helpMap.forEach((helpText, elementId) => {
      const element = document.getElementById(elementId);
      if (element) {
        tooltipManager.register(element, {
          text: helpText,
          position: 'bottom',
          delay: 500,
        });
      }
    });
  }
}

// ============================================================
// Interactive Guide
// ============================================================

export class InteractiveGuide {
  private steps: Array<{
    title: string;
    content: string;
    action?: () => void;
  }> = [];
  private currentStep = 0;
  
  addStep(title: string, content: string, action?: () => void): void {
    this.steps.push({ title, content, action });
  }
  
  start(): void {
    this.currentStep = 0;
    this.showCurrentStep();
  }
  
  private showCurrentStep(): void {
    if (this.currentStep >= this.steps.length) {
      this.complete();
      return;
    }
    
    const step = this.steps[this.currentStep];
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'interactive-guide-modal';
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      max-width: 500px;
    `;
    
    modal.innerHTML = `
      <h2 style="margin: 0 0 15px 0;">${step.title}</h2>
      <p style="margin: 0 0 20px 0; color: #666; line-height: 1.6;">${step.content}</p>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="color: #999; font-size: 14px;">Step ${this.currentStep + 1} of ${this.steps.length}</span>
        <div>
          ${this.currentStep > 0 ? '<button class="guide-prev" style="margin-right: 10px; padding: 10px 20px; border: 1px solid #ddd; border-radius: 6px; background: white; cursor: pointer;">Back</button>' : ''}
          <button class="guide-next" style="padding: 10px 20px; border: none; border-radius: 6px; background: #3b82f6; color: white; cursor: pointer; font-weight: 500;">${this.currentStep === this.steps.length - 1 ? 'Finish' : 'Next'}</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    const prevBtn = modal.querySelector('.guide-prev');
    const nextBtn = modal.querySelector('.guide-next');
    
    prevBtn?.addEventListener('click', () => {
      document.body.removeChild(modal);
      this.currentStep--;
      this.showCurrentStep();
    });
    
    nextBtn?.addEventListener('click', () => {
      document.body.removeChild(modal);
      
      // Execute action if defined
      if (step.action) {
        step.action();
      }
      
      this.currentStep++;
      this.showCurrentStep();
    });
    
    // Execute action for current step
    if (step.action) {
      step.action();
    }
  }
  
  private complete(): void {
    localStorage.setItem('interactive_guide_completed', 'true');
  }
  
  isCompleted(): boolean {
    return localStorage.getItem('interactive_guide_completed') === 'true';
  }
  
  reset(): void {
    localStorage.removeItem('interactive_guide_completed');
  }
}
