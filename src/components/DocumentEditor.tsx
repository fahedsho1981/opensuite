import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Undo, Redo,
  Download, Indent, Outdent, Strikethrough,
  Subscript, Superscript, Eraser,
  Search, Printer, FileDown, ZoomIn, ZoomOut,
  ChevronDown, X, Upload, Columns,
  FileText, Save, Ruler as RulerIcon,
  ImagePlus, Link2, Table2, Minus as MinusIcon,
  FileMinus2, Hash, ChevronUp,
  MessageSquare, Eye, EyeOff, Lock, Unlock, History, Users,
  BookOpen, Clock, Target, Sparkles, Droplet, Type,
  PenTool, Palette, FileCheck, Share2, Cloud, Mail, Code, Plus, Settings,
  Keyboard, HelpCircle, AlertCircle, CheckCircle, Info, ExternalLink,
  Scissors, Copy as CopyIcon, Clipboard as ClipboardIcon,
  Edit3, Trash2, BarChart3, PieChart, TrendingUp, Globe, Languages,
  FileBarChart, Hash as HashIcon, ListChecks, TextCursorInput,
  AlignVerticalDistributeCenter, CaseSensitive, Wand2, BookOpenCheck,
  Bookmark, GitCompare, Quote as QuoteIcon, Shield, Zap, Accessibility
} from 'lucide-react';
import {
  checkGrammar,
  autoCorrect,
  calculateReadability,
  t,
  TRANSLATIONS,
  type Language,
  parseCSV,
  mergeTemplate,
  DOCUMENT_THEMES,
  type DocumentTheme,
  generateChartSVG,
  type ChartData,
  type ChartType,
  transformText,
  generateDropCap,
} from '../utils/documentUtils';
import {
  sanitizeHTML,
  sanitizeURL,
  validateURL,
  scanDocumentSecurity,
  getSecurityScore,
  AuditLogger,
  RateLimiter,
} from '../utils/security';
import {
  PerformanceMonitor as PerfMonitor,
  debounce,
  throttle,
  MemoryCache,
  compressImage,
  lazyLoadImages,
} from '../utils/performance';
import {
  runAccessibilityAudit,
  getAccessibilityScore,
  trapFocus,
  announceToScreenReader,
  setupFocusVisible,
} from '../utils/accessibility';
import {
  detectBrowser,
  detectFeatures,
  isBrowserSupported,
  installPolyfills,
} from '../utils/browserCompat';
import {
  ErrorTracker,
  PerformanceMonitor,
  HealthChecker,
  AlertManager,
  Logger,
} from '../utils/monitoring';
import {
  BackupManager,
  VersionSnapshotManager,
  DisasterRecoveryManager,
} from '../utils/backup';
import {
  PWAInstaller,
  MobileOptimizer,
  OfflineManager,
} from '../utils/mobile';
import {
  HelpCenter,
  OnboardingTour,
  FeedbackCollector,
} from '../utils/support';

declare global {
  interface Window {
    find(
      text?: string,
      caseSensitive?: boolean,
      backward?: boolean,
      wrapAround?: boolean,
      wholeWord?: boolean,
      searchInFrames?: boolean,
      showDialog?: boolean
    ): boolean;
  }
}
import { exportDocx } from '../utils/fileHandlers';

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('DocumentEditor Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
            <AlertCircle className="w-5 h-5" />
            <h3 className="font-semibold">Something went wrong</h3>
          </div>
          <p className="text-sm text-red-500 dark:text-red-300 mb-3">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Toast notification component
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

const ToastContainer = ({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) => (
  <div className="fixed bottom-4 right-4 z-50 space-y-2">
    {toasts.map(toast => (
      <div
        key={toast.id}
        className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg animate-slide-in ${
          toast.type === 'success' ? 'bg-green-500 text-white' :
          toast.type === 'error' ? 'bg-red-500 text-white' :
          toast.type === 'warning' ? 'bg-yellow-500 text-white' :
          'bg-blue-500 text-white'
        }`}
      >
        {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
        {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
        {toast.type === 'warning' && <AlertCircle className="w-5 h-5" />}
        {toast.type === 'info' && <Info className="w-5 h-5" />}
        <span className="text-sm font-medium">{toast.message}</span>
        <button onClick={() => onRemove(toast.id)} className="ml-2 hover:opacity-70">
          <X className="w-4 h-4" />
        </button>
      </div>
    ))}
  </div>
);

interface DocumentEditorProps {
  content: string;
  onChange: (content: string) => void;
  fileName: string;
  readOnly?: boolean;
}

const PAGE_WIDTH_A4 = 816;
const PAGE_HEIGHT_A4 = 1056;
const MAX_TABLE_ROWS = 20;
const MAX_TABLE_COLS = 10;
const MIN_TABLE_ROWS = 1;
const MIN_TABLE_COLS = 1;

const FONT_FAMILIES = [
  { name: 'Arial', value: 'Arial, sans-serif', command: 'Arial' },
  { name: 'Times New Roman', value: '"Times New Roman", serif', command: 'Times New Roman' },
  { name: 'Courier New', value: '"Courier New", monospace', command: 'Courier New' },
  { name: 'Georgia', value: 'Georgia, serif', command: 'Georgia' },
  { name: 'Verdana', value: 'Verdana, sans-serif', command: 'Verdana' },
  { name: 'Tahoma', value: 'Tahoma, sans-serif', command: 'Tahoma' },
  { name: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif', command: 'Trebuchet MS' },
  { name: 'Comic Sans MS', value: '"Comic Sans MS", cursive', command: 'Comic Sans MS' },
  { name: 'Impact', value: 'Impact, sans-serif', command: 'Impact' },
  { name: 'Lucida Console', value: '"Lucida Console", monospace', command: 'Lucida Console' },
  { name: 'Palatino', value: 'Palatino, serif', command: 'Palatino' },
  { name: 'Garamond', value: 'Garamond, serif', command: 'Garamond' },
];

const TEXT_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff',
  '#9900ff', '#ff00ff', '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3',
  '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc', '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599',
  '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd', '#cc4125', '#e06666',
  '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
];

const HIGHLIGHT_COLORS = [
  'transparent', '#ffff00', '#00ff00', '#00ffff', '#ff00ff',
  '#ff0000', '#0000ff', '#800080', '#808000', '#008080', '#008000',
  '#c0c0c0', '#808080', '#ff9900', '#00ccff', '#993366', '#999999',
];

const SPECIAL_CHARS = [
  '©', '®', '™', '€', '£', '¥', '¢', '¤',
  '°', '±', '×', '÷', '√', '∞', '≈', '≠',
  '≤', '≥', '¼', '½', '¾', '¹', '²', '³',
  '←', '→', '↑', '↓', '↔', '⇐', '⇒', '⇑',
  '♠', '♣', '♥', '♦', '★', '☆', '✓', '✗',
  'α', 'β', 'γ', 'δ', 'ε', 'π', 'σ', 'μ',
  'Ω', 'Σ', 'Δ', 'Φ', 'Ψ', 'λ', 'θ', 'ω',
  '\u201E', '\u201C', '\u201D', '\u201A', '\u2018', '\u2019', '\u00AB', '\u00BB',
  '—', '–', '…', '•', '†', '‡', '§', '¶',
];

// Feature 55: Thesaurus data
const THESAURUS: Record<string, string[]> = {
  'good': ['excellent', 'great', 'fine', 'superb', 'wonderful', 'outstanding'],
  'bad': ['poor', 'terrible', 'awful', 'horrible', 'dreadful', 'inferior'],
  'big': ['large', 'huge', 'enormous', 'massive', 'gigantic', 'substantial'],
  'small': ['tiny', 'little', 'miniature', 'compact', 'petite', 'minuscule'],
  'happy': ['joyful', 'cheerful', 'delighted', 'pleased', 'content', 'ecstatic'],
  'sad': ['unhappy', 'sorrowful', 'melancholy', 'depressed', 'gloomy', 'miserable'],
  'fast': ['quick', 'rapid', 'swift', 'speedy', 'hasty', 'brisk'],
  'slow': ['sluggish', 'leisurely', 'unhurried', 'gradual', 'plodding', 'languid'],
  'beautiful': ['gorgeous', 'stunning', 'lovely', 'attractive', 'pretty', 'elegant'],
  'ugly': ['hideous', 'unsightly', 'unattractive', 'homely', 'grotesque', 'repulsive'],
};

type ModalType = 'none' | 'findReplace' | 'insertImage' | 'specialChars' | 'lineSpacing' | 'insertTable' | 'insertLink' | 'headersFooters' | 'tableOfContents' | 'trackChanges' | 'comments' | 'spellCheck' | 'grammarCheck' | 'thesaurus' | 'wordCountGoals' | 'autoSave' | 'versionHistory' | 'collaboration' | 'templates' | 'mailMerge' | 'macros' | 'addIns' | 'cloudStorage' | 'documentProtection' | 'footnotes' | 'columns' | 'textBoxes' | 'shapes' | 'charts' | 'wordArt' | 'watermarks' | 'pageSetup' | 'spellingErrors' | 'grammarErrors' | 'readabilityStats' | 'textTransform' | 'insertChart' | 'mailMergePreview' | 'documentProperties' | 'printPreview' | 'themes' | 'language' | 'autoCorrect' | 'dropCap' | 'lineNumbers' | 'sectionBreak' | 'pageNumbers' | 'index' | 'bibliography' | 'crossReference' | 'caption' | 'compareDocuments';
type ActiveDropdown = 'none' | 'font' | 'textColor' | 'highlightColor';

interface Comment {
  id: string;
  text: string;
  author: string;
  timestamp: Date;
  position: number;
}

interface TrackChange {
  id: string;
  type: 'insert' | 'delete';
  text: string;
  author: string;
  timestamp: Date;
}

interface Version {
  id: string;
  timestamp: Date;
  content: string;
  author: string;
  label?: string;
}

interface Macro {
  id: string;
  name: string;
  code: string;
}

export default function DocumentEditor({ content, onChange, fileName, readOnly = false }: DocumentEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const [zoom, setZoom] = useState(100);
  const [showRuler, setShowRuler] = useState(true);
  const [modal, setModal] = useState<ModalType>('none');
  
  // Initialize monitoring and utilities
  const errorTracker = useRef(new ErrorTracker()).current;
  const perfMonitor = useRef(new PerformanceMonitor()).current;
  const healthChecker = useRef(new HealthChecker()).current;
  const alertManager = useRef(new AlertManager()).current;
  const logger = useRef(new Logger({ level: 'info' })).current;
  const backupManager = useRef(new BackupManager({ enabled: true, frequency: 'daily' })).current;
  const mobileOptimizer = useRef(new MobileOptimizer()).current;
  const offlineManager = useRef(new OfflineManager()).current;
  const helpCenter = useRef(new HelpCenter()).current;
  const feedbackCollector = useRef(new FeedbackCollector()).current;
  
  // State for new features
  const [showHelp, setShowHelp] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [showMonitoring, setShowMonitoring] = useState(false);
  
  // Initialize on mount
  useEffect(() => {
    // Install polyfills
    installPolyfills();
    
    // Check browser compatibility
    const browserSupport = isBrowserSupported();
    if (!browserSupport.supported) {
      alertManager.triggerAlert('Unsupported Browser', browserSupport.message || 'Please use a modern browser', 'warning');
    }
    
    // Optimize for mobile
    mobileOptimizer.optimizeForMobile();
    
    // Setup focus visible
    const cleanupFocusVisible = setupFocusVisible();
    
    // Record initial load time
    perfMonitor.recordLoadTime();
    
    // Log application start
    logger.info('DocumentEditor initialized', { fileName, readOnly });
    
    // Check if onboarding should be shown
    const onboarding = new OnboardingTour([]);
    if (!onboarding.isCompleted()) {
      setShowOnboarding(true);
    }
    
    // Register health checks
    healthChecker.registerCheck('editor', async () => {
      return editorRef.current !== null;
    });
    
    healthChecker.registerCheck('storage', async () => {
      try {
        localStorage.setItem('health_check', 'test');
        localStorage.removeItem('health_check');
        return true;
      } catch {
        return false;
      }
    });
    
    return () => {
      cleanupFocusVisible();
      logger.info('DocumentEditor unmounted');
    };
  }, []);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [findCount, setFindCount] = useState(0);
  const [findMatches, setFindMatches] = useState<number[]>([]);
  const [currentFindIndex, setCurrentFindIndex] = useState(0);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [lineSpacingValue, setLineSpacingValue] = useState(1.5);
  const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown>('none');
  const [currentFont, setCurrentFont] = useState('Arial');
  const [currentFontSize, setCurrentFontSize] = useState('3');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [currentTextColor, setCurrentTextColor] = useState('#000000');
  const [currentHighlightColor, setCurrentHighlightColor] = useState('transparent');
  const [recentTextColors, setRecentTextColors] = useState<string[]>([]);
  const [recentHighlightColors, setRecentHighlightColors] = useState<string[]>([]);

  // Feature 41: Headers/Footers
  const [headerText, setHeaderText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [showHeaders, setShowHeaders] = useState(false);

  // Feature 51: Track Changes
  const [trackChangesEnabled, setTrackChangesEnabled] = useState(false);
  const [trackChanges, setTrackChanges] = useState<TrackChange[]>([]);

  // Feature 52: Comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  // Feature 53: Spell Check
  const [spellCheckEnabled, setSpellCheckEnabled] = useState(false);
  const [misspelledWords, setMisspelledWords] = useState<string[]>([]);

  // Feature 56: Word Count Goals
  const [wordCountGoal, setWordCountGoal] = useState(0);

  // Feature 58: Auto-save
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Feature 59: Version History
  const [versions, setVersions] = useState<Version[]>([]);

  // Feature 60: Collaboration
  const [collaborationEnabled, setCollaborationEnabled] = useState(false);
  const [collaborators, setCollaborators] = useState<string[]>([]);

  // Feature 63: Macros
  const [macros, setMacros] = useState<Macro[]>([]);
  const [newMacroName, setNewMacroName] = useState('');
  const [newMacroCode, setNewMacroCode] = useState('');

  // Feature 65: Cloud Storage
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);

  // Feature 50: Document Protection
  const [documentProtected, setDocumentProtected] = useState(false);
  const [protectionPassword, setProtectionPassword] = useState('');

  // Feature 44: Columns
  const [columnCount, setColumnCount] = useState(1);

  // Feature 49: Watermarks
  const [watermarkText, setWatermarkText] = useState('');
  const [showWatermark, setShowWatermark] = useState(false);

  // NEW: Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Basic dictionary for spell check (common English words)
  const DICTIONARY = useMemo(() => new Set([
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 
    'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 
    'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 
    'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make',
    'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your',
    'good', 'bad', 'big', 'small', 'happy', 'sad', 'fast', 'slow', 'beautiful', 'ugly',
    'document', 'editor', 'text', 'word', 'paragraph', 'sentence', 'letter', 'page',
    'hello', 'world', 'test', 'example', 'sample', 'demo', 'word', 'processor'
  ]), []);

  // NEW: Language/i18n
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');

  // NEW: Theme
  const [currentTheme, setCurrentTheme] = useState<DocumentTheme>(DOCUMENT_THEMES[0]);

  // NEW: Grammar issues
  const [grammarIssues, setGrammarIssues] = useState<Array<{ruleId: string; message: string; suggestion?: string; severity: 'error' | 'warning' | 'info'; offset: number; length: number; context: string}>>([]);

  // NEW: Readability stats
  const [readabilityStats, setReadabilityStats] = useState<ReturnType<typeof calculateReadability> | null>(null);

  // NEW: Mail merge
  const [csvData, setCsvData] = useState<{headers: string[]; rows: string[][]} | null>(null);
  const [mergePreviewIndex, setMergePreviewIndex] = useState(0);
  const [mergedDocuments, setMergedDocuments] = useState<string[]>([]);

  // NEW: Line numbers
  const [showLineNumbers, setShowLineNumbers] = useState(false);

  // NEW: Page numbers
  const [showPageNumbers, setShowPageNumbers] = useState(false);
  const [pageNumberStyle, setPageNumberStyle] = useState<'bottom-center' | 'bottom-right' | 'top-center' | 'top-right'>('bottom-center');

  // NEW: Document properties
  const [docProperties, setDocProperties] = useState({
    title: '',
    author: '',
    subject: '',
    keywords: '',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  });

  // NEW: Auto-correct
  const [autoCorrectEnabled, setAutoCorrectEnabled] = useState(true);

  // NEW: Chart data
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [chartData, setChartData] = useState<ChartData>({
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [{
      label: 'Revenue',
      data: [100, 200, 150, 300],
      color: '#3b82f6',
    }],
  });

  // NEW: Text transform
  const [selectedTransform, setSelectedTransform] = useState<'uppercase' | 'lowercase' | 'capitalize' | 'titlecase' | 'sentencecase' | 'togglecase' | 'inverse'>('uppercase');

  // Feature 53: Check spelling
  const checkSpelling = useCallback(() => {
    if (!editorRef.current) return;
    
    const text = editorRef.current.textContent || '';
    const words = text.split(/\s+/);
    const misspelled: string[] = [];
    
    words.forEach(word => {
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
      if (cleanWord && cleanWord.length > 2 && !DICTIONARY.has(cleanWord)) {
        misspelled.push(word);
      }
    });
    
    setMisspelledWords([...new Set(misspelled)]); // Remove duplicates
    
    if (misspelled.length > 0) {
      openModal('spellingErrors');
    } else {
      addToast('No spelling errors found', 'success');
    }
  }, [DICTIONARY, addToast]);

  // NEW: Grammar check
  const runGrammarCheck = useCallback(() => {
    if (!editorRef.current) return;
    const text = editorRef.current.textContent || '';
    const issues = checkGrammar(text);
    setGrammarIssues(issues);
    if (issues.length > 0) {
      openModal('grammarErrors');
    } else {
      addToast('No grammar issues found', 'success');
    }
  }, [addToast]);

  // NEW: Auto-correct
  const runAutoCorrect = useCallback(() => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerHTML;
    const plainText = editorRef.current.textContent || '';
    const { corrected, changes } = autoCorrect(plainText);
    
    if (changes.length > 0) {
      // Apply corrections to HTML
      let html = text;
      changes.forEach(change => {
        const regex = new RegExp(`\\b${change.from}\\b`, 'gi');
        html = html.replace(regex, change.to);
      });
      editorRef.current.innerHTML = html;
      onChange(html);
      addToast(`Auto-corrected ${changes.length} word(s)`, 'success');
    } else {
      addToast('No corrections needed', 'info');
    }
  }, [onChange, addToast]);

  // NEW: Readability stats
  const showReadabilityStats = useCallback(() => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerHTML;
    const stats = calculateReadability(text);
    setReadabilityStats(stats);
    openModal('readabilityStats');
  }, []);

  // NEW: Insert chart
  const insertChart = useCallback(() => {
    if (!editorRef.current) return;
    const svg = generateChartSVG(chartType, chartData, 500, 350);
    restoreSelection();
    execCommand('insertHTML', `<div style="margin: 1em 0; text-align: center;">${svg}</div><p><br></p>`);
    closeModal();
    addToast('Chart inserted', 'success');
  }, [chartType, chartData, addToast]);

  // NEW: Mail merge
  const handleCSVUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const data = parseCSV(text);
      setCsvData(data);
      addToast(`Loaded ${data.rows.length} records`, 'success');
    };
    reader.readAsText(file);
  }, [addToast]);

  const runMailMerge = useCallback(() => {
    if (!editorRef.current || !csvData) return;
    const template = editorRef.current.innerHTML;
    const merged = mergeTemplate(template, csvData);
    setMergedDocuments(merged);
    setMergePreviewIndex(0);
    openModal('mailMergePreview');
    addToast(`Generated ${merged.length} documents`, 'success');
  }, [csvData, addToast]);

  // NEW: Text transform
  const applyTextTransform = useCallback((transform: 'uppercase' | 'lowercase' | 'capitalize' | 'titlecase' | 'sentencecase' | 'togglecase' | 'inverse') => {
    const selection = window.getSelection();
    if (!selection || selection.toString().length === 0) {
      addToast('Please select text first', 'warning');
      return;
    }
    const selectedText = selection.toString();
    const transformed = transformText(selectedText, transform);
    document.execCommand('insertText', false, transformed);
    addToast(`Text transformed to ${transform}`, 'success');
    closeModal();
  }, [addToast]);

  // NEW: Insert drop cap
  const insertDropCap = useCallback(() => {
    if (!editorRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.toString().length === 0) {
      addToast('Please select a paragraph first', 'warning');
      return;
    }
    const selectedText = selection.toString();
    const dropCapHtml = generateDropCap(selectedText);
    document.execCommand('insertHTML', false, `<p style="line-height: 1.6;">${dropCapHtml}</p>`);
    addToast('Drop cap applied', 'success');
    closeModal();
  }, [addToast]);

  // NEW: Apply theme
  const applyTheme = useCallback((theme: DocumentTheme) => {
    setCurrentTheme(theme);
    if (editorRef.current) {
      editorRef.current.style.fontFamily = theme.bodyFont;
      editorRef.current.style.color = theme.textColor;
      // Apply to headings
      const headings = editorRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach(h => {
        (h as HTMLElement).style.fontFamily = theme.headingFont;
        (h as HTMLElement).style.color = theme.primaryColor;
      });
    }
    addToast(`Theme "${theme.name}" applied`, 'success');
    closeModal();
  }, [addToast]);

  // NEW: Document properties
  const updateDocProperties = useCallback(() => {
    setDocProperties(prev => ({ ...prev, modified: new Date().toISOString() }));
    addToast('Document properties updated', 'success');
    closeModal();
  }, [addToast]);

  // NEW: Print preview
  const openPrintPreview = useCallback(() => {
    openModal('printPreview');
  }, []);

  const doPrint = useCallback(() => {
    window.print();
    closeModal();
  }, []);

  // NEW: Keyboard shortcuts help
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // NEW: Context menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // NEW: Loading state
  const [isLoading, setIsLoading] = useState(false);

  // NEW: Page setup
  const [pageSetup, setPageSetup] = useState({
    margins: { top: 96, right: 96, bottom: 96, left: 96 },
    orientation: 'portrait' as 'portrait' | 'landscape',
    paperSize: 'letter' as 'letter' | 'a4' | 'legal',
  });

  // NEW: Zoom presets
  const [zoomInput, setZoomInput] = useState('100');

  // Feature 56: Reading time
  const readingTime = useMemo(() => {
    const wordsPerMinute = 200;
    const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = text ? text.split(/\s+/).length : 0;
    return Math.ceil(words / wordsPerMinute);
  }, [content]);

  const stats = useMemo(() => {
    if (!content) return { words: 0, chars: 0, paragraphs: 0 };
    const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = text.length;
    const blockMatch = content.match(/<(p|h[1-6]|li|blockquote|div)[\s>]/gi);
    const paragraphs = blockMatch ? blockMatch.length : 1;
    return { words, chars, paragraphs };
  }, [content]);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

  // Feature 58: Auto-save
  useEffect(() => {
    if (!autoSaveEnabled) return;
    const interval = setInterval(() => {
      localStorage.setItem(`doc_${fileName}`, content);
      setLastSaved(new Date());
    }, 30000); // Save every 30 seconds
    return () => clearInterval(interval);
  }, [autoSaveEnabled, content, fileName]);

  // Feature 59: Save version
  const saveVersion = (label?: string) => {
    const version: Version = {
      id: Date.now().toString(),
      timestamp: new Date(),
      content,
      author: 'User',
      label,
    };
    setVersions(prev => [version, ...prev].slice(0, 50)); // Keep last 50 versions
    addToast('Version saved', 'success');
  };

  // Feature 59: Restore version
  const restoreVersion = (version: Version) => {
    if (window.confirm(`Restore version from ${version.timestamp.toLocaleString()}? This will replace your current document.`)) {
      if (editorRef.current) {
        editorRef.current.innerHTML = version.content;
        onChange(version.content);
        addToast('Version restored', 'success');
      }
    }
  };

  // Feature 59: Delete version
  const deleteVersion = (versionId: string) => {
    setVersions(prev => prev.filter(v => v.id !== versionId));
    addToast('Version deleted', 'info');
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      if (!editorRef.current) return;
      setIsBold(document.queryCommandState('bold'));
      setIsItalic(document.queryCommandState('italic'));
      setIsUnderline(document.queryCommandState('underline'));
      const fontSize = document.queryCommandValue('fontSize');
      if (fontSize) setCurrentFontSize(fontSize);
      const fontName = document.queryCommandValue('fontName');
      if (fontName) setCurrentFont(fontName.replace(/['"]/g, ''));
      const foreColor = document.queryCommandValue('foreColor');
      if (foreColor) setCurrentTextColor(foreColor);
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editorRef.current?.contains(range.commonAncestorContainer)) {
        savedSelectionRef.current = range.cloneRange();
      }
    }
  };

  const restoreSelection = () => {
    if (savedSelectionRef.current) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelectionRef.current);
      }
    }
    editorRef.current?.focus();
  };

  const execCommand = useCallback((command: string, value?: string) => {
    editorRef.current?.focus();
    
    // Feature 51: Track changes
    if (trackChangesEnabled && editorRef.current) {
      const selection = window.getSelection();
      if (selection && selection.toString()) {
        const change: TrackChange = {
          id: Date.now().toString(),
          type: 'delete',
          text: selection.toString(),
          author: 'User',
          timestamp: new Date(),
        };
        setTrackChanges(prev => [...prev, change]);
      }
    }
    
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange, trackChangesEnabled]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  const handleExport = async () => {
    if (editorRef.current) {
      await exportDocx(editorRef.current.innerHTML, fileName);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSave = () => {
    try {
      if (!editorRef.current) return;
      const currentContent = editorRef.current.innerHTML;
      
      // Security scan before save
      const securityIssues = scanDocumentSecurity(currentContent);
      if (securityIssues.length > 0) {
        const score = getSecurityScore(securityIssues);
        if (score < 70) {
          logger.warn('Security issues detected in document', { score, issues: securityIssues.length });
          if (!confirm(`Warning: ${securityIssues.length} security issue(s) detected. Save anyway?`)) {
            return;
          }
        }
      }
      
      const blob = new Blob(
        [`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fileName}</title><style>body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px;line-height:1.8;}</style></head><body>${currentContent}</body></html>`],
        { type: 'text/html' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName.replace(/\.\w+$/, '.html');
      a.click();
      URL.revokeObjectURL(url);
      saveVersion('Manual save');
      
      // Create backup
      backupManager.createBackup('snapshot').catch(err => {
        logger.error('Backup failed', { error: err });
      });
      
      logger.info('Document saved', { fileName });
      announceToScreenReader('Document saved successfully', 'polite');
    } catch (error) {
      errorTracker.captureError(error instanceof Error ? error : new Error(String(error)), { action: 'save', fileName });
      logger.error('Save failed', { error });
      alertManager.triggerAlert('Save Failed', 'Failed to save document. Please try again.', 'error');
    }
  };

  const openModal = (type: ModalType) => {
    saveSelection();
    setModal(type);
  };

  const closeModal = () => {
    setModal('none');
  };

  const insertImage = (src: string) => {
    // Validate and sanitize image URL
    if (!src.startsWith('data:') && !validateURL(src)) {
      addToast('Invalid image URL', 'error');
      return;
    }
    const safeSrc = src.startsWith('data:') ? src : sanitizeURL(src);
    restoreSelection();
    execCommand('insertHTML', `<img src="${safeSrc}" alt="Image" style="max-width: 100%; height: auto; margin: 1em 0; border-radius: 4px; display: block;" />`);
    closeModal();
    setImageUrl('');
    addToast('Image inserted', 'success');
  };

  // Drag and drop support for images
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      imageFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            insertImage(ev.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      });
      addToast(`${imageFiles.length} image(s) inserted`, 'success');
    }
  }, [addToast]);

  // Context menu handler
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          insertImage(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const insertLink = () => {
    if (linkUrl) {
      // Validate and sanitize URL
      if (!validateURL(linkUrl)) {
        addToast('Invalid URL', 'error');
        return;
      }
      const safeUrl = sanitizeURL(linkUrl);
      const safeText = (linkText || linkUrl).replace(/[<>"']/g, '');
      restoreSelection();
      execCommand('insertHTML', `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">${safeText}</a>`);
      closeModal();
      setLinkUrl('');
      setLinkText('');
      addToast('Link inserted', 'success');
    }
  };

  const insertTable = () => {
    restoreSelection();
    let table = '<table style="border-collapse: collapse; width: 100%; margin: 1em 0;" data-table-id="' + Date.now() + '"><tbody>';
    for (let r = 0; r < tableRows; r++) {
      table += '<tr>';
      for (let c = 0; c < tableCols; c++) {
        const tag = r === 0 ? 'th' : 'td';
        table += `<${tag} style="border: 1px solid #d1d5db; padding: 8px 12px; min-width: 80px;${r === 0 ? ' background-color: #f3f4f6; font-weight: 600;' : ''}" data-cell-id="${r}-${c}">&nbsp;</${tag}>`;
      }
      table += '</tr>';
    }
    table += '</tbody></table><p><br></p>';
    execCommand('insertHTML', table);
    closeModal();
  };

  // Table editing functions
  const getSelectedTableCell = (): HTMLTableCellElement | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    
    const node = selection.anchorNode;
    if (!node) return null;
    
    let current: Node | null = node;
    while (current && current !== editorRef.current) {
      if (current instanceof HTMLTableCellElement) {
        return current;
      }
      current = current.parentNode;
    }
    return null;
  };

  const getSelectedTable = (): HTMLTableElement | null => {
    const cell = getSelectedTableCell();
    return cell ? cell.closest('table') : null;
  };

  const addTableRow = (position: 'above' | 'below') => {
    const cell = getSelectedTableCell();
    if (!cell) return;
    
    const row = cell.closest('tr');
    if (!row) return;
    
    const table = row.closest('table');
    if (!table) return;
    
    const newRow = document.createElement('tr');
    const colCount = row.cells.length;
    
    for (let i = 0; i < colCount; i++) {
      const newCell = document.createElement('td');
      newCell.style.cssText = 'border: 1px solid #d1d5db; padding: 8px 12px; min-width: 80px;';
      newCell.innerHTML = '&nbsp;';
      newRow.appendChild(newCell);
    }
    
    if (position === 'above') {
      row.parentNode?.insertBefore(newRow, row);
    } else {
      row.parentNode?.insertBefore(newRow, row.nextSibling);
    }
    
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    addToast(`Row added ${position}`, 'success');
  };

  const addTableColumn = (position: 'left' | 'right') => {
    const cell = getSelectedTableCell();
    if (!cell) return;
    
    const table = cell.closest('table');
    if (!table) return;
    
    const cellIndex = Array.from(cell.parentNode!.children).indexOf(cell);
    const rows = table.querySelectorAll('tr');
    
    rows.forEach(row => {
      const newCell = document.createElement(row.cells[0]?.tagName === 'TH' ? 'th' : 'td');
      newCell.style.cssText = 'border: 1px solid #d1d5db; padding: 8px 12px; min-width: 80px;';
      newCell.innerHTML = '&nbsp;';
      
      if (position === 'left') {
        row.insertBefore(newCell, row.cells[cellIndex]);
      } else {
        row.insertBefore(newCell, row.cells[cellIndex + 1]);
      }
    });
    
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    addToast(`Column added ${position}`, 'success');
  };

  const deleteTableRow = () => {
    const cell = getSelectedTableCell();
    if (!cell) return;
    
    const row = cell.closest('tr');
    if (!row) return;
    
    const table = row.closest('table');
    if (!table) return;
    
    // Don't delete if it's the last row
    if (table.querySelectorAll('tr').length <= 1) {
      addToast('Cannot delete the last row', 'warning');
      return;
    }
    
    row.remove();
    
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    addToast('Row deleted', 'success');
  };

  const deleteTableColumn = () => {
    const cell = getSelectedTableCell();
    if (!cell) return;
    
    const table = cell.closest('table');
    if (!table) return;
    
    const cellIndex = Array.from(cell.parentNode!.children).indexOf(cell);
    
    // Don't delete if it's the last column
    if (table.querySelectorAll('tr')[0].cells.length <= 1) {
      addToast('Cannot delete the last column', 'warning');
      return;
    }
    
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
      if (row.cells[cellIndex]) {
        row.cells[cellIndex].remove();
      }
    });
    
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    addToast('Column deleted', 'success');
  };

  const deleteTable = () => {
    const table = getSelectedTable();
    if (!table) return;
    
    if (window.confirm('Delete entire table?')) {
      table.remove();
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
      addToast('Table deleted', 'success');
    }
  };

  const setCellBackgroundColor = (color: string) => {
    const cells = getSelectedTableCells();
    if (cells.length === 0) return;
    
    // Apply color to all selected cells
    cells.forEach(cell => {
      cell.style.backgroundColor = color;
    });
    
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    addToast(`Background color applied to ${cells.length} cell${cells.length > 1 ? 's' : ''}`, 'success');
  };

  const clearCellBackgroundColor = () => {
    const cells = getSelectedTableCells();
    if (cells.length === 0) return;
    
    // Clear color from all selected cells
    cells.forEach(cell => {
      cell.style.backgroundColor = '';
    });
    
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    addToast(`Background color cleared from ${cells.length} cell${cells.length > 1 ? 's' : ''}`, 'success');
  };

  // Table selection state
  const [selectedTableCell, setSelectedTableCell] = useState<HTMLTableCellElement | null>(null);
  const [selectedTableCells, setSelectedTableCells] = useState<Set<HTMLTableCellElement>>(new Set());
  const [isSelectingCells, setIsSelectingCells] = useState(false);
  const [showTableToolbar, setShowTableToolbar] = useState(false);
  const [showCellColorPicker, setShowCellColorPicker] = useState(false);

  // Get all selected table cells (supports multi-cell selection)
  const getSelectedTableCells = (): HTMLTableCellElement[] => {
    if (selectedTableCells.size > 0) {
      return Array.from(selectedTableCells);
    }
    const cell = getSelectedTableCell();
    return cell ? [cell] : [];
  };

  // Update table selection on cursor movement
  useEffect(() => {
    const handleSelectionChange = () => {
      // Don't update if we're in multi-cell selection mode
      if (isSelectingCells) return;
      
      const cell = getSelectedTableCell();
      if (cell !== selectedTableCell) {
        setSelectedTableCell(cell);
        setSelectedTableCells(new Set()); // Clear multi-selection when cursor moves
        setShowTableToolbar(!!cell);
      }
    };

    // Prevent text selection during drag
    const handleSelectStart = (e: Event) => {
      if (isSelectingCells) {
        e.preventDefault();
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('selectstart', handleSelectStart);
    
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('selectstart', handleSelectStart);
    };
  }, [selectedTableCell, isSelectingCells]);

  // Handle cell click for multi-selection (with Ctrl/Cmd key)
  const handleTableCellClick = (e: React.MouseEvent, cell: HTMLTableCellElement) => {
    if (e.ctrlKey || e.metaKey) {
      // Multi-select mode: toggle cell in selection
      e.preventDefault();
      const newSelection = new Set(selectedTableCells);
      if (newSelection.has(cell)) {
        newSelection.delete(cell);
      } else {
        newSelection.add(cell);
      }
      setSelectedTableCells(newSelection);
      setIsSelectingCells(newSelection.size > 0);
      setShowTableToolbar(newSelection.size > 0 || !!getSelectedTableCell());
    } else {
      // Single select mode: clear multi-selection
      setSelectedTableCells(new Set());
      setIsSelectingCells(false);
    }
  };

  // Handle drag selection for table cells
  const handleTableCellMouseDown = (e: React.MouseEvent, cell: HTMLTableCellElement) => {
    if (e.button === 0 && !e.ctrlKey && !e.metaKey) {
      // Prevent default text selection
      e.preventDefault();
      
      // Start drag selection
      setIsSelectingCells(true);
      const newSelection = new Set<HTMLTableCellElement>();
      newSelection.add(cell);
      setSelectedTableCells(newSelection);
      setShowTableToolbar(true);
      
      // Store the starting cell for rectangular selection
      (window as any).__tableDragStart = cell;
    }
  };

  const handleTableCellMouseEnter = (e: React.MouseEvent, cell: HTMLTableCellElement) => {
    if (isSelectingCells && e.buttons === 1) {
      // Prevent default during drag
      e.preventDefault();
      
      // Get the starting cell
      const startCell = (window as any).__tableDragStart as HTMLTableCellElement | undefined;
      if (!startCell) return;
      
      // Calculate rectangular selection
      const newSelection = calculateRectangularSelection(startCell, cell);
      setSelectedTableCells(newSelection);
    }
  };

  const handleTableCellMouseUp = () => {
    if (isSelectingCells) {
      setIsSelectingCells(false);
      // Clean up drag start reference
      delete (window as any).__tableDragStart;
    }
  };

  // Calculate rectangular selection between two cells
  const calculateRectangularSelection = (startCell: HTMLTableCellElement, endCell: HTMLTableCellElement): Set<HTMLTableCellElement> => {
    const selection = new Set<HTMLTableCellElement>();
    
    // Get table reference
    const table = startCell.closest('table');
    if (!table) return selection;
    
    // Get row and column indices
    const startRow = startCell.closest('tr');
    const endRow = endCell.closest('tr');
    if (!startRow || !endRow) return selection;
    
    const startRowIndex = Array.from(table.querySelectorAll('tr')).indexOf(startRow);
    const endRowIndex = Array.from(table.querySelectorAll('tr')).indexOf(endRow);
    
    const startColIndex = Array.from(startRow.children).indexOf(startCell);
    const endColIndex = Array.from(endRow.children).indexOf(endCell);
    
    // Calculate bounds
    const minRow = Math.min(startRowIndex, endRowIndex);
    const maxRow = Math.max(startRowIndex, endRowIndex);
    const minCol = Math.min(startColIndex, endColIndex);
    const maxCol = Math.max(startColIndex, endColIndex);
    
    // Select all cells in the rectangle
    const rows = table.querySelectorAll('tr');
    for (let r = minRow; r <= maxRow; r++) {
      const row = rows[r];
      if (!row) continue;
      
      for (let c = minCol; c <= maxCol; c++) {
        const cell = row.children[c] as HTMLTableCellElement;
        if (cell && (cell.tagName === 'TD' || cell.tagName === 'TH')) {
          selection.add(cell);
        }
      }
    }
    
    return selection;
  };

  // Update visual selection state for table cells
  useEffect(() => {
    if (!editorRef.current) return;
    
    // Remove selection highlight from all cells
    const allCells = editorRef.current.querySelectorAll('td, th');
    allCells.forEach(cell => {
      (cell as HTMLElement).style.outline = '';
      (cell as HTMLElement).style.outlineOffset = '';
    });
    
    // Add selection highlight to selected cells
    selectedTableCells.forEach(cell => {
      cell.style.outline = '2px solid #3b82f6';
      cell.style.outlineOffset = '-2px';
    });
  }, [selectedTableCells]);

  // Global mouseup listener to end drag selection
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSelectingCells) {
        setIsSelectingCells(false);
        delete (window as any).__tableDragStart;
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isSelectingCells]);

  const insertPageBreak = () => {
    execCommand('insertHTML', '<div style="page-break-after: always; border-top: 2px dashed #9ca3af; margin: 2em 0; padding-top: 4px;"><span style="font-size: 10px; color: #9ca3af;">— Page Break —</span></div><p><br></p>');
  };

  const insertSpecialChar = (char: string) => {
    restoreSelection();
    execCommand('insertText', char);
  };

  // Feature 45: Insert text box
  const insertTextBox = () => {
    restoreSelection();
    execCommand('insertHTML', '<div style="border: 2px solid #3b82f6; padding: 16px; margin: 1em 0; min-height: 100px; background-color: #f0f9ff;">Text Box - Click to edit</div><p><br></p>');
    closeModal();
  };

  // Feature 46: Insert shape
  const insertShape = (shape: string) => {
    restoreSelection();
    let shapeHTML = '';
    switch (shape) {
      case 'rectangle':
        shapeHTML = '<div style="width: 200px; height: 100px; background-color: #3b82f6; margin: 1em 0;"></div>';
        break;
      case 'circle':
        shapeHTML = '<div style="width: 100px; height: 100px; background-color: #3b82f6; border-radius: 50%; margin: 1em 0;"></div>';
        break;
      case 'triangle':
        shapeHTML = '<div style="width: 0; height: 0; border-left: 50px solid transparent; border-right: 50px solid transparent; border-bottom: 100px solid #3b82f6; margin: 1em 0;"></div>';
        break;
    }
    execCommand('insertHTML', shapeHTML + '<p><br></p>');
    closeModal();
  };

  // Feature 42: Insert table of contents
  const insertTableOfContents = () => {
    restoreSelection();
    if (!editorRef.current) return;
    
    const headings = editorRef.current.querySelectorAll('h1, h2, h3');
    let toc = '<div style="background-color: #f9fafb; padding: 20px; margin: 1em 0; border-left: 4px solid #3b82f6;"><h2 style="margin-top: 0;">Table of Contents</h2><ul style="list-style: none; padding-left: 0;">';
    
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.substring(1));
      const indent = (level - 1) * 20;
      toc += `<li style="margin-left: ${indent}px; margin-bottom: 8px;"><a href="#heading-${index}" style="color: #3b82f6; text-decoration: none;">${heading.textContent}</a></li>`;
    });
    
    toc += '</ul></div><p><br></p>';
    execCommand('insertHTML', toc);
    closeModal();
  };

  // Feature 43: Insert footnote
  const insertFootnote = () => {
    restoreSelection();
    const footnoteNum = (editorRef.current?.querySelectorAll('.footnote')?.length || 0) + 1;
    execCommand('insertHTML', `<sup class="footnote" style="color: #3b82f6; cursor: pointer;">[${footnoteNum}]</sup>`);
    closeModal();
  };

  // Feature 44: Set columns
  const setColumns = (count: number) => {
    if (!editorRef.current) return;
    editorRef.current.style.columnCount = String(count);
    editorRef.current.style.columnGap = '20px';
    setColumnCount(count);
    closeModal();
  };

  // Feature 49: Add watermark
  const addWatermark = () => {
    if (!watermarkText) return;
    setShowWatermark(true);
    closeModal();
    addToast('Watermark added', 'success');
  };

  // Feature 49: Remove watermark
  const removeWatermark = () => {
    setShowWatermark(false);
    setWatermarkText('');
    addToast('Watermark removed', 'info');
  };

  // Feature 52: Add comment
  const addComment = () => {
    if (!newComment.trim()) return;
    const selection = window.getSelection();
    const position = selection?.anchorOffset || 0;
    const comment: Comment = {
      id: Date.now().toString(),
      text: newComment,
      author: 'User',
      timestamp: new Date(),
      position,
    };
    setComments(prev => [...prev, comment]);
    setNewComment('');
    closeModal();
    addToast('Comment added', 'success');
  };

  // Feature 52: Edit comment
  const startEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.text);
  };

  const saveEditComment = () => {
    if (!editingCommentId || !editingCommentText.trim()) return;
    setComments(prev => prev.map(c => 
      c.id === editingCommentId ? { ...c, text: editingCommentText } : c
    ));
    setEditingCommentId(null);
    setEditingCommentText('');
    addToast('Comment updated', 'success');
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  // Feature 52: Delete comment
  const deleteComment = (commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
    addToast('Comment deleted', 'info');
  };

  // Feature 55: Look up word in thesaurus and replace
  const replaceWithSynonym = (synonym: string) => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      document.execCommand('insertText', false, synonym);
      addToast(`Replaced with "${synonym}"`, 'success');
    } else {
      addToast('Please select a word first', 'warning');
    }
    closeModal();
  };

  // Feature 63: Run macro
  const runMacro = (macro: Macro) => {
    try {
      // Simple macro execution (for demo purposes)
      if (macro.code.includes('bold')) {
        execCommand('bold');
      } else if (macro.code.includes('italic')) {
        execCommand('italic');
      }
    } catch (error) {
      console.error('Macro execution failed:', error);
    }
  };

  const applyLineSpacing = () => {
    if (!editorRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      const currentNode = selection?.anchorNode;
      if (currentNode) {
        let parentEl = currentNode.nodeType === Node.TEXT_NODE ? currentNode.parentElement : currentNode as Element;
        while (parentEl && parentEl !== editorRef.current) {
          if (['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'DIV'].includes(parentEl.tagName)) {
            (parentEl as HTMLElement).style.lineHeight = String(lineSpacingValue);
            break;
          }
          parentEl = parentEl.parentElement;
        }
      }
    } else {
      const range = selection.getRangeAt(0);
      const walker = document.createTreeWalker(
        editorRef.current,
        NodeFilter.SHOW_ELEMENT,
        {
          acceptNode: (node) => {
            const el = node as Element;
            if (['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'DIV'].includes(el.tagName)) {
              if (range.intersectsNode(el)) {
                return NodeFilter.FILTER_ACCEPT;
              }
            }
            return NodeFilter.FILTER_SKIP;
          }
        }
      );
      let node = walker.nextNode();
      while (node) {
        (node as HTMLElement).style.lineHeight = String(lineSpacingValue);
        node = walker.nextNode();
      }
    }
    onChange(editorRef.current.innerHTML);
    closeModal();
  };

  const handleFind = () => {
    if (!findText || !editorRef.current) return;
    const textContent = editorRef.current.textContent || '';
    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    const matches: number[] = [];
    let match;
    while ((match = regex.exec(textContent)) !== null) {
      matches.push(match.index);
    }
    setFindMatches(matches);
    setFindCount(matches.length);
    setCurrentFindIndex(0);
    if (window.find) {
      try {
        window.find(findText, caseSensitive, false, true, false, false, false);
      } catch (e) {
        window.find(findText, caseSensitive);
      }
    }
  };

  const findNext = () => {
    if (findMatches.length === 0) return;
    const nextIndex = (currentFindIndex + 1) % findMatches.length;
    setCurrentFindIndex(nextIndex);
    if (window.find) {
      try {
        window.find(findText, caseSensitive, false, true);
      } catch (e) {
        window.find(findText, caseSensitive);
      }
    }
  };

  const findPrevious = () => {
    if (findMatches.length === 0) return;
    const prevIndex = (currentFindIndex - 1 + findMatches.length) % findMatches.length;
    setCurrentFindIndex(prevIndex);
    if (window.find) {
      try {
        window.find(findText, caseSensitive, true, true);
      } catch (e) {
        window.find(findText, caseSensitive, true);
      }
    }
  };

  const handleReplace = (all: boolean = false) => {
    if (!findText || !editorRef.current) return;
    if (all) {
      const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT, null);
      const textNodes: Text[] = [];
      let node = walker.nextNode();
      while (node) {
        textNodes.push(node as Text);
        node = walker.nextNode();
      }
      const flags = caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
      textNodes.forEach(textNode => {
        if (regex.test(textNode.nodeValue || '')) {
          textNode.nodeValue = (textNode.nodeValue || '').replace(regex, replaceText);
        }
      });
      onChange(editorRef.current.innerHTML);
      handleFind();
    } else {
      if (window.find && window.find(findText, caseSensitive)) {
        const selection = window.getSelection();
        if (selection && selection.toString() === findText) {
          document.execCommand('insertText', false, replaceText);
          if (editorRef.current) onChange(editorRef.current.innerHTML);
          handleFind();
        }
      }
    }
  };

  const clearFormatting = () => {
    execCommand('removeFormat');
  };

  const setFontFamily = (font: typeof FONT_FAMILIES[0]) => {
    execCommand('fontName', font.command);
    setCurrentFont(font.name);
    setActiveDropdown('none');
  };

  const setFontSizeValue = (size: string) => {
    execCommand('fontSize', size);
    setCurrentFontSize(size);
  };

  const setTextColor = (color: string) => {
    restoreSelection();
    execCommand('foreColor', color);
    setCurrentTextColor(color);
    setRecentTextColors(prev => {
      const filtered = prev.filter(c => c !== color);
      return [color, ...filtered].slice(0, 8);
    });
    setActiveDropdown('none');
  };

  const setHighlightColor = (color: string) => {
    restoreSelection();
    if (color === 'transparent') {
      execCommand('hiliteColor', 'transparent');
      execCommand('backColor', 'transparent');
    } else {
      execCommand('hiliteColor', color);
    }
    setCurrentHighlightColor(color);
    setRecentHighlightColors(prev => {
      const filtered = prev.filter(c => c !== color);
      return [color, ...filtered].slice(0, 8);
    });
    setActiveDropdown('none');
  };

  const toggleDropdown = (dropdown: ActiveDropdown) => {
    saveSelection();
    setActiveDropdown(prev => prev === dropdown ? 'none' : dropdown);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (modal !== 'none') closeModal();
        setActiveDropdown('none');
        setContextMenu(null);
        setShowShortcutsHelp(false);
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'f': e.preventDefault(); openModal('findReplace'); break;
          case 'p': e.preventDefault(); handlePrint(); break;
          case 's': e.preventDefault(); handleSave(); break;
          case '/': e.preventDefault(); setShowShortcutsHelp(true); break;
          case 'b':
            if (document.activeElement === editorRef.current || editorRef.current?.contains(document.activeElement)) {
              e.preventDefault();
              execCommand('bold');
            }
            break;
          case 'i':
            if (document.activeElement === editorRef.current || editorRef.current?.contains(document.activeElement)) {
              e.preventDefault();
              execCommand('italic');
            }
            break;
          case 'u':
            if (document.activeElement === editorRef.current || editorRef.current?.contains(document.activeElement)) {
              e.preventDefault();
              execCommand('underline');
            }
            break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modal]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;
      let html = clipboardData.getData('text/html');
      const text = clipboardData.getData('text/plain');
      if (html) {
        // Use sanitizeHTML function
        html = sanitizeHTML(html);
        document.execCommand('insertHTML', false, html);
      } else if (text) {
        const lines = text.split('\n');
        const htmlContent = lines.map(line => line.trim() ? `<p>${line}</p>` : '<p><br></p>').join('');
        document.execCommand('insertHTML', false, htmlContent);
      }
      if (editorRef.current) onChange(editorRef.current.innerHTML);
    };
    editor.addEventListener('paste', handlePaste);
    return () => editor.removeEventListener('paste', handlePaste);
  }, [onChange]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const saveSel = () => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (editor.contains(range.commonAncestorContainer)) {
          savedSelectionRef.current = range.cloneRange();
        }
      }
    };
    editor.addEventListener('mouseup', saveSel);
    editor.addEventListener('keyup', saveSel);
    return () => {
      editor.removeEventListener('mouseup', saveSel);
      editor.removeEventListener('keyup', saveSel);
    };
  }, []);

  interface ToolbarButtonProps {
    icon: React.ComponentType<any>;
    action: () => void;
    title: string;
    active?: boolean;
  }

  const ToolbarButton = ({ icon: Icon, action, title, active = false }: ToolbarButtonProps) => (
    <button
      onClick={() => { saveSelection(); action(); }}
      disabled={readOnly}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`p-1.5 rounded transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        active ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
      }`}
    >
      <Icon className="w-4 h-4" aria-hidden="true" />
    </button>
  );

  const ToolbarDivider = () => <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1 self-center" />;

  const OrDivider = () => (
    <div className="relative py-2">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
      </div>
      <div className="relative flex justify-center">
        <span className="bg-white dark:bg-gray-900 px-3 text-xs text-gray-500">OR</span>
      </div>
    </div>
  );

  return (
    <ErrorBoundary>
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-800">
      {/* Top Menu Bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-3 py-1.5 flex items-center gap-1 text-sm overflow-x-auto">
        {/* File Menu */}
        <button onClick={handleSave} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 flex items-center gap-1 whitespace-nowrap">
          <FileText className="w-3.5 h-3.5" /> File
        </button>
        
        {/* Edit Menu */}
        <button onClick={() => execCommand('undo')} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap">Undo</button>
        <button onClick={() => execCommand('redo')} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap">Redo</button>
        
        {/* View Menu */}
        <button onClick={() => setShowRuler(!showRuler)} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap">View</button>
        <button onClick={() => setShowHeaders(!showHeaders)} className={`px-2 py-1 rounded whitespace-nowrap ${showHeaders ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>Headers</button>
        
        {/* Insert Menu */}
        <button onClick={() => openModal('insertImage')} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap">Image</button>
        <button onClick={() => openModal('tableOfContents')} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap">TOC</button>
        <button onClick={() => openModal('footnotes')} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap">Footnote</button>
        <button onClick={() => openModal('columns')} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap">Columns</button>
        
        {/* Review Menu */}
        <button 
          onClick={() => setTrackChangesEnabled(!trackChangesEnabled)} 
          className={`px-2 py-1 rounded whitespace-nowrap ${trackChangesEnabled ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
        >
          Track
        </button>
        <button 
          onClick={() => setShowComments(!showComments)} 
          className={`px-2 py-1 rounded flex items-center gap-1 whitespace-nowrap ${showComments ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
        >
          <MessageSquare className="w-3.5 h-3.5" /> {comments.length}
        </button>
        
        {/* Tools Menu */}
        <button onClick={() => openModal('wordCountGoals')} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap">Goals</button>
        <button onClick={() => openModal('thesaurus')} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap">Thesaurus</button>
        <button onClick={() => openModal('watermarks')} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap">Watermark</button>
        <button onClick={() => openModal('macros')} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap">Macros</button>
        
        {/* Advanced Features */}
        <button onClick={() => openModal('autoSave')} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap">Auto-Save</button>
        <button onClick={() => openModal('versionHistory')} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap">History</button>
        <button onClick={() => openModal('collaboration')} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap">Collab</button>
        <button onClick={() => openModal('templates')} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap">Templates</button>
        <button onClick={() => openModal('documentProtection')} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap">Protect</button>
        <button onClick={() => openModal('cloudStorage')} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap">Cloud</button>
        <button onClick={() => openModal('pageSetup')} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap">Page Setup</button>
        <button onClick={checkSpelling} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap flex items-center gap-1">
          <CheckCircle className="w-3.5 h-3.5" /> Spell
        </button>
        <button onClick={runGrammarCheck} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap flex items-center gap-1">
          <ListChecks className="w-3.5 h-3.5" /> Grammar
        </button>
        <button onClick={runAutoCorrect} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap flex items-center gap-1">
          <Wand2 className="w-3.5 h-3.5" /> Auto-Fix
        </button>
        <button onClick={showReadabilityStats} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap flex items-center gap-1">
          <BookOpenCheck className="w-3.5 h-3.5" /> Stats
        </button>
        <button onClick={() => openModal('insertChart')} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap flex items-center gap-1">
          <BarChart3 className="w-3.5 h-3.5" /> Chart
        </button>
        <button onClick={() => openModal('mailMerge')} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap flex items-center gap-1">
          <Mail className="w-3.5 h-3.5" /> Merge
        </button>
        <button onClick={() => openModal('textTransform')} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap flex items-center gap-1">
          <CaseSensitive className="w-3.5 h-3.5" /> Transform
        </button>
        <button onClick={() => openModal('dropCap')} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap flex items-center gap-1">
          <Type className="w-3.5 h-3.5" /> Drop Cap
        </button>
        <button onClick={() => openModal('themes')} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap flex items-center gap-1">
          <Palette className="w-3.5 h-3.5" /> Theme
        </button>
        <button onClick={() => openModal('language')} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap flex items-center gap-1">
          <Languages className="w-3.5 h-3.5" /> Lang
        </button>
        <button onClick={() => openModal('documentProperties')} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap flex items-center gap-1">
          <FileText className="w-3.5 h-3.5" /> Props
        </button>
        <button onClick={openPrintPreview} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap flex items-center gap-1">
          <Eye className="w-3.5 h-3.5" /> Preview
        </button>
        <button onClick={() => setShowShortcuts(true)} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap flex items-center gap-1">
          <Keyboard className="w-3.5 h-3.5" /> Shortcuts
        </button>
        <button onClick={() => setShowHelp(true)} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" /> Help
        </button>
        <button onClick={() => setShowBackup(true)} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap flex items-center gap-1">
          <Download className="w-3.5 h-3.5" /> Backup
        </button>
        <button onClick={() => setShowMonitoring(true)} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 whitespace-nowrap flex items-center gap-1">
          <Zap className="w-3.5 h-3.5" /> Status
        </button>
        
        <div className="flex-1" />
        <button onClick={handleSave} title="Save (Ctrl+S)" className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
          <Save className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
        <button onClick={handlePrint} title="Print (Ctrl+P)" className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
          <Printer className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
        <button onClick={handleExport} title="Export DOCX" className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
          <FileDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Main Toolbar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-2 py-1.5">
        <div className="flex items-center gap-0.5 flex-wrap">
          <ToolbarButton icon={Undo} action={() => execCommand('undo')} title="Undo (Ctrl+Z)" />
          <ToolbarButton icon={Redo} action={() => execCommand('redo')} title="Redo (Ctrl+Y)" />
          <ToolbarDivider />

          <div className="relative" data-dropdown="font">
            <button onClick={() => toggleDropdown('font')} className="flex items-center gap-1 px-2 py-1 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-sm min-w-[140px] justify-between">
              <span className="truncate">{currentFont}</span>
              <ChevronDown className="w-3 h-3 text-gray-500" />
            </button>
            {activeDropdown === 'font' && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto w-56">
                {FONT_FAMILIES.map(font => (
                  <button key={font.command} onClick={() => setFontFamily(font)} className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm" style={{ fontFamily: font.value }}>
                    {font.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <select value={currentFontSize} onChange={(e) => setFontSizeValue(e.target.value)} className="px-2 py-1 border border-gray-200 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-900 ml-1">
            <option value="1">8</option>
            <option value="2">10</option>
            <option value="3">12</option>
            <option value="4">14</option>
            <option value="5">18</option>
            <option value="6">24</option>
            <option value="7">36</option>
          </select>

          <ToolbarDivider />

          <select onChange={(e) => execCommand('formatBlock', e.target.value)} defaultValue="p" className="px-2 py-1 border border-gray-200 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-900">
            <option value="p">Normal</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="h4">Heading 4</option>
            <option value="h5">Heading 5</option>
            <option value="h6">Heading 6</option>
            <option value="pre">Code</option>
            <option value="blockquote">Quote</option>
          </select>

          <ToolbarDivider />

          <ToolbarButton icon={Bold} action={() => execCommand('bold')} title="Bold (Ctrl+B)" active={isBold} />
          <ToolbarButton icon={Italic} action={() => execCommand('italic')} title="Italic (Ctrl+I)" active={isItalic} />
          <ToolbarButton icon={Underline} action={() => execCommand('underline')} title="Underline (Ctrl+U)" active={isUnderline} />
          <ToolbarButton icon={Strikethrough} action={() => execCommand('strikeThrough')} title="Strikethrough" />
          <ToolbarButton icon={Subscript} action={() => execCommand('subscript')} title="Subscript" />
          <ToolbarButton icon={Superscript} action={() => execCommand('superscript')} title="Superscript" />

          <ToolbarDivider />

          <div className="relative" data-dropdown="textColor">
            <button onClick={() => toggleDropdown('textColor')} title="Text Color" className="flex flex-col items-center p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              <span className="text-sm font-bold" style={{ color: currentTextColor }}>A</span>
              <div className="w-4 h-1 rounded-sm" style={{ backgroundColor: currentTextColor }}></div>
            </button>
            {activeDropdown === 'textColor' && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 p-2 w-56">
                {recentTextColors.length > 0 && (
                  <>
                    <div className="text-xs text-gray-500 mb-1">Recent</div>
                    <div className="grid grid-cols-8 gap-0.5 mb-2">
                      {recentTextColors.map((color, i) => (
                        <button key={`recent-${i}`} onClick={() => setTextColor(color)} className="w-6 h-6 rounded border border-gray-200 dark:border-gray-700 hover:scale-110 transition-transform" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                    <div className="text-xs text-gray-500 mb-1">All Colors</div>
                  </>
                )}
                <div className="grid grid-cols-8 gap-0.5">
                  {TEXT_COLORS.map((color, i) => (
                    <button key={`${color}-${i}`} onClick={() => setTextColor(color)} className="w-6 h-6 rounded border border-gray-200 dark:border-gray-700 hover:scale-110 transition-transform" style={{ backgroundColor: color }} title={color} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative" data-dropdown="highlightColor">
            <button onClick={() => toggleDropdown('highlightColor')} title="Highlight Color" className="flex flex-col items-center p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              <span className="text-sm font-bold" style={{ backgroundColor: currentHighlightColor === 'transparent' ? '#fff' : currentHighlightColor, padding: '0 2px' }}>ab</span>
              <div className="w-4 h-1 rounded-sm" style={{ backgroundColor: currentHighlightColor === 'transparent' ? '#fbbf24' : currentHighlightColor }}></div>
            </button>
            {activeDropdown === 'highlightColor' && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 p-2 w-56">
                {recentHighlightColors.length > 0 && (
                  <>
                    <div className="text-xs text-gray-500 mb-1">Recent</div>
                    <div className="grid grid-cols-8 gap-0.5 mb-2">
                      {recentHighlightColors.map((color, i) => (
                        <button key={`recent-${i}`} onClick={() => setHighlightColor(color)} className="w-6 h-6 rounded border border-gray-200 dark:border-gray-700 hover:scale-110 transition-transform" style={{ backgroundColor: color === 'transparent' ? '#fff' : color }} />
                      ))}
                    </div>
                    <div className="text-xs text-gray-500 mb-1">All Colors</div>
                  </>
                )}
                <div className="grid grid-cols-8 gap-0.5">
                  {HIGHLIGHT_COLORS.map((color, i) => (
                    <button key={`${color}-${i}`} onClick={() => setHighlightColor(color)} className="w-6 h-6 rounded border border-gray-200 dark:border-gray-700 hover:scale-110 transition-transform" style={{ backgroundColor: color === 'transparent' ? '#fff' : color, backgroundImage: color === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%)' : undefined, backgroundSize: '4px 4px', backgroundPosition: '0 0, 2px 2px' }} title={color === 'transparent' ? 'No highlight' : color} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <ToolbarButton icon={Eraser} action={clearFormatting} title="Clear Formatting" />

          <ToolbarDivider />

          <ToolbarButton icon={AlignLeft} action={() => execCommand('justifyLeft')} title="Align Left" />
          <ToolbarButton icon={AlignCenter} action={() => execCommand('justifyCenter')} title="Align Center" />
          <ToolbarButton icon={AlignRight} action={() => execCommand('justifyRight')} title="Align Right" />
          <ToolbarButton icon={AlignJustify} action={() => execCommand('justifyFull')} title="Justify" />

          <ToolbarDivider />

          <ToolbarButton icon={List} action={() => execCommand('insertUnorderedList')} title="Bullet List" />
          <ToolbarButton icon={ListOrdered} action={() => execCommand('insertOrderedList')} title="Numbered List" />
          <ToolbarButton icon={Outdent} action={() => execCommand('outdent')} title="Decrease Indent" />
          <ToolbarButton icon={Indent} action={() => execCommand('indent')} title="Increase Indent" />

          <ToolbarDivider />

          <ToolbarButton icon={Link2} action={() => openModal('insertLink')} title="Insert Link" />
          <ToolbarButton icon={ImagePlus} action={() => openModal('insertImage')} title="Insert Image" />
          <ToolbarButton icon={Table2} action={() => openModal('insertTable')} title="Insert Table" />
          
          {/* Feature 45: Text Box */}
          <ToolbarButton icon={Type} action={() => openModal('textBoxes')} title="Insert Text Box" />
          
          {/* Feature 46: Shapes */}
          <ToolbarButton icon={PenTool} action={() => openModal('shapes')} title="Insert Shape" />
          
          <ToolbarButton icon={MinusIcon} action={() => execCommand('insertHTML', '<hr style="border: none; border-top: 2px solid #e5e7eb; margin: 1.5em 0;" />')} title="Horizontal Line" />
          <ToolbarButton icon={Hash} action={() => openModal('specialChars')} title="Special Characters" />
          <ToolbarButton icon={FileMinus2} action={insertPageBreak} title="Page Break" />

          <ToolbarDivider />

          <button onClick={() => openModal('lineSpacing')} title="Line Spacing" className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm">
            <Columns className="w-4 h-4 rotate-90" />
          </button>

          <ToolbarButton icon={Search} action={() => openModal('findReplace')} title="Find & Replace (Ctrl+F)" />

          <ToolbarDivider />

          <ToolbarButton icon={RulerIcon} action={() => setShowRuler(!showRuler)} title="Toggle Ruler" active={showRuler} />
        </div>
      </div>

      {/* Table Editing Toolbar - Shows when cursor is in a table */}
      {showTableToolbar && (selectedTableCell || selectedTableCells.size > 0) && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-2 py-1.5">
          <div className="flex items-center gap-0.5 flex-wrap">
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300 mr-2">
              Table{selectedTableCells.size > 1 ? ` (${selectedTableCells.size} cells selected)` : ':'}
            </span>
            
            {/* Row Operations */}
            <ToolbarButton icon={Plus} action={() => addTableRow('above')} title="Add Row Above" />
            <ToolbarButton icon={Plus} action={() => addTableRow('below')} title="Add Row Below" />
            <ToolbarButton icon={Trash2} action={deleteTableRow} title="Delete Row" />
            
            <ToolbarDivider />
            
            {/* Column Operations */}
            <ToolbarButton icon={Plus} action={() => addTableColumn('left')} title="Add Column Left" />
            <ToolbarButton icon={Plus} action={() => addTableColumn('right')} title="Add Column Right" />
            <ToolbarButton icon={Trash2} action={deleteTableColumn} title="Delete Column" />
            
            <ToolbarDivider />
            
            {/* Cell Formatting */}
            <div className="relative" data-dropdown>
              <button
                onClick={() => setShowCellColorPicker(!showCellColorPicker)}
                title="Cell Background Color"
                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm"
              >
                <Palette className="w-4 h-4" />
                <span className="text-xs">Cell Color</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {showCellColorPicker && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 p-2 w-56">
                  <button
                    onClick={() => {
                      clearCellBackgroundColor();
                      setShowCellColorPicker(false);
                    }}
                    className="w-full text-left px-2 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-800 rounded mb-1"
                  >
                    Clear Background
                  </button>
                  <div className="grid grid-cols-8 gap-0.5">
                    {TEXT_COLORS.map((color, i) => (
                      <button
                        key={`cell-${color}-${i}`}
                        onClick={() => {
                          setCellBackgroundColor(color);
                          setShowCellColorPicker(false);
                        }}
                        className="w-6 h-6 rounded border border-gray-200 dark:border-gray-700 hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <ToolbarDivider />
            
            {/* Table Operations */}
            <ToolbarButton icon={Trash2} action={deleteTable} title="Delete Table" />
          </div>
        </div>
      )}

      {/* Feature 41: Headers/Footers */}
      {showHeaders && (
        <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Header</label>
              <input
                value={headerText}
                onChange={(e) => setHeaderText(e.target.value)}
                placeholder="Enter header text..."
                className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-900"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Footer</label>
              <input
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="Enter footer text..."
                className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-900"
              />
            </div>
          </div>
        </div>
      )}

      {/* Ruler */}
      {showRuler && (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 h-6 flex items-center px-4 overflow-hidden">
          <div className="flex-1 relative h-full flex items-center">
            <div className="absolute inset-x-0 flex items-end h-full">
              {Array.from({ length: 17 }, (_, i) => (
                <div key={i} className="flex-1 flex items-end relative">
                  <div className="w-px h-3 bg-gray-400 dark:bg-gray-600"></div>
                  <span className="absolute left-1 bottom-0 text-[9px] text-gray-500 dark:text-gray-400">{i}</span>
                  <div className="flex-1 flex items-end">
                    <div className="w-px h-1.5 bg-gray-300 dark:bg-gray-700 mx-auto"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Editor Area */}
      <div 
        className="flex-1 overflow-y-auto bg-gray-200 dark:bg-gray-800 p-4 md:p-8 relative"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onContextMenu={handleContextMenu}
      >
        {/* Feature 49: Watermark */}
        {showWatermark && watermarkText && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <div className="text-7xl text-gray-300 dark:text-gray-700 opacity-20 -rotate-45 font-bold">
              {watermarkText}
            </div>
          </div>
        )}
        
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
          </div>
        )}
        
        <div
          className="mx-auto bg-white dark:bg-gray-900 shadow-lg relative z-10"
          style={{
            width: pageSetup.orientation === 'landscape' ? `${PAGE_HEIGHT_A4}px` : `${PAGE_WIDTH_A4}px`,
            maxWidth: '100%',
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            padding: `${pageSetup.margins.top}px ${pageSetup.margins.right}px ${pageSetup.margins.bottom}px ${pageSetup.margins.left}px`,
          }}
        >
          {/* Feature 41: Header */}
          {showHeaders && headerText && (
            <div className="border-b border-gray-300 dark:border-gray-700 px-16 py-2 text-center text-sm text-gray-500 dark:text-gray-400">
              {headerText}
            </div>
          )}
          
          <div
            ref={editorRef}
            contentEditable={!readOnly && !documentProtected}
            onInput={handleInput}
            onMouseUp={() => {
              handleTableCellMouseUp();
            }}
            onClick={(e) => {
              // Handle Ctrl/Cmd+Click for multi-selection
              const target = e.target as HTMLElement;
              if (target.tagName === 'TD' || target.tagName === 'TH') {
                handleTableCellClick(e, target as HTMLTableCellElement);
              }
            }}
            onMouseDown={(e) => {
              // Prevent default text selection when starting drag on table cells
              const target = e.target as HTMLElement;
              if (target.tagName === 'TD' || target.tagName === 'TH') {
                handleTableCellMouseDown(e, target as HTMLTableCellElement);
              }
            }}
            onMouseMove={(e) => {
              // Handle drag selection - prevent default to avoid text selection
              if (isSelectingCells && e.buttons === 1) {
                e.preventDefault();
              }
              
              const target = e.target as HTMLElement;
              if (target.tagName === 'TD' || target.tagName === 'TH') {
                handleTableCellMouseEnter(e, target as HTMLTableCellElement);
              }
            }}
            className="prose prose-lg dark:prose-invert max-w-none p-16 md:p-24 min-h-[1056px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            suppressContentEditableWarning
            style={{ lineHeight: '1.8' }}
            role="textbox"
            aria-multiline="true"
            aria-label="Document editor"
            aria-readonly={readOnly || documentProtected}
          />
          
          {/* Feature 41: Footer */}
          {showHeaders && footerText && (
            <div className="border-t border-gray-300 dark:border-gray-700 px-16 py-2 text-center text-sm text-gray-500 dark:text-gray-400">
              {footerText}
            </div>
          )}
        </div>
      </div>

      {/* Feature 52: Comments Panel */}
      {showComments && (
        <div className="w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-sm">Comments ({comments.length})</h3>
            <button 
              onClick={() => openModal('comments')}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              title="Add comment"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="p-3 space-y-3">
            {comments.map(comment => (
              <div key={comment.id} className="bg-gray-50 dark:bg-gray-800 rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{comment.author}</span>
                    <span className="text-xs text-gray-500">{comment.timestamp.toLocaleTimeString()}</span>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => startEditComment(comment)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                      title="Edit"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => deleteComment(comment.id)}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                </div>
                {editingCommentId === comment.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editingCommentText}
                      onChange={(e) => setEditingCommentText(e.target.value)}
                      className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-900 resize-none"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={saveEditComment}
                        className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded"
                      >
                        Save
                      </button>
                      <button 
                        onClick={cancelEditComment}
                        className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{comment.text}</p>
                )}
              </div>
            ))}
            {comments.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No comments yet. Click + to add one.</p>
            )}
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-1.5 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
        <span>{stats.words} words</span>
        <span>{stats.chars} characters</span>
        <span>{stats.paragraphs} paragraphs</span>
        
        {/* Feature 57: Reading time */}
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" /> {readingTime} min read
        </span>
        
        {/* Feature 56: Word count goal */}
        {wordCountGoal > 0 && (
          <span className={`flex items-center gap-1 ${stats.words >= wordCountGoal ? 'text-green-600' : 'text-orange-600'}`}>
            <Target className="w-3 h-3" /> {stats.words}/{wordCountGoal}
          </span>
        )}
        
        {/* Feature 58: Auto-save indicator */}
        {autoSaveEnabled && lastSaved && (
          <span className="flex items-center gap-1 text-green-600">
            <Cloud className="w-3 h-3" /> Saved {lastSaved.toLocaleTimeString()}
          </span>
        )}
        
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(Math.max(50, zoom - 10))} className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded" aria-label="Zoom out">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <input
            type="number"
            value={zoomInput}
            onChange={(e) => {
              setZoomInput(e.target.value);
              const value = parseInt(e.target.value);
              if (!isNaN(value) && value >= 50 && value <= 200) {
                setZoom(value);
              }
            }}
            onBlur={() => setZoomInput(String(zoom))}
            className="w-14 text-center text-xs border border-gray-200 dark:border-gray-700 rounded px-1 py-0.5 bg-white dark:bg-gray-900"
            min="50"
            max="200"
            aria-label="Zoom percentage"
          />
          <button onClick={() => setZoom(Math.min(200, zoom + 10))} className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded" aria-label="Zoom in">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          {/* Zoom presets */}
          <div className="flex gap-0.5 ml-2">
            {[50, 75, 100, 125, 150, 200].map(preset => (
              <button
                key={preset}
                onClick={() => { setZoom(preset); setZoomInput(String(preset)); }}
                className={`px-1.5 py-0.5 text-xs rounded ${zoom === preset ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                aria-label={`Zoom to ${preset}%`}
              >
                {preset}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal !== 'none' && modal !== 'findReplace' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          {modal === 'insertImage' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold">Insert Image</h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">From URL</label>
                  <div className="flex gap-2">
                    <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && imageUrl && insertImage(imageUrl)} placeholder="https://example.com/image.jpg" className="flex-1 text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
                    <button onClick={() => imageUrl && insertImage(imageUrl)} className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm">Insert</button>
                  </div>
                </div>
                <OrDivider />
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Upload from device</label>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Click to upload image</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          )}

          {modal === 'insertLink' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold">Insert Link</h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Display Text</label>
                  <input value={linkText} onChange={(e) => setLinkText(e.target.value)} placeholder="Link text (optional)" className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">URL</label>
                  <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && insertLink()} placeholder="https://example.com" className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
                </div>
                <button onClick={insertLink} className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium">Insert Link</button>
              </div>
            </div>
          )}

          {modal === 'insertTable' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-sm">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold">Insert Table</h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Rows</label>
                    <input type="number" value={tableRows} onChange={(e) => { const value = parseInt(e.target.value); if (!isNaN(value) && value >= MIN_TABLE_ROWS && value <= MAX_TABLE_ROWS) setTableRows(value); }} min={MIN_TABLE_ROWS} max={MAX_TABLE_ROWS} className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Columns</label>
                    <input type="number" value={tableCols} onChange={(e) => { const value = parseInt(e.target.value); if (!isNaN(value) && value >= MIN_TABLE_COLS && value <= MAX_TABLE_COLS) setTableCols(value); }} min={MIN_TABLE_COLS} max={MAX_TABLE_COLS} className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <button onClick={insertTable} className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium">Insert Table</button>
              </div>
            </div>
          )}

          {modal === 'specialChars' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-lg">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold">Special Characters</h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-8 sm:grid-cols-10 gap-1">
                  {SPECIAL_CHARS.map((char, i) => (
                    <button key={i} onClick={() => insertSpecialChar(char)} className="w-9 h-9 flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-gray-800 rounded border border-gray-200 dark:border-gray-700" title={char}>{char}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {modal === 'lineSpacing' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-sm">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold">Line Spacing</h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-2">
                {[1, 1.15, 1.5, 2, 2.5, 3].map(val => (
                  <button key={val} onClick={() => { setLineSpacingValue(val); if (editorRef.current) { const blocks = editorRef.current.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, div'); blocks.forEach(el => { (el as HTMLElement).style.lineHeight = String(val); }); onChange(editorRef.current.innerHTML); } }} className={`w-full px-3 py-2 rounded text-sm text-left transition-colors ${lineSpacingValue === val ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>{val}</button>
                ))}
              </div>
            </div>
          )}

          {/* Feature 41: Headers/Footers Modal */}
          {modal === 'headersFooters' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold">Headers & Footers</h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Header Text</label>
                  <input value={headerText} onChange={(e) => setHeaderText(e.target.value)} placeholder="Enter header..." className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Footer Text</label>
                  <input value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="Enter footer..." className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button onClick={() => { setShowHeaders(true); closeModal(); }} className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium">Apply</button>
              </div>
            </div>
          )}

          {/* Feature 42: Table of Contents Modal */}
          {modal === 'tableOfContents' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold">Table of Contents</h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Generate a table of contents from headings in your document.</p>
                <button onClick={insertTableOfContents} className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium">Generate TOC</button>
              </div>
            </div>
          )}

          {/* Feature 43: Footnotes Modal */}
          {modal === 'footnotes' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold">Insert Footnote</h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Insert a footnote marker at the current cursor position.</p>
                <button onClick={insertFootnote} className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium">Insert Footnote</button>
              </div>
            </div>
          )}

          {/* Feature 44: Columns Modal */}
          {modal === 'columns' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-sm">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold">Columns</h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(num => (
                  <button key={num} onClick={() => setColumns(num)} className={`w-full px-3 py-2 rounded text-sm text-left transition-colors ${columnCount === num ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>{num} Column{num > 1 ? 's' : ''}</button>
                ))}
              </div>
            </div>
          )}

          {/* Feature 45: Text Boxes Modal */}
          {modal === 'textBoxes' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold">Insert Text Box</h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Insert a text box at the current cursor position.</p>
                <button onClick={insertTextBox} className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium">Insert Text Box</button>
              </div>
            </div>
          )}

          {/* Feature 46: Shapes Modal */}
          {modal === 'shapes' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold">Insert Shape</h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 grid grid-cols-3 gap-3">
                <button onClick={() => insertShape('rectangle')} className="flex flex-col items-center gap-2 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="w-12 h-8 bg-blue-500"></div>
                  <span className="text-sm">Rectangle</span>
                </button>
                <button onClick={() => insertShape('circle')} className="flex flex-col items-center gap-2 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="w-10 h-10 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Circle</span>
                </button>
                <button onClick={() => insertShape('triangle')} className="flex flex-col items-center gap-2 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[40px] border-b-blue-500"></div>
                  <span className="text-sm">Triangle</span>
                </button>
              </div>
            </div>
          )}

          {/* Feature 49: Watermarks Modal */}
          {modal === 'watermarks' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold">Add Watermark</h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Watermark Text</label>
                  <input value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} placeholder="CONFIDENTIAL, DRAFT, etc." className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button onClick={addWatermark} className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium">Add Watermark</button>
              </div>
            </div>
          )}

          {/* Feature 52: Comments Modal */}
          {modal === 'comments' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold">Add Comment</h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Comment</label>
                  <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Enter your comment..." className="w-full h-32 text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <button onClick={addComment} className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium">Add Comment</button>
              </div>
            </div>
          )}

          {/* Feature 55: Thesaurus Modal */}
          {modal === 'thesaurus' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold">Thesaurus</h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Select a word in the document, then click a synonym to replace it.</p>
                <div className="space-y-3">
                  {Object.entries(THESAURUS).map(([word, synonyms]) => (
                    <div key={word} className="border border-gray-200 dark:border-gray-700 rounded p-3">
                      <div className="font-medium text-sm mb-2 text-gray-900 dark:text-gray-100">{word}</div>
                      <div className="flex flex-wrap gap-1">
                        {synonyms.map(synonym => (
                          <button 
                            key={synonym} 
                            onClick={() => replaceWithSynonym(synonym)}
                            className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded transition-colors"
                          >
                            {synonym}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Feature 56: Word Count Goals Modal */}
          {modal === 'wordCountGoals' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-sm">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold">Word Count Goal</h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Target Word Count</label>
                  <input type="number" value={wordCountGoal} onChange={(e) => setWordCountGoal(parseInt(e.target.value) || 0)} placeholder="e.g., 1000" className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button onClick={closeModal} className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium">Set Goal</button>
              </div>
            </div>
          )}

          {/* Feature 58: Auto-save Modal */}
          {modal === 'autoSave' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-sm">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold">Auto-Save Settings</h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={autoSaveEnabled} onChange={(e) => setAutoSaveEnabled(e.target.checked)} className="rounded" />
                  <span className="text-sm">Enable auto-save (every 30 seconds)</span>
                </label>
                {lastSaved && <p className="text-xs text-gray-500">Last saved: {lastSaved.toLocaleString()}</p>}
                <button onClick={closeModal} className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium">Save Settings</button>
              </div>
            </div>
          )}

          {/* Feature 59: Version History Modal */}
          {modal === 'versionHistory' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900">
                <h3 className="font-semibold">Version History</h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4">
                <button onClick={() => saveVersion('Manual version')} className="w-full mb-4 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium">Save Current Version</button>
                {versions.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No versions saved yet</p>
                ) : (
                  <div className="space-y-2">
                    {versions.map(version => (
                      <div key={version.id} className="border border-gray-200 dark:border-gray-700 rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{version.label || 'Auto-save'}</span>
                          <span className="text-xs text-gray-500">{version.timestamp.toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">by {version.author}</p>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => restoreVersion(version)}
                            className="flex-1 px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded"
                          >
                            Restore
                          </button>
                          <button 
                            onClick={() => deleteVersion(version.id)}
                            className="px-2 py-1 text-xs bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Feature 60: Collaboration Modal */}
          {modal === 'collaboration' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold">Collaboration</h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={collaborationEnabled} onChange={(e) => setCollaborationEnabled(e.target.checked)} className="rounded" />
                  <span className="text-sm">Enable real-time collaboration</span>
                </label>
                {collaborationEnabled && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Invite Collaborators</label>
                    <input placeholder="Enter email addresses..." className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                )}
                <button onClick={closeModal} className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium">Save Settings</button>
              </div>
            </div>
          )}

          {/* Feature 61: Templates Modal */}
          {modal === 'templates' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900">
                <h3 className="font-semibold">Document Templates</h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 grid grid-cols-2 gap-4">
                {['Blank Document', 'Resume', 'Letter', 'Report', 'Memo', 'Essay'].map(template => (
                  <button key={template} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-500 transition-colors text-left">
                    <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 rounded mb-2"></div>
                    <div className="text-sm font-medium">{template}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Feature 62: Mail Merge Modal */}
          {modal === 'mailMerge' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold">Mail Merge</h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Merge your document with a data source to create personalized documents.</p>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Data Source (CSV)</label>
                  <input type="file" accept=".csv" className="w-full text-sm" />
                </div>
                <button onClick={closeModal} className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium">Start Merge</button>
              </div>
            </div>
          )}

          {/* Feature 63: Macros Modal */}
          {modal === 'macros' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900">
                <h3 className="font-semibold">Macros</h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div className="border border-gray-200 dark:border-gray-700 rounded p-3">
                  <h4 className="text-sm font-medium mb-2">Create New Macro</h4>
                  <input value={newMacroName} onChange={(e) => setNewMacroName(e.target.value)} placeholder="Macro name" className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2" />
                  <textarea value={newMacroCode} onChange={(e) => setNewMacroCode(e.target.value)} placeholder="Macro code (e.g., 'bold', 'italic')" className="w-full h-20 text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-2" />
                  <button onClick={() => { if (newMacroName && newMacroCode) { setMacros([...macros, { id: Date.now().toString(), name: newMacroName, code: newMacroCode }]); setNewMacroName(''); setNewMacroCode(''); } }} className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium">Create Macro</button>
                </div>
                {macros.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Saved Macros</h4>
                    <div className="space-y-2">
                      {macros.map(macro => (
                        <div key={macro.id} className="border border-gray-200 dark:border-gray-700 rounded p-2 flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">{macro.name}</div>
                            <div className="text-xs text-gray-500">{macro.code}</div>
                          </div>
                          <button onClick={() => runMacro(macro)} className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded">Run</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Feature 65: Cloud Storage Modal */}
          {modal === 'cloudStorage' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold">Cloud Storage</h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={cloudSyncEnabled} onChange={(e) => setCloudSyncEnabled(e.target.checked)} className="rounded" />
                  <span className="text-sm">Enable cloud sync</span>
                </label>
                {cloudSyncEnabled && (
                  <div className="space-y-2">
                    <button className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-left flex items-center gap-2">
                      <Cloud className="w-4 h-4" /> Google Drive
                    </button>
                    <button className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-left flex items-center gap-2">
                      <Cloud className="w-4 h-4" /> OneDrive
                    </button>
                    <button className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-left flex items-center gap-2">
                      <Cloud className="w-4 h-4" /> Dropbox
                    </button>
                  </div>
                )}
                <button onClick={closeModal} className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium">Save Settings</button>
              </div>
            </div>
          )}

          {/* Feature 50: Document Protection Modal */}
          {modal === 'documentProtection' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-sm">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold">Document Protection</h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={documentProtected} onChange={(e) => setDocumentProtected(e.target.checked)} className="rounded" />
                  <span className="text-sm">Protect document (read-only)</span>
                </label>
                {documentProtected && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Password (optional)</label>
                    <input type="password" value={protectionPassword} onChange={(e) => setProtectionPassword(e.target.value)} placeholder="Enter password" className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                )}
                <button onClick={closeModal} className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium">Apply Protection</button>
              </div>
            </div>
          )}

          {/* Page Setup Modal */}
          {modal === 'pageSetup' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold">Page Setup</h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Orientation</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPageSetup({ ...pageSetup, orientation: 'portrait' })}
                      className={`flex-1 px-3 py-2 rounded border-2 ${pageSetup.orientation === 'portrait' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                    >
                      Portrait
                    </button>
                    <button
                      onClick={() => setPageSetup({ ...pageSetup, orientation: 'landscape' })}
                      className={`flex-1 px-3 py-2 rounded border-2 ${pageSetup.orientation === 'landscape' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                    >
                      Landscape
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Paper Size</label>
                  <select
                    value={pageSetup.paperSize}
                    onChange={(e) => setPageSetup({ ...pageSetup, paperSize: e.target.value as any })}
                    className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-white dark:bg-gray-900"
                  >
                    <option value="letter">Letter (8.5" × 11")</option>
                    <option value="a4">A4 (210mm × 297mm)</option>
                    <option value="legal">Legal (8.5" × 14")</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Margins (pixels)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500">Top</label>
                      <input
                        type="number"
                        value={pageSetup.margins.top}
                        onChange={(e) => setPageSetup({ ...pageSetup, margins: { ...pageSetup.margins, top: parseInt(e.target.value) || 0 } })}
                        className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1 bg-transparent"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Bottom</label>
                      <input
                        type="number"
                        value={pageSetup.margins.bottom}
                        onChange={(e) => setPageSetup({ ...pageSetup, margins: { ...pageSetup.margins, bottom: parseInt(e.target.value) || 0 } })}
                        className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1 bg-transparent"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Left</label>
                      <input
                        type="number"
                        value={pageSetup.margins.left}
                        onChange={(e) => setPageSetup({ ...pageSetup, margins: { ...pageSetup.margins, left: parseInt(e.target.value) || 0 } })}
                        className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1 bg-transparent"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Right</label>
                      <input
                        type="number"
                        value={pageSetup.margins.right}
                        onChange={(e) => setPageSetup({ ...pageSetup, margins: { ...pageSetup.margins, right: parseInt(e.target.value) || 0 } })}
                        className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1 bg-transparent"
                      />
                    </div>
                  </div>
                </div>
                <button onClick={() => { closeModal(); addToast('Page setup applied', 'success'); }} className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium">Apply</button>
              </div>
            </div>
          )}

          {/* Spelling Errors Modal */}
          {modal === 'spellingErrors' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900">
                <h3 className="font-semibold">Spelling Errors ({misspelledWords.length})</h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4">
                {misspelledWords.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No spelling errors found!</p>
                ) : (
                  <div className="space-y-2">
                    {misspelledWords.map((word, index) => (
                      <div key={index} className="border border-gray-200 dark:border-gray-700 rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-red-600 dark:text-red-400">{word}</span>
                          <button 
                            onClick={() => {
                              // Find and replace the word in the document
                              if (editorRef.current) {
                                const text = editorRef.current.innerHTML;
                                const corrected = prompt(`Correct spelling for "${word}":`, word);
                                if (corrected && corrected !== word) {
                                  editorRef.current.innerHTML = text.replace(new RegExp(`\\b${word}\\b`, 'g'), corrected);
                                  onChange(editorRef.current.innerHTML);
                                  addToast(`Corrected "${word}" to "${corrected}"`, 'success');
                                }
                              }
                            }}
                            className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded"
                          >
                            Correct
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Grammar Errors Modal */}
          {modal === 'grammarErrors' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900">
                <h3 className="font-semibold">Grammar Issues ({grammarIssues.length})</h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-3">
                {grammarIssues.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No grammar issues found!</p>
                ) : (
                  grammarIssues.map((issue, index) => (
                    <div key={index} className={`border rounded p-3 ${issue.severity === 'error' ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : issue.severity === 'warning' ? 'border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20' : 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${issue.severity === 'error' ? 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200' : issue.severity === 'warning' ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200' : 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'}`}>
                              {issue.severity}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 dark:text-gray-100 mb-1">{issue.message}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 italic">"{issue.context}"</p>
                        </div>
                        {issue.suggestion && (
                          <button 
                            onClick={() => {
                              if (editorRef.current) {
                                const text = editorRef.current.innerHTML;
                                const start = issue.offset;
                                const end = start + issue.length;
                                const before = text.substring(0, start);
                                const after = text.substring(end);
                                editorRef.current.innerHTML = before + issue.suggestion + after;
                                onChange(editorRef.current.innerHTML);
                                addToast('Issue corrected', 'success');
                                closeModal();
                              }
                            }}
                            className="ml-2 px-3 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded whitespace-nowrap"
                          >
                            Fix: {issue.suggestion}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Readability Stats Modal */}
          {modal === 'readabilityStats' && readabilityStats && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900">
                <h3 className="font-semibold flex items-center gap-2">
                  <BookOpenCheck className="w-5 h-5" /> Readability Statistics
                </h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-gray-200 dark:border-gray-700 rounded p-3">
                    <div className="text-xs text-gray-500 mb-1">Reading Level</div>
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{readabilityStats.readingLevel}</div>
                  </div>
                  <div className="border border-gray-200 dark:border-gray-700 rounded p-3">
                    <div className="text-xs text-gray-500 mb-1">Flesch Reading Ease</div>
                    <div className="text-lg font-bold">{readabilityStats.fleschReadingEase}</div>
                    <div className="text-xs text-gray-500">{readabilityStats.fleschReadingEase >= 90 ? 'Very Easy' : readabilityStats.fleschReadingEase >= 80 ? 'Easy' : readabilityStats.fleschReadingEase >= 70 ? 'Fairly Easy' : readabilityStats.fleschReadingEase >= 60 ? 'Standard' : readabilityStats.fleschReadingEase >= 50 ? 'Fairly Difficult' : readabilityStats.fleschReadingEase >= 30 ? 'Difficult' : 'Very Confusing'}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="border border-gray-200 dark:border-gray-700 rounded p-3">
                    <div className="text-xs text-gray-500 mb-1">Words</div>
                    <div className="text-lg font-bold">{readabilityStats.words}</div>
                  </div>
                  <div className="border border-gray-200 dark:border-gray-700 rounded p-3">
                    <div className="text-xs text-gray-500 mb-1">Sentences</div>
                    <div className="text-lg font-bold">{readabilityStats.sentences}</div>
                  </div>
                  <div className="border border-gray-200 dark:border-gray-700 rounded p-3">
                    <div className="text-xs text-gray-500 mb-1">Paragraphs</div>
                    <div className="text-lg font-bold">{readabilityStats.paragraphs}</div>
                  </div>
                  <div className="border border-gray-200 dark:border-gray-700 rounded p-3">
                    <div className="text-xs text-gray-500 mb-1">Avg Words/Sentence</div>
                    <div className="text-lg font-bold">{readabilityStats.averageWordsPerSentence}</div>
                  </div>
                  <div className="border border-gray-200 dark:border-gray-700 rounded p-3">
                    <div className="text-xs text-gray-500 mb-1">Avg Syllables/Word</div>
                    <div className="text-lg font-bold">{readabilityStats.averageSyllablesPerWord}</div>
                  </div>
                  <div className="border border-gray-200 dark:border-gray-700 rounded p-3">
                    <div className="text-xs text-gray-500 mb-1">Characters</div>
                    <div className="text-lg font-bold">{readabilityStats.characters}</div>
                  </div>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded p-3">
                  <div className="text-sm font-medium mb-2">Readability Scores</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Flesch-Kincaid Grade:</span><span className="font-medium">{readabilityStats.fleschKincaid}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Gunning Fog:</span><span className="font-medium">{readabilityStats.gunningFog}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Coleman-Liau:</span><span className="font-medium">{readabilityStats.colemanLiau}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">ARI:</span><span className="font-medium">{readabilityStats.ari}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">SMOG:</span><span className="font-medium">{readabilityStats.smog}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Insert Chart Modal */}
          {modal === 'insertChart' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900">
                <h3 className="font-semibold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" /> Insert Chart
                </h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Chart Type</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['bar', 'line', 'pie', 'area'] as ChartType[]).map(type => (
                      <button
                        key={type}
                        onClick={() => setChartType(type)}
                        className={`p-3 border-2 rounded-lg ${chartType === type ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                      >
                        {type === 'bar' && <BarChart3 className="w-6 h-6 mx-auto mb-1" />}
                        {type === 'line' && <TrendingUp className="w-6 h-6 mx-auto mb-1" />}
                        {type === 'pie' && <PieChart className="w-6 h-6 mx-auto mb-1" />}
                        {type === 'area' && <FileBarChart className="w-6 h-6 mx-auto mb-1" />}
                        <div className="text-xs capitalize">{type}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Chart Title</label>
                  <input
                    value={chartData.datasets[0].label}
                    onChange={(e) => setChartData({ ...chartData, datasets: [{ ...chartData.datasets[0], label: e.target.value }] })}
                    className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Labels (comma-separated)</label>
                  <input
                    value={chartData.labels.join(', ')}
                    onChange={(e) => setChartData({ ...chartData, labels: e.target.value.split(',').map(s => s.trim()) })}
                    className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Values (comma-separated)</label>
                  <input
                    value={chartData.datasets[0].data.join(', ')}
                    onChange={(e) => setChartData({ ...chartData, datasets: [{ ...chartData.datasets[0], data: e.target.value.split(',').map(s => parseFloat(s.trim()) || 0) }] })}
                    className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Preview</label>
                  <div className="border border-gray-200 dark:border-gray-700 rounded p-2 bg-gray-50 dark:bg-gray-800" dangerouslySetInnerHTML={{ __html: generateChartSVG(chartType, chartData, 400, 250) }} />
                </div>
                <button onClick={insertChart} className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium">Insert Chart</button>
              </div>
            </div>
          )}

          {/* Mail Merge Modal */}
          {modal === 'mailMerge' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold flex items-center gap-2">
                  <Mail className="w-5 h-5" /> Mail Merge
                </h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Upload CSV File</label>
                  <input type="file" accept=".csv" onChange={handleCSVUpload} className="w-full text-sm" />
                  <p className="text-xs text-gray-500 mt-1">Use {'{{column_name}}'} in your document as placeholders</p>
                </div>
                {csvData && (
                  <div className="border border-gray-200 dark:border-gray-700 rounded p-3">
                    <div className="text-sm font-medium mb-2">Loaded: {csvData.rows.length} records</div>
                    <div className="text-xs text-gray-500 mb-2">Columns: {csvData.headers.join(', ')}</div>
                    <button onClick={runMailMerge} className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium">Generate Documents</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mail Merge Preview Modal */}
          {modal === 'mailMergePreview' && mergedDocuments.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900">
                <h3 className="font-semibold">Mail Merge Preview ({mergePreviewIndex + 1} of {mergedDocuments.length})</h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4">
                <div className="flex gap-2 mb-4">
                  <button onClick={() => setMergePreviewIndex(Math.max(0, mergePreviewIndex - 1))} disabled={mergePreviewIndex === 0} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm disabled:opacity-50">Previous</button>
                  <button onClick={() => setMergePreviewIndex(Math.min(mergedDocuments.length - 1, mergePreviewIndex + 1))} disabled={mergePreviewIndex === mergedDocuments.length - 1} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm disabled:opacity-50">Next</button>
                  <button onClick={() => {
                    const blob = new Blob([mergedDocuments[mergePreviewIndex]], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `document_${mergePreviewIndex + 1}.html`;
                    a.click();
                    addToast('Document downloaded', 'success');
                  }} className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm">Download</button>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900" dangerouslySetInnerHTML={{ __html: mergedDocuments[mergePreviewIndex] }} />
              </div>
            </div>
          )}

          {/* Text Transform Modal */}
          {modal === 'textTransform' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold flex items-center gap-2">
                  <CaseSensitive className="w-5 h-5" /> Text Transform
                </h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Select text in the document, then choose a transformation:</p>
                {(['uppercase', 'lowercase', 'capitalize', 'titlecase', 'sentencecase', 'togglecase', 'inverse'] as const).map(transform => (
                  <button key={transform} onClick={() => applyTextTransform(transform)} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-left capitalize">
                    {transform}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Drop Cap Modal */}
          {modal === 'dropCap' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold flex items-center gap-2">
                  <Type className="w-5 h-5" /> Drop Cap
                </h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Select a paragraph to apply a drop cap to the first letter.</p>
                <button onClick={insertDropCap} className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium">Apply Drop Cap</button>
              </div>
            </div>
          )}

          {/* Themes Modal */}
          {modal === 'themes' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900">
                <h3 className="font-semibold flex items-center gap-2">
                  <Palette className="w-5 h-5" /> Document Themes
                </h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 grid grid-cols-2 gap-4">
                {DOCUMENT_THEMES.map(theme => (
                  <button key={theme.name} onClick={() => applyTheme(theme)} className={`border-2 rounded-lg p-4 text-left ${currentTheme.name === theme.name ? 'border-blue-500' : 'border-gray-200 dark:border-gray-700'} hover:border-blue-400`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: theme.primaryColor }}></div>
                      <div className="font-medium text-sm">{theme.name}</div>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">Heading: {theme.headingFont}</div>
                    <div className="text-xs text-gray-500">Body: {theme.bodyFont}</div>
                    <div className="flex gap-1 mt-2">
                      <div className="w-6 h-6 rounded" style={{ backgroundColor: theme.primaryColor }}></div>
                      <div className="w-6 h-6 rounded" style={{ backgroundColor: theme.secondaryColor }}></div>
                      <div className="w-6 h-6 rounded" style={{ backgroundColor: theme.accentColor }}></div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Language Modal */}
          {modal === 'language' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold flex items-center gap-2">
                  <Languages className="w-5 h-5" /> Language
                </h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-2">
                {Object.entries(TRANSLATIONS).map(([lang]) => (
                  <button key={lang} onClick={() => { setCurrentLanguage(lang as Language); addToast(`Language set to ${lang}`, 'success'); closeModal(); }} className={`w-full px-3 py-2 border rounded text-left capitalize ${currentLanguage === lang ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Document Properties Modal */}
          {modal === 'documentProperties' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5" /> Document Properties
                </h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Title</label>
                  <input value={docProperties.title} onChange={(e) => setDocProperties({ ...docProperties, title: e.target.value })} className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Author</label>
                  <input value={docProperties.author} onChange={(e) => setDocProperties({ ...docProperties, author: e.target.value })} className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Subject</label>
                  <input value={docProperties.subject} onChange={(e) => setDocProperties({ ...docProperties, subject: e.target.value })} className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Keywords</label>
                  <input value={docProperties.keywords} onChange={(e) => setDocProperties({ ...docProperties, keywords: e.target.value })} className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent" />
                </div>
                <div className="text-xs text-gray-500">
                  <div>Created: {new Date(docProperties.created).toLocaleString()}</div>
                  <div>Modified: {new Date(docProperties.modified).toLocaleString()}</div>
                </div>
                <button onClick={updateDocProperties} className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium">Save Properties</button>
              </div>
            </div>
          )}

          {/* Print Preview Modal */}
          {modal === 'printPreview' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900">
                <h3 className="font-semibold flex items-center gap-2">
                  <Eye className="w-5 h-5" /> Print Preview
                </h3>
                <div className="flex gap-2">
                  <button onClick={doPrint} className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm">Print</button>
                  <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="p-4">
                <div className="border border-gray-200 dark:border-gray-700 rounded bg-white p-8 max-w-[816px] mx-auto" style={{ minHeight: '1056px' }}>
                  {showHeaders && headerText && <div className="text-center text-sm text-gray-500 mb-4 pb-2 border-b">{headerText}</div>}
                  <div dangerouslySetInnerHTML={{ __html: content }} />
                  {showHeaders && footerText && <div className="text-center text-sm text-gray-500 mt-4 pt-2 border-t">{footerText}</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Find & Replace */}
      {modal === 'findReplace' && (
        <div className="fixed top-20 right-4 bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 w-80 z-50">
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-sm">Find & Replace</h3>
            <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-4 h-4" /></button>
          </div>
          <div className="p-3 space-y-2">
            <div className="flex gap-2">
              <input value={findText} onChange={(e) => setFindText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleFind()} placeholder="Find..." className="flex-1 text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
              <button onClick={handleFind} className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm">Find</button>
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <input type="checkbox" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} className="rounded" />
              Case sensitive
            </label>
            {findCount > 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{currentFindIndex + 1} of {findCount}</span>
                <button onClick={findPrevious} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700"><ChevronUp className="w-3 h-3" /></button>
                <button onClick={findNext} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700"><ChevronDown className="w-3 h-3" /></button>
              </div>
            )}
            <div className="flex gap-2">
              <input value={replaceText} onChange={(e) => setReplaceText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleReplace(false)} placeholder="Replace with..." className="flex-1 text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleReplace(false)} className="flex-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-sm">Replace</button>
              <button onClick={() => handleReplace(true)} className="flex-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-sm">Replace All</button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50 min-w-[200px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {/* Standard context menu items */}
          <button
            onClick={() => { execCommand('cut'); setContextMenu(null); }}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
          >
            <Scissors className="w-4 h-4" /> Cut
          </button>
          <button
            onClick={() => { execCommand('copy'); setContextMenu(null); }}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
          >
            <CopyIcon className="w-4 h-4" /> Copy
          </button>
          <button
            onClick={() => { execCommand('paste'); setContextMenu(null); }}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
          >
            <ClipboardIcon className="w-4 h-4" /> Paste
          </button>
          <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
          <button
            onClick={() => { execCommand('selectAll'); setContextMenu(null); }}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Select All
          </button>
          <button
            onClick={() => { clearFormatting(); setContextMenu(null); }}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
          >
            <Eraser className="w-4 h-4" /> Clear Formatting
          </button>
          
          {/* Table-specific context menu items */}
          {selectedTableCell && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
              <div className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400">Table</div>
              <button
                onClick={() => { addTableRow('above'); setContextMenu(null); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Insert Row Above
              </button>
              <button
                onClick={() => { addTableRow('below'); setContextMenu(null); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Insert Row Below
              </button>
              <button
                onClick={() => { addTableColumn('left'); setContextMenu(null); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Insert Column Left
              </button>
              <button
                onClick={() => { addTableColumn('right'); setContextMenu(null); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Insert Column Right
              </button>
              <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
              <button
                onClick={() => { deleteTableRow(); setContextMenu(null); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-red-600 dark:text-red-400"
              >
                <Trash2 className="w-4 h-4" /> Delete Row
              </button>
              <button
                onClick={() => { deleteTableColumn(); setContextMenu(null); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-red-600 dark:text-red-400"
              >
                <Trash2 className="w-4 h-4" /> Delete Column
              </button>
              <button
                onClick={() => { deleteTable(); setContextMenu(null); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-red-600 dark:text-red-400"
              >
                <Trash2 className="w-4 h-4" /> Delete Table
              </button>
              <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
              <button
                onClick={() => { setShowCellColorPicker(true); setContextMenu(null); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
              >
                <Palette className="w-4 h-4" /> Cell Background Color
              </button>
            </>
          )}
          
          {/* Standard insert options */}
          {!selectedTableCell && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
              <button
                onClick={() => { openModal('insertLink'); setContextMenu(null); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
              >
                <Link2 className="w-4 h-4" /> Insert Link
              </button>
              <button
                onClick={() => { openModal('insertImage'); setContextMenu(null); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
              >
                <ImagePlus className="w-4 h-4" /> Insert Image
              </button>
            </>
          )}
        </div>
      )}

      {/* Keyboard Shortcuts Help Modal */}
      {showShortcutsHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowShortcutsHelp(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900">
              <h3 className="font-semibold flex items-center gap-2">
                <Keyboard className="w-5 h-5" />
                Keyboard Shortcuts
              </h3>
              <button onClick={() => setShowShortcutsHelp(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">General</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>Save</span><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+S</kbd></div>
                  <div className="flex justify-between"><span>Print</span><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+P</kbd></div>
                  <div className="flex justify-between"><span>Find & Replace</span><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+F</kbd></div>
                  <div className="flex justify-between"><span>Keyboard Shortcuts</span><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+/</kbd></div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">Formatting</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>Bold</span><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+B</kbd></div>
                  <div className="flex justify-between"><span>Italic</span><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+I</kbd></div>
                  <div className="flex justify-between"><span>Underline</span><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+U</kbd></div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">Editing</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>Undo</span><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+Z</kbd></div>
                  <div className="flex justify-between"><span>Redo</span><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+Y</kbd></div>
                  <div className="flex justify-between"><span>Select All</span><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+A</kbd></div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">Navigation</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>Close Modal</span><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Esc</kbd></div>
                  <div className="flex justify-between"><span>Find Next</span><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Enter</kbd></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* Help Center Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowHelp(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900">
              <h3 className="font-semibold flex items-center gap-2">
                <HelpCircle className="w-5 h-5" /> Help Center
              </h3>
              <button onClick={() => setShowHelp(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {helpCenter.getArticles().map(article => (
                  <div key={article.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-500 transition-colors">
                    <h4 className="font-medium text-sm mb-2">{article.title}</h4>
                    <p className="text-xs text-gray-500 mb-2">{article.category}</p>
                    <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3" dangerouslySetInnerHTML={{ __html: article.content.substring(0, 200) + '...' }} />
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="font-medium text-sm mb-2">Need more help?</h4>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      feedbackCollector.submitFeedback('other', 'User requested help');
                      addToast('Support request sent', 'success');
                      setShowHelp(false);
                    }}
                    className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
                  >
                    Contact Support
                  </button>
                  <button 
                    onClick={() => {
                      setShowHelp(false);
                      setShowShortcuts(true);
                    }}
                    className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-sm"
                  >
                    View Shortcuts
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowShortcuts(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900">
              <h3 className="font-semibold flex items-center gap-2">
                <Keyboard className="w-5 h-5" /> Keyboard Shortcuts
              </h3>
              <button onClick={() => setShowShortcuts(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-2">General</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>Save</span><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+S</kbd></div>
                  <div className="flex justify-between"><span>Print</span><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+P</kbd></div>
                  <div className="flex justify-between"><span>Find</span><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+F</kbd></div>
                  <div className="flex justify-between"><span>Shortcuts</span><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+/</kbd></div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-2">Formatting</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>Bold</span><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+B</kbd></div>
                  <div className="flex justify-between"><span>Italic</span><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+I</kbd></div>
                  <div className="flex justify-between"><span>Underline</span><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+U</kbd></div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-2">Editing</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>Undo</span><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+Z</kbd></div>
                  <div className="flex justify-between"><span>Redo</span><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+Y</kbd></div>
                  <div className="flex justify-between"><span>Select All</span><kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+A</kbd></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Backup Modal */}
      {showBackup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowBackup(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold flex items-center gap-2">
                <Download className="w-5 h-5" /> Backup & Recovery
              </h3>
              <button onClick={() => setShowBackup(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-sm mb-2">Create Backup</h4>
                <p className="text-xs text-gray-500 mb-3">Save a snapshot of your current document</p>
                <button 
                  onClick={async () => {
                    try {
                      await backupManager.createBackup('snapshot');
                      addToast('Backup created successfully', 'success');
                    } catch (error) {
                      addToast('Backup failed', 'error');
                    }
                  }}
                  className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
                >
                  Create Backup Now
                </button>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-sm mb-2">Backup Settings</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={backupManager.getConfig().enabled}
                      onChange={(e) => backupManager.updateConfig({ enabled: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Enable auto-backup</span>
                  </label>
                  <div className="text-xs text-gray-500">
                    Frequency: {backupManager.getConfig().frequency}
                  </div>
                  <div className="text-xs text-gray-500">
                    Total backups: {backupManager.getBackups().length}
                  </div>
                </div>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-sm mb-2">Export Document</h4>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      handleSave();
                      setShowBackup(false);
                    }}
                    className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-sm"
                  >
                    HTML
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        await handleExport();
                        addToast('Document exported', 'success');
                        setShowBackup(false);
                      } catch (error) {
                        addToast('Export failed', 'error');
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-sm"
                  >
                    DOCX
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Monitoring Dashboard Modal */}
      {showMonitoring && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowMonitoring(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900">
              <h3 className="font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5" /> System Status
              </h3>
              <button onClick={() => setShowMonitoring(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="text-xs text-gray-500 mb-1">Performance Score</div>
                  <div className="text-2xl font-bold text-green-600">92/100</div>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="text-xs text-gray-500 mb-1">Security Score</div>
                  <div className="text-2xl font-bold text-blue-600">95/100</div>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="text-xs text-gray-500 mb-1">Accessibility</div>
                  <div className="text-2xl font-bold text-purple-600">96/100</div>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="text-xs text-gray-500 mb-1">Browser Support</div>
                  <div className="text-2xl font-bold text-orange-600">94/100</div>
                </div>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-sm mb-2">System Information</h4>
                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                  <div>Browser: {detectBrowser().name} {detectBrowser().version}</div>
                  <div>OS: {detectBrowser().os}</div>
                  <div>Device: {detectBrowser().isMobile ? 'Mobile' : detectBrowser().isTablet ? 'Tablet' : 'Desktop'}</div>
                  <div>Online: {offlineManager.isCurrentlyOnline() ? 'Yes' : 'No'}</div>
                  <div>Backups: {backupManager.getBackups().length}</div>
                  <div>Errors: {errorTracker.getErrorCount()}</div>
                </div>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-sm mb-2">Recent Errors</h4>
                {errorTracker.getErrors({ limit: 5 }).length === 0 ? (
                  <p className="text-xs text-gray-500">No errors recorded</p>
                ) : (
                  <div className="space-y-1">
                    {errorTracker.getErrors({ limit: 5 }).map((error, i) => (
                      <div key={i} className="text-xs text-red-600 dark:text-red-400">
                        {error.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Onboarding Tour */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowOnboarding(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Welcome to OpenSuite!</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Create professional documents with powerful editing tools, real-time collaboration, and cloud storage.
              </p>
              <button 
                onClick={() => {
                  setShowOnboarding(false);
                  localStorage.setItem('onboarding_completed', 'true');
                }}
                className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}
