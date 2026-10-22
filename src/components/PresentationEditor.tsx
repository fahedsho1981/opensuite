import React, { useState, useRef, useEffect } from 'react';
import {
  Plus, Trash2, Download, ChevronLeft, ChevronRight, Play, Copy,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Type, Image, Square, Circle, Triangle, Minus,
  Undo, Redo, ZoomIn, ZoomOut, Grid3x3,
  Palette, Layout, FileText, Save, Eye, Edit3,
  Move, RotateCw, Layers, MoreVertical, X,
  Home, PenTool, Film, Sparkles, MessageSquare, Settings
} from 'lucide-react';
import type { Slide } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface PresentationEditorProps {
  content: Slide[];
  onChange: (content: Slide[]) => void;
  fileName: string;
  readOnly?: boolean;
}

const BACKGROUNDS = [
  '#ffffff', '#f5f5f5', '#1a1a2e', '#16213e', '#0f3460',
  '#533483', '#e94560', '#2d3436', '#6c5ce7', '#00b894',
  '#fdcb6e', '#e17055', '#0984e3', '#636e72', '#000000',
];

const TEXT_COLORS = [
  '#000000', '#ffffff', '#333333', '#666666', '#999999',
  '#e94560', '#0984e3', '#00b894', '#fdcb6e', '#6c5ce7',
  '#e17055', '#00cec9', '#fab1a0', '#81ecec', '#a29bfe',
];

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72];

const LAYOUTS = [
  { name: 'Title Slide', icon: '📊', title: true, subtitle: true, content: false },
  { name: 'Title + Content', icon: '📝', title: true, subtitle: false, content: true },
  { name: 'Section Header', icon: '📌', title: true, subtitle: true, content: false },
  { name: 'Two Content', icon: '📋', title: true, subtitle: false, content: true, twoColumn: true },
  { name: 'Comparison', icon: '⚖️', title: true, subtitle: false, content: true, twoColumn: true },
  { name: 'Blank', icon: '⬜', title: false, subtitle: false, content: true },
];

type TabType = 'home' | 'insert' | 'design' | 'transitions' | 'view';
type ViewMode = 'edit' | 'present' | 'notes';

interface SlideElement {
  id: string;
  type: 'text' | 'shape' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  style?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    align?: 'left' | 'center' | 'right';
    backgroundColor?: string;
    shapeType?: 'rectangle' | 'circle' | 'triangle' | 'line';
  };
}

export default function PresentationEditor({ content, onChange, fileName, readOnly = false }: PresentationEditorProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(false);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [elements, setElements] = useState<Record<string, SlideElement[]>>({});
  const [history, setHistory] = useState<Slide[][]>([content]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const slide = content[currentSlide];

  // History management
  const pushHistory = (newContent: Slide[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newContent);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      onChange(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      onChange(history[historyIndex + 1]);
    }
  };

  const addSlide = (layoutIndex = 1) => {
    const layout = LAYOUTS[layoutIndex];
    const newSlide: Slide = {
      id: uuidv4(),
      title: layout.title ? `Slide ${content.length + 1}` : '',
      content: layout.content ? 'Click to add content' : '',
      background: '#ffffff',
      notes: '',
    };
    const newContent = [...content, newSlide];
    onChange(newContent);
    pushHistory(newContent);
    setCurrentSlide(newContent.length - 1);
  };

  const deleteSlide = (index: number) => {
    if (content.length <= 1) return;
    const newContent = content.filter((_, i) => i !== index);
    onChange(newContent);
    pushHistory(newContent);
    setCurrentSlide(Math.min(currentSlide, newContent.length - 1));
  };

  const updateSlide = (index: number, updates: Partial<Slide>) => {
    const newContent = content.map((s, i) => i === index ? { ...s, ...updates } : s);
    onChange(newContent);
    pushHistory(newContent);
  };

  const duplicateSlide = (index: number) => {
    const slide = { ...content[index], id: uuidv4() };
    const newContent = [...content.slice(0, index + 1), slide, ...content.slice(index + 1)];
    onChange(newContent);
    pushHistory(newContent);
    setCurrentSlide(index + 1);
  };

  const moveSlide = (from: number, to: number) => {
    if (to < 0 || to >= content.length) return;
    const newContent = [...content];
    const [moved] = newContent.splice(from, 1);
    newContent.splice(to, 0, moved);
    onChange(newContent);
    pushHistory(newContent);
    setCurrentSlide(to);
  };

  const addElement = (type: 'text' | 'shape', shapeType?: string) => {
    const newElement: SlideElement = {
      id: uuidv4(),
      type,
      x: 50,
      y: 50,
      width: type === 'text' ? 300 : 100,
      height: type === 'text' ? 60 : 100,
      content: type === 'text' ? 'Text' : '',
      style: {
        fontSize: 24,
        fontFamily: 'Arial',
        color: '#000000',
        align: 'center',
        shapeType: shapeType as any,
      },
    };
    const slideElements = elements[slide.id] || [];
    setElements({ ...elements, [slide.id]: [...slideElements, newElement] });
    setSelectedElement(newElement.id);
  };

  const updateElement = (elementId: string, updates: Partial<SlideElement>) => {
    const slideElements = elements[slide.id] || [];
    const newElements = slideElements.map(el => el.id === elementId ? { ...el, ...updates } : el);
    setElements({ ...elements, [slide.id]: newElements });
  };

  const deleteElement = (elementId: string) => {
    const slideElements = elements[slide.id] || [];
    const newElements = slideElements.filter(el => el.id !== elementId);
    setElements({ ...elements, [slide.id]: newElements });
    setSelectedElement(null);
  };

  const exportPresentation = () => {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${fileName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; }
    .slide { width: 100vw; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 60px; page-break-after: always; position: relative; }
    .slide h1 { font-size: 3em; margin-bottom: 20px; text-align: center; }
    .slide h2 { font-size: 2em; margin-bottom: 15px; text-align: center; opacity: 0.8; }
    .slide .content { font-size: 1.5em; text-align: center; max-width: 80%; white-space: pre-wrap; }
    .slide-number { position: absolute; bottom: 20px; right: 30px; font-size: 0.8em; opacity: 0.5; }
  </style>
</head>
<body>
  ${content.map((s, i) => `
    <div class="slide" style="background: ${s.background}; color: ${isLightColor(s.background) ? '#333' : '#fff'}">
      ${s.title ? `<h1>${s.title}</h1>` : ''}
      ${s.content ? `<div class="content">${s.content}</div>` : ''}
      <div class="slide-number">${i + 1} / ${content.length}</div>
    </div>
  `).join('')}
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.replace(/\.\\w+$/, '.html');
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLightColor = (color: string) => {
    return color === '#ffffff' || color === '#f5f5f5' || color === '#fdcb6e';
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== 'edit') return;
      
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            undo();
            break;
          case 'y':
            e.preventDefault();
            redo();
            break;
          case 's':
            e.preventDefault();
            exportPresentation();
            break;
        }
      }
      
      if (e.key === 'Delete' && selectedElement) {
        deleteElement(selectedElement);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, selectedElement, historyIndex]);

  if (!slide) return null;

  // Presentation mode
  if (viewMode === 'present') {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div
          className="w-full h-full flex flex-col justify-center items-center p-16 relative"
          style={{ background: slide.background, color: isLightColor(slide.background) ? '#333' : '#fff' }}
        >
          <h1 className="text-5xl font-bold mb-8 text-center">{slide.title}</h1>
          <p className="text-2xl text-center max-w-3xl whitespace-pre-wrap">{slide.content}</p>
          
          {/* Elements */}
          {(elements[slide.id] || []).map(el => (
            <div
              key={el.id}
              className="absolute"
              style={{
                left: `${el.x}px`,
                top: `${el.y}px`,
                width: `${el.width}px`,
                height: `${el.height}px`,
              }}
            >
              {el.type === 'text' && (
                <div
                  style={{
                    fontSize: `${el.style?.fontSize}px`,
                    fontFamily: el.style?.fontFamily,
                    color: el.style?.color,
                    textAlign: el.style?.align,
                    fontWeight: el.style?.bold ? 'bold' : 'normal',
                    fontStyle: el.style?.italic ? 'italic' : 'normal',
                    textDecoration: el.style?.underline ? 'underline' : 'none',
                  }}
                >
                  {el.content}
                </div>
              )}
            </div>
          ))}

          <button
            onClick={() => setViewMode('edit')}
            className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/30 text-white"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
            <button
              onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 text-white"
              disabled={currentSlide === 0}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <span className="text-white/70">{currentSlide + 1} / {content.length}</span>
            <button
              onClick={() => setCurrentSlide(Math.min(content.length - 1, currentSlide + 1))}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 text-white"
              disabled={currentSlide === content.length - 1}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-800">
      {/* Menu Bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-2 py-1 flex items-center gap-1 text-sm">
        <button className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 flex items-center gap-1">
          <FileText className="w-3.5 h-3.5" /> File
        </button>
        {(['home', 'insert', 'design', 'transitions', 'view'] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-2 py-1 rounded capitalize ${
              activeTab === tab 
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={() => setViewMode('present')} title="Present (F5)" className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
          <Play className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
        <button onClick={exportPresentation} title="Export" className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
          <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Ribbon Toolbar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-2 py-1.5">
        {activeTab === 'home' && (
          <div className="flex items-center gap-0.5 flex-wrap">
            {/* Clipboard */}
            <div className="flex flex-col items-center px-1">
              <div className="flex gap-0.5">
                <button onClick={() => duplicateSlide(currentSlide)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="Duplicate">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5">Clipboard</span>
            </div>
            
            <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1" />

            {/* Slides */}
            <div className="flex flex-col items-center px-1">
              <div className="flex gap-0.5">
                <button onClick={() => addSlide()} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="New Slide">
                  <Plus className="w-4 h-4" />
                </button>
                <button onClick={() => setShowLayoutPicker(true)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="Layout">
                  <Layout className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => deleteSlide(currentSlide)} 
                  disabled={content.length <= 1}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50" 
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5">Slides</span>
            </div>

            <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1" />

            {/* Font */}
            <div className="flex flex-col items-center px-1">
              <div className="flex gap-1 items-center">
                <select className="text-xs border border-gray-200 dark:border-gray-700 rounded px-1 py-1 bg-white dark:bg-gray-900 w-24">
                  {['Arial', 'Calibri', 'Times New Roman', 'Georgia', 'Verdana'].map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <select className="text-xs border border-gray-200 dark:border-gray-700 rounded px-1 py-1 bg-white dark:bg-gray-900 w-14">
                  {FONT_SIZES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="Bold">
                  <Bold className="w-4 h-4" />
                </button>
                <button className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="Italic">
                  <Italic className="w-4 h-4" />
                </button>
                <button className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="Underline">
                  <Underline className="w-4 h-4" />
                </button>
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5">Font</span>
            </div>

            <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1" />

            {/* Paragraph */}
            <div className="flex flex-col items-center px-1">
              <div className="flex gap-0.5">
                <button className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="Align Left">
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="Align Center">
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="Align Right">
                  <AlignRight className="w-4 h-4" />
                </button>
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5">Paragraph</span>
            </div>

            <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1" />

            {/* Editing */}
            <div className="flex flex-col items-center px-1">
              <div className="flex gap-0.5">
                <button onClick={undo} disabled={historyIndex === 0} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50" title="Undo">
                  <Undo className="w-4 h-4" />
                </button>
                <button onClick={redo} disabled={historyIndex === history.length - 1} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50" title="Redo">
                  <Redo className="w-4 h-4" />
                </button>
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5">Undo</span>
            </div>
          </div>
        )}

        {activeTab === 'insert' && (
          <div className="flex items-center gap-0.5 flex-wrap">
            <div className="flex flex-col items-center px-1">
              <div className="flex gap-0.5">
                <button onClick={() => addElement('text')} className="flex flex-col items-center px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                  <Type className="w-5 h-5 text-blue-500" />
                  <span className="text-[10px] text-gray-500 mt-0.5">Text Box</span>
                </button>
                <button className="flex flex-col items-center px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                  <Image className="w-5 h-5 text-green-500" />
                  <span className="text-[10px] text-gray-500 mt-0.5">Picture</span>
                </button>
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5">Insert</span>
            </div>

            <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1" />

            <div className="flex flex-col items-center px-1">
              <div className="flex gap-0.5">
                <button onClick={() => addElement('shape', 'rectangle')} className="flex flex-col items-center px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                  <Square className="w-5 h-5 text-purple-500" />
                  <span className="text-[10px] text-gray-500 mt-0.5">Rectangle</span>
                </button>
                <button onClick={() => addElement('shape', 'circle')} className="flex flex-col items-center px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                  <Circle className="w-5 h-5 text-purple-500" />
                  <span className="text-[10px] text-gray-500 mt-0.5">Circle</span>
                </button>
                <button onClick={() => addElement('shape', 'triangle')} className="flex flex-col items-center px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                  <Triangle className="w-5 h-5 text-purple-500" />
                  <span className="text-[10px] text-gray-500 mt-0.5">Triangle</span>
                </button>
                <button onClick={() => addElement('shape', 'line')} className="flex flex-col items-center px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                  <Minus className="w-5 h-5 text-purple-500" />
                  <span className="text-[10px] text-gray-500 mt-0.5">Line</span>
                </button>
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5">Shapes</span>
            </div>
          </div>
        )}

        {activeTab === 'design' && (
          <div className="flex items-center gap-0.5 flex-wrap">
            <div className="flex flex-col items-center px-1">
              <div className="flex gap-1 items-center">
                <span className="text-xs text-gray-600 dark:text-gray-400">Background:</span>
                <div className="flex gap-1">
                  {BACKGROUNDS.slice(0, 8).map(bg => (
                    <button
                      key={bg}
                      onClick={() => updateSlide(currentSlide, { background: bg })}
                      className={`w-6 h-6 rounded border-2 ${slide.background === bg ? 'border-blue-500' : 'border-gray-200 dark:border-gray-700'}`}
                      style={{ backgroundColor: bg }}
                      title={bg}
                    />
                  ))}
                </div>
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5">Slide Background</span>
            </div>
          </div>
        )}

        {activeTab === 'transitions' && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Sparkles className="w-4 h-4" />
            <span>Slide transitions coming soon...</span>
          </div>
        )}

        {activeTab === 'view' && (
          <div className="flex items-center gap-0.5 flex-wrap">
            <div className="flex flex-col items-center px-1">
              <div className="flex gap-0.5">
                <button onClick={() => setViewMode('edit')} className={`p-1.5 rounded ${viewMode === 'edit' ? 'bg-blue-100 dark:bg-blue-900/40' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`} title="Normal">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={() => setShowNotes(!showNotes)} className={`p-1.5 rounded ${showNotes ? 'bg-blue-100 dark:bg-blue-900/40' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`} title="Notes">
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button onClick={() => setShowGrid(!showGrid)} className={`p-1.5 rounded ${showGrid ? 'bg-blue-100 dark:bg-blue-900/40' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`} title="Grid">
                  <Grid3x3 className="w-4 h-4" />
                </button>
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5">Views</span>
            </div>

            <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1" />

            <div className="flex flex-col items-center px-1">
              <div className="flex gap-1 items-center">
                <button onClick={() => setZoom(Math.max(50, zoom - 10))} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs min-w-[40px] text-center">{zoom}%</span>
                <button onClick={() => setZoom(Math.min(200, zoom + 10))} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5">Zoom</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Slide Thumbnails */}
        <div className="w-48 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-2 space-y-2">
          {content.map((s, i) => (
            <div
              key={s.id}
              onClick={() => setCurrentSlide(i)}
              className={`relative cursor-pointer rounded-lg border-2 overflow-hidden transition-all ${
                currentSlide === i ? 'border-blue-500 shadow-md' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div
                className="aspect-video p-2 flex flex-col justify-center items-center"
                style={{ background: s.background, color: isLightColor(s.background) ? '#333' : '#fff' }}
              >
                {s.title && <p className="text-[8px] font-bold truncate w-full text-center">{s.title}</p>}
                {s.content && <p className="text-[6px] truncate w-full text-center opacity-70">{s.content}</p>}
              </div>
              <span className="absolute bottom-0.5 left-1 text-[8px] text-gray-500">{i + 1}</span>
              
              {/* Slide controls */}
              {currentSlide === i && (
                <div className="absolute top-0.5 right-0.5 flex gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); moveSlide(i, i - 1); }}
                    disabled={i === 0}
                    className="p-0.5 bg-white/80 rounded hover:bg-white disabled:opacity-30"
                    title="Move Up"
                  >
                    <ChevronLeft className="w-3 h-3 rotate-90" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); moveSlide(i, i + 1); }}
                    disabled={i === content.length - 1}
                    className="p-0.5 bg-white/80 rounded hover:bg-white disabled:opacity-30"
                    title="Move Down"
                  >
                    <ChevronRight className="w-3 h-3 rotate-90" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Main Slide Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex items-center justify-center p-8 overflow-auto bg-gray-200 dark:bg-gray-800">
            <div
              className="relative rounded-lg shadow-2xl"
              style={{
                width: `${960 * (zoom / 100)}px`,
                height: `${540 * (zoom / 100)}px`,
                background: slide.background,
                color: isLightColor(slide.background) ? '#333' : '#fff',
              }}
            >
              {/* Grid overlay */}
              {showGrid && (
                <div className="absolute inset-0 pointer-events-none opacity-20">
                  <div className="w-full h-full" style={{
                    backgroundImage: 'linear-gradient(to right, #999 1px, transparent 1px), linear-gradient(to bottom, #999 1px, transparent 1px)',
                    backgroundSize: '50px 50px'
                  }} />
                </div>
              )}

              <div className="w-full h-full p-12 flex flex-col justify-center items-center relative">
                {slide.title && (
                  <input
                    value={slide.title}
                    onChange={(e) => updateSlide(currentSlide, { title: e.target.value })}
                    readOnly={readOnly}
                    className="text-4xl font-bold text-center bg-transparent border-none outline-none w-full mb-6 placeholder:opacity-50"
                    placeholder="Slide Title"
                  />
                )}
                {slide.content && (
                  <textarea
                    value={slide.content}
                    onChange={(e) => updateSlide(currentSlide, { content: e.target.value })}
                    readOnly={readOnly}
                    className="text-xl text-center bg-transparent border-none outline-none w-full max-w-2xl resize-none placeholder:opacity-50 min-h-[100px]"
                    placeholder="Click to add content"
                  />
                )}

                {/* Elements */}
                {(elements[slide.id] || []).map(el => (
                  <div
                    key={el.id}
                    onClick={() => setSelectedElement(el.id)}
                    className={`absolute cursor-move ${selectedElement === el.id ? 'ring-2 ring-blue-500' : ''}`}
                    style={{
                      left: `${el.x * (zoom / 100)}px`,
                      top: `${el.y * (zoom / 100)}px`,
                      width: `${el.width * (zoom / 100)}px`,
                      height: `${el.height * (zoom / 100)}px`,
                    }}
                  >
                    {el.type === 'text' && (
                      <div
                        style={{
                          fontSize: `${(el.style?.fontSize || 24) * (zoom / 100)}px`,
                          fontFamily: el.style?.fontFamily,
                          color: el.style?.color,
                          textAlign: el.style?.align,
                          fontWeight: el.style?.bold ? 'bold' : 'normal',
                          fontStyle: el.style?.italic ? 'italic' : 'normal',
                          textDecoration: el.style?.underline ? 'underline' : 'none',
                        }}
                      >
                        {el.content}
                      </div>
                    )}
                    {el.type === 'shape' && (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: el.style?.backgroundColor || '#3b82f6',
                          borderRadius: el.style?.shapeType === 'circle' ? '50%' : '0',
                          clipPath: el.style?.shapeType === 'triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Notes Panel */}
          {showNotes && (
            <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-3">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Speaker Notes</label>
              <textarea
                value={slide.notes}
                onChange={(e) => updateSlide(currentSlide, { notes: e.target.value })}
                placeholder="Add speaker notes..."
                className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20"
              />
            </div>
          )}

          {/* Bottom Controls */}
          <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-center gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Background</label>
                <div className="flex gap-1 flex-wrap">
                  {BACKGROUNDS.map(bg => (
                    <button
                      key={bg}
                      onClick={() => updateSlide(currentSlide, { background: bg })}
                      className={`w-6 h-6 rounded-full border-2 ${slide.background === bg ? 'border-blue-500 scale-110' : 'border-gray-200 dark:border-gray-700'}`}
                      style={{ backgroundColor: bg }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex-1" />
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Slide {currentSlide + 1} of {content.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Layout Picker Modal */}
      {showLayoutPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowLayoutPicker(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl p-6 max-w-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Choose Slide Layout</h3>
            <div className="grid grid-cols-3 gap-4">
              {LAYOUTS.map((layout, i) => (
                <button
                  key={i}
                  onClick={() => { addSlide(i); setShowLayoutPicker(false); }}
                  className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 transition-colors"
                >
                  <div className="text-3xl mb-2">{layout.icon}</div>
                  <div className="text-sm font-medium">{layout.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
