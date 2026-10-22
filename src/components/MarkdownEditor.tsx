import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Download, Eye, Edit3, Columns, Bold, Italic, Code, Link, Image, List, ListOrdered, Quote, Heading1, Heading2, Heading3, Minus, CheckSquare } from 'lucide-react';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  fileName: string;
  readOnly?: boolean;
}

type ViewMode = 'edit' | 'preview' | 'split';

export default function MarkdownEditor({ content, onChange, fileName, readOnly = false }: MarkdownEditorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
    onChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const handleExport = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toolbarButtons = [
    { icon: Heading1, action: () => insertMarkdown('# ', ''), title: 'Heading 1' },
    { icon: Heading2, action: () => insertMarkdown('## ', ''), title: 'Heading 2' },
    { icon: Heading3, action: () => insertMarkdown('### ', ''), title: 'Heading 3' },
    { type: 'separator' },
    { icon: Bold, action: () => insertMarkdown('**', '**'), title: 'Bold' },
    { icon: Italic, action: () => insertMarkdown('*', '*'), title: 'Italic' },
    { icon: Code, action: () => insertMarkdown('`', '`'), title: 'Inline Code' },
    { type: 'separator' },
    { icon: Link, action: () => insertMarkdown('[', '](url)'), title: 'Link' },
    { icon: Image, action: () => insertMarkdown('![alt](', ')'), title: 'Image' },
    { type: 'separator' },
    { icon: List, action: () => insertMarkdown('- ', ''), title: 'Bullet List' },
    { icon: ListOrdered, action: () => insertMarkdown('1. ', ''), title: 'Numbered List' },
    { icon: CheckSquare, action: () => insertMarkdown('- [ ] ', ''), title: 'Task List' },
    { icon: Quote, action: () => insertMarkdown('> ', ''), title: 'Blockquote' },
    { icon: Minus, action: () => insertMarkdown('\n---\n', ''), title: 'Horizontal Rule' },
  ];

  const renderPreview = () => (
    <div className="prose prose-lg dark:prose-invert max-w-none p-6 md:p-8 overflow-y-auto h-full">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;
            return isInline ? (
              <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            ) : (
              <pre className="bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <code className={`language-${match[1]}`} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 bg-gray-100 dark:bg-gray-800 font-semibold">{children}</th>;
          },
          td({ children }) {
            return <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">{children}</td>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-2">
        <div className="flex items-center gap-0.5">
          {toolbarButtons.map((btn, i) => {
            if ('type' in btn && btn.type === 'separator') {
              return <div key={i} className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />;
            }
            const Button = (btn as any).icon;
            return (
              <button
                key={i}
                onClick={(btn as any).action}
                disabled={readOnly}
                title={(btn as any).title}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 transition-colors"
              >
                <Button className="w-4 h-4" />
              </button>
            );
          })}
          <div className="flex-1" />
          {/* View mode toggles */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('edit')}
              className={`p-1.5 rounded ${viewMode === 'edit' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}
              title="Edit Only"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`p-1.5 rounded ${viewMode === 'split' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}
              title="Split View"
            >
              <Columns className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`p-1.5 rounded ${viewMode === 'preview' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}
              title="Preview Only"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium ml-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export MD
          </button>
        </div>
      </div>

      {/* Editor / Preview */}
      <div className="flex-1 flex overflow-hidden">
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'w-1/2 border-r border-gray-200 dark:border-gray-700' : 'w-full'} flex flex-col`}>
            <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400">
              MARKDOWN
            </div>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => onChange(e.target.value)}
              readOnly={readOnly}
              className="flex-1 w-full p-6 font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none focus:outline-none leading-relaxed"
              placeholder="Start writing Markdown..."
              spellCheck={false}
            />
          </div>
        )}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} flex flex-col`}>
            <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400">
              PREVIEW
            </div>
            {renderPreview()}
          </div>
        )}
      </div>
    </div>
  );
}
