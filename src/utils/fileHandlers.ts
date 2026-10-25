import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import mammoth from 'mammoth';
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  PageNumber,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type { FileType, OfficeFile, SpreadsheetCell } from '../types';
import { pageDimensions, splitDocument } from './documentModel';

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

type DocxBlock = Paragraph | Table;
type DocxInline = TextRun | ExternalHyperlink | ImageRun;

interface TextMarks {
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  size?: number;
  font?: string;
  superScript?: boolean;
  subScript?: boolean;
}

const TABLE_EDGE = { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' };
const HEADING_LEVELS: Record<string, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  H1: HeadingLevel.HEADING_1,
  H2: HeadingLevel.HEADING_2,
  H3: HeadingLevel.HEADING_3,
  H4: HeadingLevel.HEADING_4,
  H5: HeadingLevel.HEADING_5,
  H6: HeadingLevel.HEADING_6,
};

function cssColorToHex(color: string): string | undefined {
  const value = color.trim();
  const hex = value.match(/^#?([0-9a-f]{6})$/i);
  if (hex) return hex[1].toUpperCase();
  const rgb = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!rgb) return undefined;
  return [rgb[1], rgb[2], rgb[3]].map(part => Number(part).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function withMarks(el: HTMLElement, parent: TextMarks): TextMarks {
  const next: TextMarks = { ...parent };
  const tag = el.tagName;
  if (tag === 'B' || tag === 'STRONG') next.bold = true;
  if (tag === 'I' || tag === 'EM') next.italics = true;
  if (tag === 'U' || tag === 'INS') next.underline = true;
  if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') next.strike = true;
  if (tag === 'SUP') next.superScript = true;
  if (tag === 'SUB') next.subScript = true;
  if (el.style.fontWeight === 'bold' || Number(el.style.fontWeight) >= 600) next.bold = true;
  if (el.style.fontStyle === 'italic') next.italics = true;
  if (el.style.textDecoration.includes('underline')) next.underline = true;
  if (el.style.textDecoration.includes('line-through')) next.strike = true;
  const color = cssColorToHex(el.style.color);
  if (color) next.color = color;
  if (el.style.fontSize.endsWith('pt')) next.size = Math.round(parseFloat(el.style.fontSize) * 2);
  else if (el.style.fontSize.endsWith('px')) next.size = Math.round(parseFloat(el.style.fontSize) * 1.5);
  if (el.style.fontFamily) next.font = el.style.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
  return next;
}

function run(text: string, marks: TextMarks): TextRun {
  return new TextRun({
    text,
    bold: marks.bold,
    italics: marks.italics,
    underline: marks.underline ? {} : undefined,
    strike: marks.strike,
    color: marks.color,
    size: marks.size,
    font: marks.font,
    superScript: marks.superScript,
    subScript: marks.subScript,
  });
}

function dataUrlImage(src: string): { data: Uint8Array; type: 'png' | 'jpg' | 'gif' | 'bmp' } | null {
  const match = src.match(/^data:image\/(png|jpeg|jpg|gif|bmp);base64,([a-z0-9+/=\s]+)$/i);
  if (!match) return null;
  const kind = match[1].toLowerCase();
  const type = kind === 'jpeg' || kind === 'jpg' ? 'jpg' : kind === 'gif' ? 'gif' : kind === 'bmp' ? 'bmp' : 'png';
  const binary = atob(match[2].replace(/\s/g, ''));
  const data = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) data[i] = binary.charCodeAt(i);
  return { data, type };
}

function inlinesFrom(parent: ParentNode, marks: TextMarks): DocxInline[] {
  const pieces: DocxInline[] = [];
  parent.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text) pieces.push(run(text, marks));
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    const tag = node.tagName;
    if (tag === 'BR') {
      pieces.push(new TextRun({ break: 1 }));
      return;
    }
    if (tag === 'IMG') {
      const image = dataUrlImage(node.getAttribute('src') || '');
      if (image) {
        const width = Math.min(620, parseInt(node.getAttribute('width') || '', 10) || parseInt(node.style.width, 10) || 480);
        const height = Math.min(800, parseInt(node.getAttribute('height') || '', 10) || parseInt(node.style.height, 10) || Math.round(width * 0.66));
        pieces.push(new ImageRun({ type: image.type, data: image.data, transformation: { width, height } }));
      } else {
        const alt = node.getAttribute('alt') || 'Image';
        const src = node.getAttribute('src') || '';
        pieces.push(run(src.startsWith('http') ? `${alt} (${src})` : alt, marks));
      }
      return;
    }
    if (tag === 'A') {
      const href = node.getAttribute('href') || '';
      const children = inlinesFrom(node, withMarks(node, marks)).filter((piece): piece is TextRun => piece instanceof TextRun);
      if (/^(https?:|mailto:)/i.test(href)) {
        pieces.push(new ExternalHyperlink({ link: href, children: children.length ? children : [new TextRun(node.textContent || href)] }));
      } else {
        pieces.push(...(children.length ? children : [run(node.textContent || '', marks)]));
      }
      return;
    }
    if (tag === 'UL' || tag === 'OL' || tag === 'TABLE') return;
    pieces.push(...inlinesFrom(node, withMarks(node, marks)));
  });
  return pieces;
}

function paragraphFrom(el: HTMLElement, extra: { heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel] } = {}): Paragraph {
  const children = inlinesFrom(el, {});
  return new Paragraph({
    heading: extra.heading,
    children: children.length ? children : [new TextRun('')],
  });
}

function appendList(list: HTMLElement, level: number, blocks: DocxBlock[]) {
  const ordered = list.tagName === 'OL';
  Array.from(list.children).forEach(child => {
    if (!(child instanceof HTMLElement) || child.tagName !== 'LI') return;
    const flat = child.cloneNode(true) as HTMLElement;
    flat.querySelectorAll('ul, ol').forEach(nested => nested.remove());
    const children = inlinesFrom(flat, {});
    blocks.push(new Paragraph({
      bullet: ordered ? undefined : { level: Math.min(level, 8) },
      numbering: ordered ? { reference: 'opensuite-numbers', level: Math.min(level, 2) } : undefined,
      children: children.length ? children : [new TextRun('')],
    }));
    Array.from(child.children).forEach(nested => {
      if (nested instanceof HTMLElement && (nested.tagName === 'UL' || nested.tagName === 'OL')) {
        appendList(nested, level + 1, blocks);
      }
    });
  });
}

function tableFrom(table: HTMLTableElement): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: Array.from(table.rows).map(row => new TableRow({
      children: Array.from(row.cells).map(cell => {
        const fill = cssColorToHex(cell.style.backgroundColor);
        return new TableCell({
          width: { size: Math.floor(100 / Math.max(row.cells.length, 1)), type: WidthType.PERCENTAGE },
          columnSpan: cell.colSpan > 1 ? cell.colSpan : undefined,
          rowSpan: cell.rowSpan > 1 ? cell.rowSpan : undefined,
          shading: fill ? { fill } : undefined,
          borders: { top: TABLE_EDGE, bottom: TABLE_EDGE, left: TABLE_EDGE, right: TABLE_EDGE },
          children: [new Paragraph({ children: inlinesFrom(cell, cell.tagName === 'TH' ? { bold: true } : {}) })],
        });
      }),
    })),
  });
}

function parsedHolder(): HTMLElement {
  return document.createElement('span');
}

function appendBlocks(node: Node, blocks: DocxBlock[]) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent || '').replace(/\u00a0/g, ' ');
    if (text.trim()) blocks.push(new Paragraph({ children: [new TextRun(text)] }));
    return;
  }
  if (!(node instanceof HTMLElement)) return;
  const tag = node.tagName;
  if (node.classList.contains('os-page-break') || node.style.pageBreakAfter === 'always') {
    blocks.push(new Paragraph({ pageBreakBefore: true, children: [new TextRun('')] }));
    return;
  }
  if (node.classList.contains('os-section-break')) {
    blocks.push(new Paragraph({ pageBreakBefore: true, children: [new TextRun({ text: 'Section break', italics: true, color: '6B7280' })] }));
    return;
  }
  if (tag === 'TABLE') {
    blocks.push(tableFrom(node as HTMLTableElement));
    return;
  }
  if (tag === 'UL' || tag === 'OL') {
    appendList(node, 0, blocks);
    return;
  }
  if (HEADING_LEVELS[tag]) {
    blocks.push(paragraphFrom(node, { heading: HEADING_LEVELS[tag] }));
    return;
  }
  if (tag === 'P' || tag === 'BLOCKQUOTE' || tag === 'PRE' || tag === 'FIGCAPTION') {
    blocks.push(paragraphFrom(node));
    return;
  }
  if (tag === 'HR') {
    blocks.push(new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: 'E5E7EB', space: 1 } },
      children: [new TextRun('')],
    }));
    return;
  }
  if (tag === 'SVG') {
    blocks.push(new Paragraph({ children: [new TextRun({ text: '[Chart]', italics: true })] }));
    return;
  }
  if (tag === 'IMG') {
    const holder = parsedHolder();
    holder.appendChild(node.cloneNode(true));
    blocks.push(new Paragraph({ children: inlinesFrom(holder, {}) }));
    return;
  }
  const blockChildren = Array.from(node.children).some(child => /^(P|H[1-6]|UL|OL|TABLE|DIV|BLOCKQUOTE|PRE|HR|SECTION)$/.test(child.tagName));
  if (blockChildren || tag === 'DIV' || tag === 'SECTION' || tag === 'ARTICLE') {
    if (!blockChildren && (node.textContent || '').trim()) {
      blocks.push(paragraphFrom(node));
      return;
    }
    node.childNodes.forEach(child => appendBlocks(child, blocks));
    return;
  }
  if ((node.textContent || '').trim()) blocks.push(paragraphFrom(node));
}

export async function exportDocx(htmlContent: string, filename: string): Promise<void> {
  const { html, meta } = splitDocument(htmlContent);
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const blocks: DocxBlock[] = [];
  parsed.body.childNodes.forEach(node => appendBlocks(node, blocks));
  if (blocks.length === 0) blocks.push(new Paragraph({ children: [new TextRun('')] }));

  const page = pageDimensions(meta.pageSetup);
  const pxToTwip = (px: number) => Math.round(px * 15);
  const headerChildren = meta.headerText
    ? [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun(meta.headerText)] })]
    : [new Paragraph({ children: [new TextRun('')] })];
  const footerChildren: TextRun[] = [];
  if (meta.footerText) footerChildren.push(new TextRun(`${meta.footerText}  `));
  if (meta.showPageNumbers) {
    footerChildren.push(new TextRun('Page '));
    footerChildren.push(new TextRun({ children: [PageNumber.CURRENT] }));
    footerChildren.push(new TextRun(' of '));
    footerChildren.push(new TextRun({ children: [PageNumber.TOTAL_PAGES] }));
  }
  if (footerChildren.length === 0) footerChildren.push(new TextRun(''));

  const docx = new Document({
    title: meta.properties.title || undefined,
    creator: meta.properties.author || undefined,
    description: meta.properties.subject || undefined,
    keywords: meta.properties.keywords || undefined,
    numbering: {
      config: [{
        reference: 'opensuite-numbers',
        levels: [0, 1, 2].map(level => ({
          level,
          format: LevelFormat.DECIMAL,
          text: `%${level + 1}.`,
          alignment: AlignmentType.LEFT,
        })),
      }],
    },
    sections: [{
      properties: {
        page: {
          size: {
            width: pxToTwip(page.width),
            height: pxToTwip(page.height),
            orientation: meta.pageSetup.orientation === 'landscape' ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
          },
          margin: {
            top: pxToTwip(meta.pageSetup.margins.top),
            right: pxToTwip(meta.pageSetup.margins.right),
            bottom: pxToTwip(meta.pageSetup.margins.bottom),
            left: pxToTwip(meta.pageSetup.margins.left),
          },
        },
      },
      headers: { default: new Header({ children: headerChildren }) },
      footers: {
        default: new Footer({
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: footerChildren })],
        }),
      },
      children: blocks,
    }],
  });

  const blob = await Packer.toBlob(docx);
  saveAs(blob, filename.endsWith('.docx') ? filename : filename.replace(/\.\w+$/, '.docx'));
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
