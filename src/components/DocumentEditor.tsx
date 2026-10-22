import React, { useRef, useState, useEffect } from 'react';
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Heading1, Heading2, Heading3, Undo, Redo,
  Download, Type, Indent, Outdent, Strikethrough, Link, Image,
  Table, Minus, Quote
} from 'lucide-react';
import { exportDocx } from '../utils/fileHandlers';

interface DocumentEditorProps {
  content: string;
  onChange: (content: string) => void;
  fileName: string;
  readOnly?: boolean;
}

export default function DocumentEditor({ content, onChange, fileName, readOnly = false }: DocumentEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (editorRef.current && !isReady) {
      editorRef.current.innerHTML = content;
      setIsReady(true);
    }
  }, [content, isReady]);

  const execCommand = (command: string, value?: string) => {
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

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const insertTable = () => {
    const rows = prompt('Number of rows:', '3');
    const cols = prompt('Number of columns:', '3');
    if (rows && cols) {
      let table = '<table class="border-collapse w-full my-4"><tbody>';
      for (let r = 0; r < parseInt(rows); r++) {
        table += '<tr>';
        for (let c = 0; c < parseInt(cols); c++) {
          table += '<td class="border border-gray-300 p-2 min-w-[80px]">&nbsp;</td>';
        }
        table += '</tr>';
      }
      table += '</tbody></table>';
      execCommand('insertHTML', table);
    }
  };

  const insertHR = () => {
    execCommand('insertHTML', '<hr class="my-4 border-gray-300" />');
  };

  const insertBlockquote = () => {
    execCommand('formatBlock', 'blockquote');
  };

  const toolbarButtons = [
    { icon: Undo, action: () => execCommand('undo'), title: 'Undo' },
    { icon: Redo, action: () => execCommand('redo'), title: 'Redo' },
    { type: 'separator' },
    { icon: Heading1, action: () => execCommand('formatBlock', 'h1'), title: 'Heading 1' },
    { icon: Heading2, action: () => execCommand('formatBlock', 'h2'), title: 'Heading 2' },
    { icon: Heading3, action: () => execCommand('formatBlock', 'h3'), title: 'Heading 3' },
    { icon: Type, action: () => execCommand('formatBlock', 'p'), title: 'Normal Text' },
    { type: 'separator' },
    { icon: Bold, action: () => execCommand('bold'), title: 'Bold' },
    { icon: Italic, action: () => execCommand('italic'), title: 'Italic' },
    { icon: Underline, action: () => execCommand('underline'), title: 'Underline' },
    { icon: Strikethrough, action: () => execCommand('strikeThrough'), title: 'Strikethrough' },
    { type: 'separator' },
    { icon: AlignLeft, action: () => execCommand('justifyLeft'), title: 'Align Left' },
    { icon: AlignCenter, action: () => execCommand('justifyCenter'), title: 'Align Center' },
    { icon: AlignRight, action: () => execCommand('justifyRight'), title: 'Align Right' },
    { type: 'separator' },
    { icon: List, action: () => execCommand('insertUnorderedList'), title: 'Bullet List' },
    { icon: ListOrdered, action: () => execCommand('insertOrderedList'), title: 'Numbered List' },
    { icon: Indent, action: () => execCommand('indent'), title: 'Indent' },
    { icon: Outdent, action: () => execCommand('outdent'), title: 'Outdent' },
    { type: 'separator' },
    { icon: Link, action: insertLink, title: 'Insert Link' },
    { icon: Table, action: insertTable, title: 'Insert Table' },
    { icon: Minus, action: insertHR, title: 'Horizontal Rule' },
    { icon: Quote, action: insertBlockquote, title: 'Blockquote' },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-800">
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-2">
        <div className="flex items-center gap-0.5 flex-wrap">
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
          <button
            onClick={handleExport}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Export DOCX
          </button>
        </div>
      </div>

      {/* Font size selector */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-3 py-1.5 flex items-center gap-3">
        <select
          onChange={(e) => execCommand('fontSize', e.target.value)}
          className="text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          defaultValue="3"
        >
          <option value="1">Small</option>
          <option value="2">Normal</option>
          <option value="3">Medium</option>
          <option value="4">Large</option>
          <option value="5">X-Large</option>
          <option value="6">XX-Large</option>
          <option value="7">Huge</option>
        </select>
        <input
          type="color"
          onChange={(e) => execCommand('foreColor', e.target.value)}
          className="w-6 h-6 rounded cursor-pointer"
          title="Text Color"
          defaultValue="#000000"
        />
        <input
          type="color"
          onChange={(e) => execCommand('hiliteColor', e.target.value)}
          className="w-6 h-6 rounded cursor-pointer"
          title="Highlight Color"
          defaultValue="#ffff00"
        />
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 min-h-[800px]">
          <div
            ref={editorRef}
            contentEditable={!readOnly}
            onInput={handleInput}
            className="prose prose-lg dark:prose-invert max-w-none p-8 md:p-16 min-h-[800px] focus:outline-none"
            suppressContentEditableWarning
            style={{ lineHeight: '1.8' }}
          />
        </div>
      </div>
    </div>
  );
}
