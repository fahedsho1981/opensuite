import React, { useState } from 'react';
import { Plus, Trash2, Download, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import type { Slide } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface PresentationEditorProps {
  content: Slide[];
  onChange: (content: Slide[]) => void;
  fileName: string;
  readOnly?: boolean;
}

const BACKGROUNDS = [
  '#ffffff', '#1a1a2e', '#16213e', '#0f3460', '#533483',
  '#e94560', '#f5f5f5', '#2d3436', '#6c5ce7', '#00b894',
  '#fdcb6e', '#e17055', '#0984e3', '#636e72', '#2d3436',
];

const LAYOUTS = [
  { name: 'Title', title: true, content: false },
  { name: 'Title + Content', title: true, content: true },
  { name: 'Blank', title: false, content: true },
];

export default function PresentationEditor({ content, onChange, fileName, readOnly = false }: PresentationEditorProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [viewMode, setViewMode] = useState<'edit' | 'present'>('edit');

  const addSlide = () => {
    const newSlide: Slide = {
      id: uuidv4(),
      title: `Slide ${content.length + 1}`,
      content: 'Click to add content',
      background: '#ffffff',
      notes: '',
    };
    const newContent = [...content, newSlide];
    onChange(newContent);
    setCurrentSlide(newContent.length - 1);
  };

  const deleteSlide = (index: number) => {
    if (content.length <= 1) return;
    const newContent = content.filter((_, i) => i !== index);
    onChange(newContent);
    setCurrentSlide(Math.min(currentSlide, newContent.length - 1));
  };

  const updateSlide = (index: number, updates: Partial<Slide>) => {
    const newContent = content.map((slide, i) =>
      i === index ? { ...slide, ...updates } : slide
    );
    onChange(newContent);
  };

  const duplicateSlide = (index: number) => {
    const slide = { ...content[index], id: uuidv4() };
    const newContent = [...content.slice(0, index + 1), slide, ...content.slice(index + 1)];
    onChange(newContent);
    setCurrentSlide(index + 1);
  };

  const exportPresentation = () => {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${fileName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    .slide { width: 100vw; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 60px; page-break-after: always; }
    .slide h1 { font-size: 3em; margin-bottom: 20px; }
    .slide p { font-size: 1.5em; text-align: center; }
  </style>
</head>
<body>
  ${content.map(slide => `
    <div class="slide" style="background: ${slide.background}; color: ${slide.background === '#ffffff' || slide.background === '#f5f5f5' || slide.background === '#fdcb6e' ? '#333' : '#fff'}">
      <h1>${slide.title}</h1>
      <p>${slide.content}</p>
    </div>
  `).join('')}
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.replace(/\.\w+$/, '.html');
    a.click();
    URL.revokeObjectURL(url);
  };

  const slide = content[currentSlide];
  if (!slide) return null;

  if (viewMode === 'present') {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div
          className="w-full h-full flex flex-col justify-center items-center p-16 relative"
          style={{ background: slide.background, color: slide.background === '#ffffff' || slide.background === '#f5f5f5' || slide.background === '#fdcb6e' ? '#333' : '#fff' }}
        >
          <h1 className="text-5xl font-bold mb-8 text-center">{slide.title}</h1>
          <p className="text-2xl text-center max-w-3xl">{slide.content}</p>
          <button
            onClick={() => setViewMode('edit')}
            className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/30 text-white"
          >
            ✕
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
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-2">
        <div className="flex items-center gap-2">
          <button onClick={addSlide} className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Add Slide
          </button>
          <button onClick={() => duplicateSlide(currentSlide)} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm">
            Duplicate
          </button>
          <button
            onClick={() => deleteSlide(currentSlide)}
            disabled={content.length <= 1}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg text-sm disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setViewMode('present')}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium"
          >
            <Play className="w-4 h-4" /> Present
          </button>
          <button
            onClick={exportPresentation}
            className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
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
                style={{ background: s.background, color: s.background === '#ffffff' || s.background === '#f5f5f5' || s.background === '#fdcb6e' ? '#333' : '#fff' }}
              >
                <p className="text-[8px] font-bold truncate w-full text-center">{s.title}</p>
                <p className="text-[6px] truncate w-full text-center opacity-70">{s.content}</p>
              </div>
              <span className="absolute bottom-0.5 left-1 text-[8px] text-gray-500">{i + 1}</span>
            </div>
          ))}
        </div>

        {/* Main Slide Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
            <div
              className="w-full max-w-4xl aspect-video rounded-lg shadow-2xl p-12 flex flex-col justify-center items-center relative"
              style={{ background: slide.background, color: slide.background === '#ffffff' || slide.background === '#f5f5f5' || slide.background === '#fdcb6e' ? '#333' : '#fff' }}
            >
              <input
                value={slide.title}
                onChange={(e) => updateSlide(currentSlide, { title: e.target.value })}
                readOnly={readOnly}
                className="text-4xl font-bold text-center bg-transparent border-none outline-none w-full mb-6 placeholder:opacity-50"
                placeholder="Slide Title"
              />
              <textarea
                value={slide.content}
                onChange={(e) => updateSlide(currentSlide, { content: e.target.value })}
                readOnly={readOnly}
                className="text-xl text-center bg-transparent border-none outline-none w-full max-w-2xl resize-none placeholder:opacity-50 min-h-[100px]"
                placeholder="Click to add content"
              />
            </div>
          </div>

          {/* Slide Controls */}
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
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Notes</label>
                <input
                  value={slide.notes}
                  onChange={(e) => updateSlide(currentSlide, { notes: e.target.value })}
                  placeholder="Speaker notes..."
                  className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
