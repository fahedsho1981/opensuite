import React, { useRef } from 'react';
import { FileText, Upload, Trash2, FolderOpen, FileSpreadsheet, Presentation, FileCode, File } from 'lucide-react';
import type { OfficeFile, FileType } from '../types';
import { getFileType } from '../utils/fileHandlers';

interface SidebarProps {
  files: OfficeFile[];
  activeFile: OfficeFile | null;
  onSelectFile: (file: OfficeFile) => void;
  onNewFile: (type: FileType, name: string) => void;
  onDeleteFile: (id: string) => void;
  onImportFile: (file: OfficeFile) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({
  files,
  activeFile,
  onSelectFile,
  onNewFile,
  onDeleteFile,
  onImportFile,
  isOpen,
  onToggle,
}: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const importedFiles = e.target.files;
    if (!importedFiles) return;

    for (let i = 0; i < importedFiles.length; i++) {
      const file = importedFiles[i];
      const type = getFileType(file.name);
      if (!type) continue;

      let content: any = '';
      
      try {
        if (type === 'md') {
          content = await file.text();
        } else if (type === 'pdf') {
          content = URL.createObjectURL(file);
        } else if (type === 'docx' || type === 'doc') {
          // Use mammoth to convert docx to HTML
          const { readDocxFile } = await import('../utils/fileHandlers');
          content = await readDocxFile(file);
        } else if (type === 'xlsx' || type === 'xls') {
          // Use xlsx to parse spreadsheet
          const { readXlsxFile } = await import('../utils/fileHandlers');
          content = await readXlsxFile(file);
        } else {
          content = await file.text();
        }
      } catch (err) {
        console.error(`Error reading ${file.name}:`, err);
        // Fallback to text
        content = await file.text().catch(() => '');
      }

      onImportFile({
        id: Date.now().toString() + i,
        name: file.name,
        type,
        content,
        lastModified: new Date(),
        size: file.size,
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getFileIconComponent = (type: FileType) => {
    switch (type) {
      case 'docx':
      case 'doc':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
      case 'pptx':
      case 'ppt':
        return <Presentation className="w-4 h-4 text-orange-500" />;
      case 'md':
        return <FileCode className="w-4 h-4 text-purple-500" />;
      case 'pdf':
        return <File className="w-4 h-4 text-red-500" />;
      default:
        return <File className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={onToggle}
        className="lg:hidden fixed top-4 left-4 z-50 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
      >
        <FolderOpen className="w-5 h-5" />
      </button>

      {/* Sidebar */}
      <div
        className={`fixed lg:relative z-40 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col ${
          isOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full lg:w-0 lg:-translate-x-full'
        } overflow-hidden`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">OS</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">OpenSuite</h1>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onNewFile('docx', 'Untitled Document.docx')}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 text-xs font-medium transition-colors"
              title="New Document"
            >
              <FileText className="w-3.5 h-3.5" />
              Doc
            </button>
            <button
              onClick={() => onNewFile('xlsx', 'Untitled Spreadsheet.xlsx')}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 text-xs font-medium transition-colors"
              title="New Spreadsheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Sheet
            </button>
            <button
              onClick={() => onNewFile('pptx', 'Untitled Presentation.pptx')}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/50 text-xs font-medium transition-colors"
              title="New Presentation"
            >
              <Presentation className="w-3.5 h-3.5" />
              Slide
            </button>
            <button
              onClick={() => onNewFile('md', 'Untitled.md')}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 text-xs font-medium transition-colors"
              title="New Markdown"
            >
              <FileCode className="w-3.5 h-3.5" />
              MD
            </button>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-sm transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.md,.pdf"
            onChange={handleImport}
            className="hidden"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2 py-2">
            Files ({files.length})
          </div>
          {files.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-600">
              <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No files yet</p>
              <p className="text-xs mt-1">Create or import a file</p>
            </div>
          ) : (
            <div className="space-y-1">
              {files.map((file) => (
                <div
                  key={file.id}
                  onClick={() => onSelectFile(file)}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    activeFile?.id === file.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
                  }`}
                >
                  {getFileIconComponent(file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {file.lastModified.toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFile(file.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            OpenSuite Office v1.0
          </p>
        </div>
      </div>
    </>
  );
}
