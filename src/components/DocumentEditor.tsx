import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Heading1, Heading2, Heading3, Undo, Redo,
  Download, Type, Indent, Outdent, Strikethrough, Link, Image,
  Table, Minus, Quote, Subscript, Superscript, Eraser,
  Search, Printer, FileDown, ZoomIn, ZoomOut,
  ChevronDown, X, Upload, Smile, Palette, Columns,
  FileText, Save, MoreHorizontal, Ruler as RulerIcon,
  ImagePlus, Link2, Table2, Minus as MinusIcon, Quote as QuoteIcon,
  FileMinus2, Hash, RemoveFormatting
} from 'lucide-react';

// Extend Window interface for window.find
declare global {
  interface Window {
    find(text: string, caseSensitive?: boolean, backward?: boolean, wrapAround?: boolean): boolean;
  }
}
import { exportDocx } from '../utils/fileHandlers';

interface DocumentEditorProps {
  content: string;
  onChange: (content: string) => void;
  fileName: string;
  readOnly?: boolean;
}

const FONT_FAMILIES = [
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Times New Roman', value: '"Times New Roman", serif' },
  { name: 'Courier New', value: '"Courier New", monospace' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Verdana', value: 'Verdana, sans-serif' },
  { name: 'Tahoma', value: 'Tahoma, sans-serif' },
  { name: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { name: 'Comic Sans MS', value: '"Comic Sans MS", cursive' },
  { name: 'Impact', value: 'Impact, sans-serif' },
  { name: 'Lucida Console', value: '"Lucida Console", monospace' },
  { name: 'Palatino', value: 'Palatino, serif' },
  { name: 'Garamond', value: 'Garamond, serif' },
  { name: 'Bookman', value: 'Bookman, serif' },
  { name: 'Avant Garde', value: '"Avant Garde", sans-serif' },
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
  'transparent', '#ffff00', '#ffff00', '#00ff00', '#00ffff', '#ff00ff',
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
  '„', '“', '”', '‚', '‘', '’', '«', '»',
  '—', '–', '…', '•', '†', '‡', '§', '¶',
];

type ModalType = 'none' | 'findReplace' | 'insertImage' | 'specialChars' | 'lineSpacing' | 'insertTable' | 'insertLink';

export default function DocumentEditor({ content, onChange, fileName, readOnly = false }: DocumentEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [currentFont, setCurrentFont] = useState('Arial, sans-serif');
  const [currentFontSize, setCurrentFontSize] = useState('3');
  const [zoom, setZoom] = useState(100);
  const [showRuler, setShowRuler] = useState(true);
  const [modal, setModal] = useState<ModalType>('none');
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [findCount, setFindCount] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [lineSpacingValue, setLineSpacingValue] = useState(1.5);
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);

  // Stats
  const stats = useMemo(() => {
    if (!editorRef.current) return { words: 0, chars: 0, paragraphs: 0 };
    const text = editorRef.current.innerText || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const paragraphs = editorRef.current.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote').length || 1;
    return { words, chars, paragraphs };
  }, [content, isReady]);

  useEffect(() => {
    if (editorRef.current && !isReady) {
      editorRef.current.innerHTML = content;
      setIsReady(true);
    }
  }, [content, isReady]);

  const execCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

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
    // Trigger download as HTML for now
    const blob = new Blob([`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fileName}</title></head><body>${content}</body></html>`], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.replace(/\.\w+$/, '.html');
    a.click();
    URL.revokeObjectURL(url);
  };

  const insertImage = (src: string) => {
    execCommand('insertHTML', `<img src="${src}" style="max-width: 100%; height: auto; margin: 1em 0; border-radius: 4px;" />`);
    setModal('none');
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
      const displayText = linkText || linkUrl;
      execCommand('insertHTML', `<a href="${linkUrl}" target="_blank" style="color: #2563eb; text-decoration: underline;">${displayText}</a>`);
      setModal('none');
      setLinkUrl('');
      setLinkText('');
    }
  };

  const insertTable = () => {
    let table = '<table style="border-collapse: collapse; width: 100%; margin: 1em 0;"><tbody>';
    for (let r = 0; r < tableRows; r++) {
      table += '<tr>';
      for (let c = 0; c < tableCols; c++) {
        const tag = r === 0 ? 'th' : 'td';
        table += `<${tag} style="border: 1px solid #d1d5db; padding: 8px 12px; min-width: 80px;${r === 0 ? ' background-color: #f3f4f6; font-weight: 600;' : ''}">&nbsp;</${tag}>`;
      }
      table += '</tr>';
    }
    table += '</tbody></table>';
    execCommand('insertHTML', table);
    setModal('none');
  };

  const insertPageBreak = () => {
    execCommand('insertHTML', '<div style="page-break-after: always; border-top: 2px dashed #d1d5db; margin: 2em 0; height: 0;"></div><p>&nbsp;</p>');
  };

  const insertSpecialChar = (char: string) => {
    execCommand('insertHTML', char);
  };

  const applyLineSpacing = () => {
    if (editorRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let node = range.commonAncestorContainer;
        while (node && node !== editorRef.current) {
          if (node instanceof Element && ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'DIV'].includes(node.tagName)) {
            (node as HTMLElement).style.lineHeight = String(lineSpacingValue);
            break;
          }
          node = node.parentNode!;
        }
      }
      onChange(editorRef.current.innerHTML);
    }
    setModal('none');
  };

  const handleFind = () => {
    if (!findText || !editorRef.current) return;
    const content = editorRef.current.innerHTML;
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = content.match(regex);
    setFindCount(matches?.length || 0);
    
    // Use browser's find
    window.find(findText, false, false, true);
  };

  const handleReplace = (all: boolean = false) => {
    if (!findText || !editorRef.current) return;
    
    if (all) {
      const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const newHtml = editorRef.current.innerHTML.replace(regex, replaceText);
      editorRef.current.innerHTML = newHtml;
      onChange(newHtml);
      setFindCount(0);
    } else {
      if (window.find(findText)) {
        const selection = window.getSelection();
        if (selection && selection.toString().toLowerCase() === findText.toLowerCase()) {
          document.execCommand('insertText', false, replaceText);
          if (editorRef.current) onChange(editorRef.current.innerHTML);
        }
      }
    }
  };

  const clearFormatting = () => {
    execCommand('removeFormat');
  };

  const setFontFamily = (font: string) => {
    setCurrentFont(font);
    execCommand('fontName', font);
    setShowFontDropdown(false);
  };

  const setFontSizeValue = (size: string) => {
    setCurrentFontSize(size);
    execCommand('fontSize', size);
  };

  const setTextColor = (color: string) => {
    execCommand('foreColor', color);
    setShowTextColorPicker(false);
  };

  const setHighlightColor = (color: string) => {
    execCommand('hiliteColor', color);
    setShowHighlightPicker(false);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown]')) {
        setShowFontDropdown(false);
        setShowTextColorPicker(false);
        setShowHighlightPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'f':
            e.preventDefault();
            setModal('findReplace');
            break;
          case 'p':
            e.preventDefault();
            handlePrint();
            break;
          case 's':
            e.preventDefault();
            handleSave();
            break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const ToolbarButton = ({ icon: Icon, action, title, active = false }: any) => (
    <button
      onClick={action}
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

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-800">
      {/* Top Menu Bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-3 py-1.5 flex items-center gap-1 text-sm">
        <button onClick={handleSave} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 flex items-center gap-1">
          <FileText className="w-3.5 h-3.5" /> File
        </button>
        <button onClick={() => execCommand('undo')} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300">
          Edit
        </button>
        <button className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300">
          View
        </button>
        <button className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300">
          Insert
        </button>
        <button className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300">
          Format
        </button>
        <button className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300">
          Tools
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
          {/* Undo/Redo */}
          <ToolbarButton icon={Undo} action={() => execCommand('undo')} title="Undo (Ctrl+Z)" />
          <ToolbarButton icon={Redo} action={() => execCommand('redo')} title="Redo (Ctrl+Y)" />
          <ToolbarDivider />

          {/* Font Family */}
          <div className="relative" data-dropdown>
            <button
              onClick={() => setShowFontDropdown(!showFontDropdown)}
              className="flex items-center gap-1 px-2 py-1 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-sm min-w-[140px] justify-between"
            >
              <span className="truncate">{FONT_FAMILIES.find(f => f.value === currentFont)?.name || 'Arial'}</span>
              <ChevronDown className="w-3 h-3 text-gray-500" />
            </button>
            {showFontDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto w-56">
                {FONT_FAMILIES.map(font => (
                  <button
                    key={font.value}
                    onClick={() => setFontFamily(font.value)}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
                    style={{ fontFamily: font.value }}
                  >
                    {font.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Font Size */}
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

          {/* Headings */}
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

          {/* Text Formatting */}
          <ToolbarButton icon={Bold} action={() => execCommand('bold')} title="Bold (Ctrl+B)" />
          <ToolbarButton icon={Italic} action={() => execCommand('italic')} title="Italic (Ctrl+I)" />
          <ToolbarButton icon={Underline} action={() => execCommand('underline')} title="Underline (Ctrl+U)" />
          <ToolbarButton icon={Strikethrough} action={() => execCommand('strikeThrough')} title="Strikethrough" />
          <ToolbarButton icon={Subscript} action={() => execCommand('subscript')} title="Subscript" />
          <ToolbarButton icon={Superscript} action={() => execCommand('superscript')} title="Superscript" />

          <ToolbarDivider />

          {/* Text Color */}
          <div className="relative" data-dropdown>
            <button
              onClick={() => setShowTextColorPicker(!showTextColorPicker)}
              title="Text Color"
              className="flex flex-col items-center p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <span className="text-sm font-bold text-red-500">A</span>
              <div className="w-4 h-1 bg-red-500 rounded-sm"></div>
            </button>
            {showTextColorPicker && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 p-2 w-56">
                <div className="grid grid-cols-8 gap-0.5">
                  {TEXT_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setTextColor(color)}
                      className="w-6 h-6 rounded border border-gray-200 dark:border-gray-700 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Highlight Color */}
          <div className="relative" data-dropdown>
            <button
              onClick={() => setShowHighlightPicker(!showHighlightPicker)}
              title="Highlight Color"
              className="flex flex-col items-center p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <span className="text-sm font-bold" style={{ backgroundColor: '#ffff00', padding: '0 2px' }}>ab</span>
              <div className="w-4 h-1 bg-yellow-400 rounded-sm"></div>
            </button>
            {showHighlightPicker && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 p-2 w-56">
                <div className="grid grid-cols-8 gap-0.5">
                  {HIGHLIGHT_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setHighlightColor(color)}
                      className="w-6 h-6 rounded border border-gray-200 dark:border-gray-700 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color === 'transparent' ? '#fff' : color, backgroundImage: color === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%)' : undefined, backgroundSize: '4px 4px', backgroundPosition: '0 0, 2px 2px' }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <ToolbarButton icon={Eraser} action={clearFormatting} title="Clear Formatting" />

          <ToolbarDivider />

          {/* Alignment */}
          <ToolbarButton icon={AlignLeft} action={() => execCommand('justifyLeft')} title="Align Left" />
          <ToolbarButton icon={AlignCenter} action={() => execCommand('justifyCenter')} title="Align Center" />
          <ToolbarButton icon={AlignRight} action={() => execCommand('justifyRight')} title="Align Right" />
          <ToolbarButton icon={AlignJustify} action={() => execCommand('justifyFull')} title="Justify" />

          <ToolbarDivider />

          {/* Lists & Indent */}
          <ToolbarButton icon={List} action={() => execCommand('insertUnorderedList')} title="Bullet List" />
          <ToolbarButton icon={ListOrdered} action={() => execCommand('insertOrderedList')} title="Numbered List" />
          <ToolbarButton icon={Outdent} action={() => execCommand('outdent')} title="Decrease Indent" />
          <ToolbarButton icon={Indent} action={() => execCommand('indent')} title="Increase Indent" />

          <ToolbarDivider />

          {/* Insert */}
          <ToolbarButton icon={Link2} action={() => setModal('insertLink')} title="Insert Link" />
          <ToolbarButton icon={ImagePlus} action={() => setModal('insertImage')} title="Insert Image" />
          <ToolbarButton icon={Table2} action={() => setModal('insertTable')} title="Insert Table" />
          <ToolbarButton icon={MinusIcon} action={() => execCommand('insertHTML', '<hr style="border: none; border-top: 2px solid #e5e7eb; margin: 1.5em 0;" />')} title="Horizontal Line" />
          <ToolbarButton icon={Hash} action={() => setModal('specialChars')} title="Special Characters" />
          <ToolbarButton icon={FileMinus2} action={insertPageBreak} title="Page Break" />

          <ToolbarDivider />

          {/* Line Spacing */}
          <button
            onClick={() => setModal('lineSpacing')}
            title="Line Spacing"
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm"
          >
            <Columns className="w-4 h-4 rotate-90" />
          </button>

          {/* Find & Replace */}
          <ToolbarButton icon={Search} action={() => setModal('findReplace')} title="Find & Replace (Ctrl+F)" />

          <ToolbarDivider />

          {/* View Options */}
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
          className="mx-auto bg-white dark:bg-gray-900 shadow-lg min-h-[1056px] relative"
          style={{
            width: `${8.5 * 96 * (zoom / 100)}px`,
            maxWidth: '100%',
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
          }}
        >
          {/* Page margin indicators */}
          <div className="absolute inset-0 pointer-events-none border-l border-r border-transparent" style={{ margin: '0 96px' }}></div>
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
        <span className="hidden md:inline">English (US)</span>
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
      {modal === 'findReplace' && (
        <div className="fixed top-20 right-4 bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 w-80 z-50">
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-sm">Find & Replace</h3>
            <button onClick={() => setModal('none')} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
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
              />
              <button onClick={handleFind} className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm">
                Find
              </button>
            </div>
            {findCount > 0 && <p className="text-xs text-gray-500">{findCount} match(es) found</p>}
            <div className="flex gap-2">
              <input
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
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

      {modal === 'insertImage' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold">Insert Image</h3>
              <button onClick={() => setModal('none')} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
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
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => imageUrl && insertImage(imageUrl)}
                    className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
                  >
                    Insert
                  </button>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700"></div></div>
                <div className="relative flex justify-center"><span className="bg-white dark:bg-gray-900 px-2 text-xs text-gray-500">OR</span></div>
              </div>
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
        </div>
      )}

      {modal === 'insertLink' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold">Insert Link</h3>
              <button onClick={() => setModal('none')} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
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
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">URL</label>
                <input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        </div>
      )}

      {modal === 'insertTable' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold">Insert Table</h3>
              <button onClick={() => setModal('none')} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
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
                    onChange={(e) => setTableRows(parseInt(e.target.value) || 1)}
                    min="1"
                    max="20"
                    className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Columns</label>
                  <input
                    type="number"
                    value={tableCols}
                    onChange={(e) => setTableCols(parseInt(e.target.value) || 1)}
                    min="1"
                    max="10"
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
        </div>
      )}

      {modal === 'specialChars' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold">Special Characters</h3>
              <button onClick={() => setModal('none')} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-10 gap-1">
                {SPECIAL_CHARS.map((char, i) => (
                  <button
                    key={i}
                    onClick={() => insertSpecialChar(char)}
                    className="w-9 h-9 flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                  >
                    {char}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {modal === 'lineSpacing' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold">Line Spacing</h3>
              <button onClick={() => setModal('none')} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {[1, 1.15, 1.5, 2, 2.5, 3].map(val => (
                <button
                  key={val}
                  onClick={() => { setLineSpacingValue(val); }}
                  className={`w-full px-3 py-2 rounded text-sm text-left ${
                    lineSpacingValue === val
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {val}
                </button>
              ))}
              <button
                onClick={applyLineSpacing}
                className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium mt-2"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
