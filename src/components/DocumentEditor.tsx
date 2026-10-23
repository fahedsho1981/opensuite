import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Undo, Redo,
  Download, Indent, Outdent, Strikethrough,
  Subscript, Superscript, Eraser,
  Search, Printer, FileDown, ZoomIn, ZoomOut,
  ChevronDown, X, Upload, Columns,
  FileText, Save, Ruler as RulerIcon,
  ImagePlus, Link2, Table2, Minus as MinusIcon,
  FileMinus2, Hash, ChevronUp, ChevronDown as ChevronDownIcon
} from 'lucide-react';

// Extend Window interface for window.find
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

interface DocumentEditorProps {
  content: string;
  onChange: (content: string) => void;
  fileName: string;
  readOnly?: boolean;
}

// Constants (FIX #71: No magic numbers)
const PAGE_WIDTH_A4 = 816; // 8.5 inches * 96px
const PAGE_HEIGHT_A4 = 1056; // 11 inches * 96px
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

type ModalType = 'none' | 'findReplace' | 'insertImage' | 'specialChars' | 'lineSpacing' | 'insertTable' | 'insertLink';
type ActiveDropdown = 'none' | 'font' | 'textColor' | 'highlightColor';

export default function DocumentEditor({ content, onChange, fileName, readOnly = false }: DocumentEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const [zoom, setZoom] = useState(100);
  const [showRuler, setShowRuler] = useState(true);
  const [modal, setModal] = useState<ModalType>('none');
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
  
  // FIX #1 & #2: Track current font and size
  const [currentFont, setCurrentFont] = useState('Arial');
  const [currentFontSize, setCurrentFontSize] = useState('3');
  
  // FIX #10: Track formatting state
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [currentTextColor, setCurrentTextColor] = useState('#000000');
  const [currentHighlightColor, setCurrentHighlightColor] = useState('transparent');
  
  // FIX #33: Track recent colors
  const [recentTextColors, setRecentTextColors] = useState<string[]>([]);
  const [recentHighlightColors, setRecentHighlightColors] = useState<string[]>([]);

  // FIX #4: Optimized stats calculation using string parsing instead of DOM
  const stats = useMemo(() => {
    if (!content) return { words: 0, chars: 0, paragraphs: 0 };
    // Strip HTML tags using regex (much faster than DOM)
    const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = text.length;
    // Count block-level elements using regex
    const blockMatch = content.match(/<(p|h[1-6]|li|blockquote|div)[\s>]/gi);
    const paragraphs = blockMatch ? blockMatch.length : 1;
    return { words, chars, paragraphs };
  }, [content]);

  // FIX #1: Always sync content when prop changes (for file switching)
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

  // FIX #10: Update formatting state on selection change
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

  // Save selection before opening modals
  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editorRef.current?.contains(range.commonAncestorContainer)) {
        savedSelectionRef.current = range.cloneRange();
      }
    }
  };

  // Restore selection before inserting content
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
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleExport = async () => {
    if (editorRef.current) {
      await exportDocx(editorRef.current.innerHTML, fileName);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSave = () => {
    if (!editorRef.current) return;
    const currentContent = editorRef.current.innerHTML;
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
  };

  const openModal = (type: ModalType) => {
    saveSelection();
    setModal(type);
  };

  const closeModal = () => {
    setModal('none');
  };

  const insertImage = (src: string) => {
    restoreSelection();
    // FIX #28: Preserve aspect ratio
    execCommand('insertHTML', `<img src="${src}" style="max-width: 100%; height: auto; margin: 1em 0; border-radius: 4px; display: block;" />`);
    closeModal();
    setImageUrl('');
  };

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
      restoreSelection();
      const displayText = linkText || linkUrl;
      const safeUrl = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
      // FIX #30: Remove &nbsp;
      execCommand('insertHTML', `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">${displayText}</a>`);
      closeModal();
      setLinkUrl('');
      setLinkText('');
    }
  };

  const insertTable = () => {
    restoreSelection();
    let table = '<table style="border-collapse: collapse; width: 100%; margin: 1em 0;"><tbody>';
    for (let r = 0; r < tableRows; r++) {
      table += '<tr>';
      for (let c = 0; c < tableCols; c++) {
        const tag = r === 0 ? 'th' : 'td';
        // FIX #7: Remove contenteditable from table cells
        table += `<${tag} style="border: 1px solid #d1d5db; padding: 8px 12px; min-width: 80px;${r === 0 ? ' background-color: #f3f4f6; font-weight: 600;' : ''}">&nbsp;</${tag}>`;
      }
      table += '</tr>';
    }
    table += '</tbody></table><p><br></p>';
    execCommand('insertHTML', table);
    closeModal();
  };

  const insertPageBreak = () => {
    execCommand('insertHTML', '<div style="page-break-after: always; border-top: 2px dashed #9ca3af; margin: 2em 0; padding-top: 4px;"><span style="font-size: 10px; color: #9ca3af;">— Page Break —</span></div><p><br></p>');
  };

  const insertSpecialChar = (char: string) => {
    restoreSelection();
    execCommand('insertText', char);
  };

  // FIX #11: Apply line spacing only to current paragraph or selection
  const applyLineSpacing = () => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // Apply to current paragraph only
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
    closeModal(); // FIX #35: Auto-close modal
  };

  // FIX #5 & #18 & #19: Enhanced find with case sensitivity and navigation
  const handleFind = () => {
    if (!findText || !editorRef.current) return;
    
    const textContent = editorRef.current.textContent || '';
    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    
    // Find all matches
    const matches: number[] = [];
    let match;
    while ((match = regex.exec(textContent)) !== null) {
      matches.push(match.index);
    }
    
    setFindMatches(matches);
    setFindCount(matches.length);
    setCurrentFindIndex(0);
    
    // Use browser's native find for highlighting
    if (window.find) {
      try {
        window.find(findText, caseSensitive, false, true, false, false, false);
      } catch (e) {
        // Fallback for browsers that don't support all parameters
        window.find(findText, caseSensitive);
      }
    }
  };

  // FIX #18: Find next/previous
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
      const walker = document.createTreeWalker(
        editorRef.current,
        NodeFilter.SHOW_TEXT,
        null
      );
      
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

  // FIX #1 & #22: Set font family and track it
  const setFontFamily = (font: typeof FONT_FAMILIES[0]) => {
    execCommand('fontName', font.command);
    setCurrentFont(font.name);
    setActiveDropdown('none');
  };

  // FIX #2: Set font size and track it
  const setFontSizeValue = (size: string) => {
    execCommand('fontSize', size);
    setCurrentFontSize(size);
  };

  // FIX #22 & #33: Set text color and track it
  const setTextColor = (color: string) => {
    restoreSelection();
    execCommand('foreColor', color);
    setCurrentTextColor(color);
    // Add to recent colors
    setRecentTextColors(prev => {
      const filtered = prev.filter(c => c !== color);
      return [color, ...filtered].slice(0, 8);
    });
    setActiveDropdown('none');
  };

  // FIX #23 & #33: Set highlight color and track it
  const setHighlightColor = (color: string) => {
    restoreSelection();
    if (color === 'transparent') {
      execCommand('hiliteColor', 'transparent');
      execCommand('backColor', 'transparent');
    } else {
      execCommand('hiliteColor', color);
    }
    setCurrentHighlightColor(color);
    // Add to recent colors
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (modal !== 'none') {
          closeModal();
        }
        setActiveDropdown('none');
      }
      
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'f':
            e.preventDefault();
            openModal('findReplace');
            break;
          case 'p':
            e.preventDefault();
            handlePrint();
            break;
          case 's':
            e.preventDefault();
            handleSave();
            break;
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
  }, [modal, execCommand]);

  // FIX #6: More selective paste handler
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
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Remove script and style tags
        tempDiv.querySelectorAll('script, style, link, meta').forEach(el => el.remove());
        
        // FIX #6: Only remove dangerous attributes, keep safe styles
        tempDiv.querySelectorAll('*').forEach(el => {
          Array.from(el.attributes).forEach(attr => {
            if (attr.name.startsWith('on')) {
              el.removeAttribute(attr.name);
            }
          });
        });
        
        html = tempDiv.innerHTML;
        document.execCommand('insertHTML', false, html);
      } else if (text) {
        const lines = text.split('\n');
        const htmlContent = lines.map(line => 
          line.trim() ? `<p>${line}</p>` : '<p><br></p>'
        ).join('');
        document.execCommand('insertHTML', false, htmlContent);
      }
      
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
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

  const ToolbarButton = ({ icon: Icon, action, title, active = false }: any) => (
    <button
      onClick={() => { saveSelection(); action(); }}
      disabled={readOnly}
      title={title}
      className={`p-1.5 rounded transition-colors disabled:opacity-50 ${
        active
          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
      }`}
    >
      <Icon className="w-4 h-4" />
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
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-800">
      {/* Top Menu Bar - FIX #3: Make buttons functional */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-3 py-1.5 flex items-center gap-1 text-sm">
        <button onClick={handleSave} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 flex items-center gap-1">
          <FileText className="w-3.5 h-3.5" /> File
        </button>
        <button onClick={() => execCommand('undo')} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300">
          Undo
        </button>
        <button onClick={() => execCommand('redo')} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300">
          Redo
        </button>
        <button onClick={() => setShowRuler(!showRuler)} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300">
          View
        </button>
        <button onClick={() => openModal('insertImage')} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300">
          Insert
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

          {/* FIX #1: Font Family with current font display */}
          <div className="relative" data-dropdown="font">
            <button
              onClick={() => toggleDropdown('font')}
              className="flex items-center gap-1 px-2 py-1 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-sm min-w-[140px] justify-between"
            >
              <span className="truncate">{currentFont}</span>
              <ChevronDown className="w-3 h-3 text-gray-500" />
            </button>
            {activeDropdown === 'font' && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto w-56">
                {FONT_FAMILIES.map(font => (
                  <button
                    key={font.command}
                    onClick={() => setFontFamily(font)}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
                    style={{ fontFamily: font.value }}
                  >
                    {font.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* FIX #2: Font Size controlled component */}
          <select
            value={currentFontSize}
            onChange={(e) => setFontSizeValue(e.target.value)}
            className="px-2 py-1 border border-gray-200 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-900 ml-1"
          >
            <option value="1">8</option>
            <option value="2">10</option>
            <option value="3">12</option>
            <option value="4">14</option>
            <option value="5">18</option>
            <option value="6">24</option>
            <option value="7">36</option>
          </select>

          <ToolbarDivider />

          <select
            onChange={(e) => execCommand('formatBlock', e.target.value)}
            defaultValue="p"
            className="px-2 py-1 border border-gray-200 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-900"
          >
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

          {/* FIX #10: Text formatting with active state */}
          <ToolbarButton icon={Bold} action={() => execCommand('bold')} title="Bold (Ctrl+B)" active={isBold} />
          <ToolbarButton icon={Italic} action={() => execCommand('italic')} title="Italic (Ctrl+I)" active={isItalic} />
          <ToolbarButton icon={Underline} action={() => execCommand('underline')} title="Underline (Ctrl+U)" active={isUnderline} />
          <ToolbarButton icon={Strikethrough} action={() => execCommand('strikeThrough')} title="Strikethrough" />
          <ToolbarButton icon={Subscript} action={() => execCommand('subscript')} title="Subscript" />
          <ToolbarButton icon={Superscript} action={() => execCommand('superscript')} title="Superscript" />

          <ToolbarDivider />

          {/* FIX #22 & #33: Text color with current color display and recent colors */}
          <div className="relative" data-dropdown="textColor">
            <button
              onClick={() => toggleDropdown('textColor')}
              title="Text Color"
              className="flex flex-col items-center p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            >
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
                        <button
                          key={`recent-${i}`}
                          onClick={() => setTextColor(color)}
                          className="w-6 h-6 rounded border border-gray-200 dark:border-gray-700 hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="text-xs text-gray-500 mb-1">All Colors</div>
                  </>
                )}
                <div className="grid grid-cols-8 gap-0.5">
                  {TEXT_COLORS.map((color, i) => (
                    <button
                      key={`${color}-${i}`}
                      onClick={() => setTextColor(color)}
                      className="w-6 h-6 rounded border border-gray-200 dark:border-gray-700 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* FIX #23 & #33: Highlight color with current color display and recent colors */}
          <div className="relative" data-dropdown="highlightColor">
            <button
              onClick={() => toggleDropdown('highlightColor')}
              title="Highlight Color"
              className="flex flex-col items-center p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            >
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
                        <button
                          key={`recent-${i}`}
                          onClick={() => setHighlightColor(color)}
                          className="w-6 h-6 rounded border border-gray-200 dark:border-gray-700 hover:scale-110 transition-transform"
                          style={{ backgroundColor: color === 'transparent' ? '#fff' : color }}
                        />
                      ))}
                    </div>
                    <div className="text-xs text-gray-500 mb-1">All Colors</div>
                  </>
                )}
                <div className="grid grid-cols-8 gap-0.5">
                  {HIGHLIGHT_COLORS.map((color, i) => (
                    <button
                      key={`${color}-${i}`}
                      onClick={() => setHighlightColor(color)}
                      className="w-6 h-6 rounded border border-gray-200 dark:border-gray-700 hover:scale-110 transition-transform"
                      style={{
                        backgroundColor: color === 'transparent' ? '#fff' : color,
                        backgroundImage: color === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%)' : undefined,
                        backgroundSize: '4px 4px',
                        backgroundPosition: '0 0, 2px 2px'
                      }}
                      title={color === 'transparent' ? 'No highlight' : color}
                    />
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
          <ToolbarButton icon={MinusIcon} action={() => execCommand('insertHTML', '<hr style="border: none; border-top: 2px solid #e5e7eb; margin: 1.5em 0;" />')} title="Horizontal Line" />
          <ToolbarButton icon={Hash} action={() => openModal('specialChars')} title="Special Characters" />
          <ToolbarButton icon={FileMinus2} action={insertPageBreak} title="Page Break" />

          <ToolbarDivider />

          <button
            onClick={() => openModal('lineSpacing')}
            title="Line Spacing"
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm"
          >
            <Columns className="w-4 h-4 rotate-90" />
          </button>

          <ToolbarButton icon={Search} action={() => openModal('findReplace')} title="Find & Replace (Ctrl+F)" />

          <ToolbarDivider />

          <ToolbarButton
            icon={RulerIcon}
            action={() => setShowRuler(!showRuler)}
            title="Toggle Ruler"
            active={showRuler}
          />
        </div>
      </div>

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
      <div className="flex-1 overflow-y-auto bg-gray-200 dark:bg-gray-800 p-4 md:p-8">
        <div
          className="mx-auto bg-white dark:bg-gray-900 shadow-lg relative"
          style={{
            width: `${PAGE_WIDTH_A4}px`,
            maxWidth: '100%',
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
          }}
        >
          <div
            ref={editorRef}
            contentEditable={!readOnly}
            onInput={handleInput}
            className="prose prose-lg dark:prose-invert max-w-none p-16 md:p-24 min-h-[1056px] focus:outline-none"
            suppressContentEditableWarning
            style={{ lineHeight: '1.8' }}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-1.5 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
        <span>{stats.words} words</span>
        <span>{stats.chars} characters</span>
        <span>{stats.paragraphs} paragraphs</span>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(Math.max(50, zoom - 10))} className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="min-w-[40px] text-center">{zoom}%</span>
          <button onClick={() => setZoom(Math.min(200, zoom + 10))} className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Modals */}
      {modal !== 'none' && modal !== 'findReplace' && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          {modal === 'insertImage' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold">Insert Image</h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">From URL</label>
                  <div className="flex gap-2">
                    <input
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && imageUrl && insertImage(imageUrl)}
                      placeholder="https://example.com/image.jpg"
                      className="flex-1 text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      onClick={() => imageUrl && insertImage(imageUrl)}
                      className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
                    >
                      Insert
                    </button>
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
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Display Text</label>
                  <input
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="Link text (optional)"
                    className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">URL</label>
                  <input
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && insertLink()}
                    placeholder="https://example.com"
                    className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <button
                  onClick={insertLink}
                  className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium"
                >
                  Insert Link
                </button>
              </div>
            </div>
          )}

          {modal === 'insertTable' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-sm">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold">Insert Table</h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Rows</label>
                    <input
                      type="number"
                      value={tableRows}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value >= MIN_TABLE_ROWS && value <= MAX_TABLE_ROWS) {
                          setTableRows(value);
                        }
                      }}
                      min={MIN_TABLE_ROWS}
                      max={MAX_TABLE_ROWS}
                      className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Columns</label>
                    <input
                      type="number"
                      value={tableCols}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value >= MIN_TABLE_COLS && value <= MAX_TABLE_COLS) {
                          setTableCols(value);
                        }
                      }}
                      min={MIN_TABLE_COLS}
                      max={MAX_TABLE_COLS}
                      className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <button
                  onClick={insertTable}
                  className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium"
                >
                  Insert Table
                </button>
              </div>
            </div>
          )}

          {modal === 'specialChars' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-lg">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold">Special Characters</h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-8 sm:grid-cols-10 gap-1">
                  {SPECIAL_CHARS.map((char, i) => (
                    <button
                      key={i}
                      onClick={() => insertSpecialChar(char)}
                      className="w-9 h-9 flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                      title={char}
                    >
                      {char}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {modal === 'lineSpacing' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-sm">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold">Line Spacing</h3>
                <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-2">
                {[1, 1.15, 1.5, 2, 2.5, 3].map(val => (
                  <button
                    key={val}
                    onClick={() => {
                      setLineSpacingValue(val);
                      if (editorRef.current) {
                        const blocks = editorRef.current.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, div');
                        blocks.forEach(el => {
                          (el as HTMLElement).style.lineHeight = String(val);
                        });
                        onChange(editorRef.current.innerHTML);
                      }
                    }}
                    className={`w-full px-3 py-2 rounded text-sm text-left transition-colors ${
                      lineSpacingValue === val
                        ? 'bg-blue-500 text-white'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FIX #17 & #18: Enhanced Find & Replace with navigation */}
      {modal === 'findReplace' && (
        <div className="fixed top-20 right-4 bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 w-80 z-50">
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-sm">Find & Replace</h3>
            <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-3 space-y-2">
            <div className="flex gap-2">
              <input
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFind()}
                placeholder="Find..."
                className="flex-1 text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button onClick={handleFind} className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm">
                Find
              </button>
            </div>
            {/* FIX #19: Case sensitive option */}
            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
                className="rounded"
              />
              Case sensitive
            </label>
            {findCount > 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{currentFindIndex + 1} of {findCount}</span>
                <button onClick={findPrevious} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button onClick={findNext} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                  <ChevronDownIcon className="w-3 h-3" />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleReplace(false)}
                placeholder="Replace with..."
                className="flex-1 text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleReplace(false)} className="flex-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-sm">
                Replace
              </button>
              <button onClick={() => handleReplace(true)} className="flex-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-sm">
                Replace All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
