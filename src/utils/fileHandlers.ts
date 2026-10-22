import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import type { FileType, OfficeFile, SpreadsheetCell } from '../types';

export function getFileType(filename: string): FileType | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'doc':
    case 'docx':
      return ext as FileType;
    case 'xls':
    case 'xlsx':
      return ext as FileType;
    case 'ppt':
    case 'pptx':
      return ext as FileType;
    case 'md':
      return 'md';
    case 'pdf':
      return 'pdf';
    default:
      return null;
  }
}

export function getFileIcon(type: FileType): string {
  switch (type) {
    case 'doc':
    case 'docx':
      return '📄';
    case 'xls':
    case 'xlsx':
      return '📊';
    case 'ppt':
    case 'pptx':
      return '📽️';
    case 'md':
      return '📝';
    case 'pdf':
      return '📕';
    default:
      return '📁';
  }
}

export async function readDocxFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return result.value;
}

export async function readXlsxFile(file: File): Promise<SpreadsheetCell[][]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<string[][]>(sheet, { header: 1, defval: '' });
  
  const cells: SpreadsheetCell[][] = [];
  const maxRows = Math.max(jsonData.length, 100);
  const maxCols = Math.max(...jsonData.map(row => row.length), 26);
  
  for (let r = 0; r < maxRows; r++) {
    const row: SpreadsheetCell[] = [];
    for (let c = 0; c < maxCols; c++) {
      const value = jsonData[r]?.[c]?.toString() || '';
      row.push({ value });
    }
    cells.push(row);
  }
  
  return cells;
}

export async function readTextFile(file: File): Promise<string> {
  return await file.text();
}

export async function exportDocx(htmlContent: string, filename: string): Promise<void> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  
  const paragraphs: Paragraph[] = [];
  
  const processNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text.trim()) {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text })],
        }));
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const tagName = el.tagName.toLowerCase();
      
      if (tagName === 'h1') {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: el.textContent || '', bold: true, size: 32 })],
          heading: HeadingLevel.HEADING_1,
        }));
      } else if (tagName === 'h2') {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: el.textContent || '', bold: true, size: 28 })],
          heading: HeadingLevel.HEADING_2,
        }));
      } else if (tagName === 'h3') {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: el.textContent || '', bold: true, size: 24 })],
          heading: HeadingLevel.HEADING_3,
        }));
      } else if (tagName === 'p') {
        const runs: TextRun[] = [];
        el.childNodes.forEach(child => {
          if (child.nodeType === Node.TEXT_NODE) {
            runs.push(new TextRun({ text: child.textContent || '' }));
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            const childEl = child as Element;
            const isBold = childEl.tagName === 'STRONG' || childEl.tagName === 'B';
            const isItalic = childEl.tagName === 'EM' || childEl.tagName === 'I';
            const isUnderline = childEl.tagName === 'U';
            runs.push(new TextRun({
              text: childEl.textContent || '',
              bold: isBold,
              italics: isItalic,
              underline: isUnderline ? {} : undefined,
            }));
          }
        });
        if (runs.length > 0) {
          paragraphs.push(new Paragraph({ children: runs }));
        }
      } else if (tagName === 'ul' || tagName === 'ol') {
        el.querySelectorAll('li').forEach(li => {
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: '• ' + (li.textContent || '') })],
          }));
        });
      } else {
        el.childNodes.forEach(child => processNode(child));
      }
    }
  };
  
  doc.body.childNodes.forEach(node => processNode(node));
  
  if (paragraphs.length === 0) {
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: '' })] }));
  }
  
  const docx = new Document({
    sections: [{
      properties: {},
      children: paragraphs,
    }],
  });
  
  const blob = await Packer.toBlob(docx);
  saveAs(blob, filename);
}

export function exportXlsx(cells: SpreadsheetCell[][], filename: string): void {
  const data = cells.map(row => row.map(cell => cell.value));
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filename);
}

export function exportPdfAsHtml(pdfData: string, filename: string): void {
  const blob = new Blob([pdfData], { type: 'text/html' });
  saveAs(blob, filename);
}

export function createNewFile(type: FileType, name: string): OfficeFile {
  let content: any = '';
  
  switch (type) {
    case 'docx':
    case 'doc':
      content = '<p>Start typing your document...</p>';
      break;
    case 'xlsx':
    case 'xls':
      const cells: SpreadsheetCell[][] = [];
      for (let r = 0; r < 100; r++) {
        const row: SpreadsheetCell[] = [];
        for (let c = 0; c < 26; c++) {
          row.push({ value: '' });
        }
        cells.push(row);
      }
      content = cells;
      break;
    case 'pptx':
    case 'ppt':
      content = [{
        id: '1',
        title: 'Slide 1',
        content: 'Click to add text',
        background: '#ffffff',
        notes: '',
      }];
      break;
    case 'md':
      content = '# New Document\n\nStart writing in Markdown...\n';
      break;
    case 'pdf':
      content = '';
      break;
  }
  
  return {
    id: Date.now().toString(),
    name,
    type,
    content,
    lastModified: new Date(),
    size: 0,
  };
}
