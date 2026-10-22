import React, { useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface PDFViewerProps {
  content: string; // URL or base64 data
  fileName: string;
}

export default function PDFViewer({ content, fileName }: PDFViewerProps) {
  const [pdf, setPdf] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const loadPdf = async () => {
      if (!content) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const loadingTask = pdfjsLib.getDocument(content);
        const pdfDoc = await loadingTask.promise;
        setPdf(pdfDoc);
        setTotalPages(pdfDoc.numPages);
        setCurrentPage(1);
        setLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setLoading(false);
      }
    };

    loadPdf();
  }, [content]);

  useEffect(() => {
    const renderPage = async () => {
      if (!pdf || !canvasRef.current) return;

      try {
        const page = await pdf.getPage(currentPage);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;
      } catch (err) {
        console.error('Error rendering page:', err);
      }
    };

    renderPage();
  }, [pdf, currentPage, scale]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const zoomIn = () => setScale(s => Math.min(s + 0.25, 3));
  const zoomOut = () => setScale(s => Math.max(s - 0.25, 0.5));

  const handleDownload = () => {
    if (content) {
      const a = document.createElement('a');
      a.href = content;
      a.download = fileName;
      a.click();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800">
        <div className="text-center text-gray-500">
          <p className="text-lg">No PDF loaded</p>
          <p className="text-sm mt-2">Import a PDF file to view it here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-600">
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-2">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            <input
              type="number"
              value={currentPage}
              onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
              className="w-12 text-center border border-gray-200 dark:border-gray-700 rounded px-1 py-0.5 text-sm bg-transparent"
              min={1}
              max={totalPages}
            />
            <span className="mx-1">/</span>
            {totalPages}
          </span>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2" />
          <button onClick={zoomOut} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-700 dark:text-gray-300 min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button onClick={zoomIn} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2" />
          <button onClick={handleDownload} className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium">
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>

      {/* PDF Canvas */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-8">
        <div className="shadow-2xl bg-white">
          <canvas ref={canvasRef} className="block" />
        </div>
      </div>
    </div>
  );
}
