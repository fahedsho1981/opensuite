import { useState, useCallback, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import Sidebar from './components/Sidebar';
import DocumentEditor from './components/DocumentEditor';
import SpreadsheetEditor from './components/SpreadsheetEditor';
import PresentationEditor from './components/PresentationEditor';
import MarkdownEditor from './components/MarkdownEditor';
import PDFViewer from './components/PDFViewer';
import type { OfficeFile, FileType } from './types';
import { createNewFile, getFileIcon } from './utils/fileHandlers';
import IntegrationPanel from './components/IntegrationPanel';
import {
  FileText, FileSpreadsheet, Presentation, FileCode, File,
  Menu, Eye, Edit3, Maximize2, Minimize2, Globe, AlertCircle, RefreshCw
} from 'lucide-react';

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application Error:', error, errorInfo);
    
    // Log to error tracking service
    try {
      localStorage.setItem('last_error', JSON.stringify({
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      }));
    } catch {
      // Ignore storage errors
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Something went wrong</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              We're sorry, but the application encountered an unexpected error.
            </p>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 mb-4">
              <p className="text-sm text-red-800 dark:text-red-200 font-mono">
                {this.state.error?.message || 'Unknown error'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
              >
                Reload Page
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
              If the problem persists, please contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const [files, setFiles] = useState<OfficeFile[]>(() => {
    // Create sample files for demo
    const sampleDoc = createNewFile('docx', 'Welcome to OpenSuite.docx');
    sampleDoc.content = `<h1>Welcome to OpenSuite</h1>
<p>OpenSuite is a powerful online office suite that lets you create, edit, and view documents right in your browser.</p>
<h2>Features</h2>
<ul>
<li><strong>Document Editor</strong> - Create and edit rich text documents with full formatting support</li>
<li><strong>Spreadsheet</strong> - Work with spreadsheets including formulas and cell formatting</li>
<li><strong>Presentations</strong> - Create slide decks with customizable backgrounds and layouts</li>
<li><strong>Markdown</strong> - Write in Markdown with live preview</li>
<li><strong>PDF Viewer</strong> - View PDF documents directly in the browser</li>
</ul>
<h2>File Format Support</h2>
<p>OpenSuite supports importing and exporting the following formats:</p>
<ul>
<li>DOC / DOCX - Microsoft Word documents</li>
<li>XLS / XLSX - Microsoft Excel spreadsheets</li>
<li>PPT / PPTX - Microsoft PowerPoint presentations</li>
<li>PDF - Portable Document Format (view only)</li>
<li>Markdown (.md) - Plain text with formatting</li>
</ul>
<h2>Integration</h2>
<p>OpenSuite can be integrated with other applications via:</p>
<ul>
<li>Embed iframe for direct integration</li>
<li>REST API for server-side operations</li>
<li>Webhooks for real-time notifications</li>
<li>JavaScript SDK for seamless client-side integration</li>
</ul>
<p>Click the <strong>Globe icon</strong> in the top bar to see integration options.</p>`;
    sampleDoc.lastModified = new Date();

    const sampleSheet = createNewFile('xlsx', 'Sample Data.xlsx');
    const sheetContent = sampleSheet.content as any[][];
    // Add headers
    sheetContent[0][0] = { value: 'Product' };
    sheetContent[0][1] = { value: 'Price' };
    sheetContent[0][2] = { value: 'Quantity' };
    sheetContent[0][3] = { value: 'Total' };
    // Add data
    sheetContent[1][0] = { value: 'Widget A' };
    sheetContent[1][1] = { value: '29.99' };
    sheetContent[1][2] = { value: '10' };
    sheetContent[1][3] = { value: '=B2*C2' };
    sheetContent[2][0] = { value: 'Widget B' };
    sheetContent[2][1] = { value: '49.99' };
    sheetContent[2][2] = { value: '5' };
    sheetContent[2][3] = { value: '=B3*C3' };
    sheetContent[3][0] = { value: 'Widget C' };
    sheetContent[3][1] = { value: '19.99' };
    sheetContent[3][2] = { value: '20' };
    sheetContent[3][3] = { value: '=B4*C4' };
    sheetContent[4][0] = { value: '' };
    sheetContent[4][1] = { value: '' };
    sheetContent[4][2] = { value: 'Grand Total:' };
    sheetContent[4][3] = { value: '=SUM(D2:D4)' };
    sampleSheet.lastModified = new Date();

    const sampleMd = createNewFile('md', 'README.md');
    sampleMd.content = `# OpenSuite

> A modern, web-based office suite

## Quick Start

1. **Create** a new document using the buttons in the sidebar
2. **Import** existing files (DOCX, XLSX, PPTX, PDF, MD)
3. **Edit** with full formatting support
4. **Export** to native formats

## Supported Formats

| Format | Read | Write |
|--------|------|-------|
| DOCX   | ✅   | ✅    |
| XLSX   | ✅   | ✅    |
| PPTX   | ✅   | ✅    |
| PDF    | ✅   | ❌    |
| MD     | ✅   | ✅    |

## Keyboard Shortcuts

- \`Ctrl+B\` - Bold
- \`Ctrl+I\` - Italic
- \`Ctrl+U\` - Underline
- \`Ctrl+S\` - Save/Export

## Integration

OpenSuite can be embedded in other applications:

\`\`\`html
<iframe src="https://your-opensuite-url.com" width="100%" height="600"></iframe>
\`\`\`

---

*Built with React, TypeScript, and Tailwind CSS*
`;
    sampleMd.lastModified = new Date();

    const samplePptx = createNewFile('pptx', 'Sample Presentation.pptx');
    samplePptx.content = [
      { id: '1', title: 'OpenSuite', content: 'A Modern Office Suite for the Web', background: '#1a1a2e', notes: 'Welcome slide' },
      { id: '2', title: 'Features', content: '• Document Editor\n• Spreadsheet\n• Presentations\n• Markdown\n• PDF Viewer', background: '#0f3460', notes: '' },
      { id: '3', title: 'Integration', content: 'Embed via iframe, REST API, Webhooks, and JavaScript SDK', background: '#533483', notes: '' },
    ];
    samplePptx.lastModified = new Date();

    return [sampleDoc, sampleSheet, sampleMd, samplePptx];
  });
  const [activeFile, setActiveFile] = useState<OfficeFile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editorMode, setEditorMode] = useState<'edit' | 'view'>('edit');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showIntegration, setShowIntegration] = useState(false);
  const [collaborationUrl, setCollaborationUrl] = useState<string | null>(null);
  const [collaborationStatus, setCollaborationStatus] = useState<string>('disconnected');

  // Read collaboration URL from query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wsUrl = params.get('wsUrl');
    if (wsUrl) {
      setCollaborationUrl(wsUrl);
    }
  }, []);

  const handleNewFile = (type: FileType, name: string) => {
    const newFile = createNewFile(type, name);
    setFiles(prev => [...prev, newFile]);
    setActiveFile(newFile);
  };

  const handleDeleteFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (activeFile?.id === id) {
      setActiveFile(null);
    }
  };

  const handleImportFile = (file: OfficeFile) => {
    setFiles(prev => [...prev, file]);
    setActiveFile(file);
  };

  const handleFileContentChange = useCallback((newContent: any) => {
    if (!activeFile) return;
    const updatedFile = { ...activeFile, content: newContent, lastModified: new Date() };
    setActiveFile(updatedFile);
    setFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
  }, [activeFile]);

  const handleSelectFile = (file: OfficeFile) => {
    setActiveFile(file);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const renderEditor = () => {
    if (!activeFile) {
      return (
        <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
          <div className="text-center max-w-lg">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
              <span className="text-white text-3xl font-bold">OS</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
              Welcome to OpenSuite
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 text-lg">
              A full-featured office suite for creating, editing, and viewing documents, spreadsheets, presentations, and more.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => handleNewFile('docx', 'Untitled Document.docx')}
                className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6 text-blue-500" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Document</span>
              </button>
              <button
                onClick={() => handleNewFile('xlsx', 'Untitled Spreadsheet.xlsx')}
                className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="w-6 h-6 text-green-500" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Spreadsheet</span>
              </button>
              <button
                onClick={() => handleNewFile('pptx', 'Untitled Presentation.pptx')}
                className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Presentation className="w-6 h-6 text-orange-500" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Presentation</span>
              </button>
              <button
                onClick={() => handleNewFile('md', 'Untitled.md')}
                className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileCode className="w-6 h-6 text-purple-500" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Markdown</span>
              </button>
            </div>
            <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-400 dark:text-gray-500">
              <span className="flex items-center gap-1">
                <File className="w-4 h-4" /> DOC/DOCX
              </span>
              <span className="flex items-center gap-1">
                <File className="w-4 h-4" /> XLS/XLSX
              </span>
              <span className="flex items-center gap-1">
                <File className="w-4 h-4" /> PPT/PPTX
              </span>
              <span className="flex items-center gap-1">
                <File className="w-4 h-4" /> PDF
              </span>
              <span className="flex items-center gap-1">
                <File className="w-4 h-4" /> Markdown
              </span>
            </div>
          </div>
        </div>
      );
    }

    const isReadOnly = editorMode === 'view';

    switch (activeFile.type) {
      case 'docx':
      case 'doc':
        return (
          <DocumentEditor
            content={activeFile.content}
            onChange={handleFileContentChange}
            fileName={activeFile.name}
            readOnly={isReadOnly}
            collaborationUrl={collaborationUrl || undefined}
          />
        );
      case 'xlsx':
      case 'xls':
        return (
          <SpreadsheetEditor
            content={activeFile.content}
            onChange={handleFileContentChange}
            fileName={activeFile.name}
            readOnly={isReadOnly}
            collaborationUrl={collaborationUrl || undefined}
          />
        );
      case 'pptx':
      case 'ppt':
        return (
          <PresentationEditor
            content={activeFile.content}
            onChange={handleFileContentChange}
            fileName={activeFile.name}
            readOnly={isReadOnly}
            collaborationUrl={collaborationUrl || undefined}
          />
        );
      case 'md':
        return (
          <MarkdownEditor
            content={activeFile.content}
            onChange={handleFileContentChange}
            fileName={activeFile.name}
            readOnly={isReadOnly}
            collaborationUrl={collaborationUrl || undefined}
          />
        );
      case 'pdf':
        return (
          <PDFViewer
            content={activeFile.content}
            fileName={activeFile.name}
          />
        );
      default:
        return (
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
            <p className="text-gray-500">Unsupported file type</p>
          </div>
        );
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* Top Bar */}
      <header className="h-12 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-3 shrink-0 z-30">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
        >
          <Menu className="w-5 h-5" />
        </button>

        {activeFile && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-lg">{getFileIcon(activeFile.type)}</span>
            <h2 className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {activeFile.name}
            </h2>
            <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">
              Modified {activeFile.lastModified.toLocaleTimeString()}
            </span>
          </div>
        )}
        {!activeFile && <div className="flex-1" />}

        <div className="flex items-center gap-1">
          {activeFile && activeFile.type !== 'pdf' && (
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 mr-2">
              <button
                onClick={() => setEditorMode('edit')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  editorMode === 'edit'
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                onClick={() => setEditorMode('view')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  editorMode === 'view'
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">View</span>
              </button>
            </div>
          )}
          <button
            onClick={() => setShowIntegration(true)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
            title="Integration & API"
          >
            <Globe className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          files={files}
          activeFile={activeFile}
          onSelectFile={handleSelectFile}
          onNewFile={handleNewFile}
          onDeleteFile={handleDeleteFile}
          onImportFile={handleImportFile}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="flex-1 overflow-hidden">
          {renderEditor()}
        </main>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Integration Panel */}
      <IntegrationPanel
        isOpen={showIntegration}
        onClose={() => setShowIntegration(false)}
      />
    </div>
  );
}

// Wrap App with Error Boundary
export default function AppWithBoundary() {
  return (
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
}
