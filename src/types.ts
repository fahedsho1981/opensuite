export type FileType = 'docx' | 'xlsx' | 'pptx' | 'md' | 'pdf' | 'doc' | 'xls' | 'ppt';

export interface OfficeFile {
  id: string;
  name: string;
  type: FileType;
  content: any;
  lastModified: Date;
  size: number;
}

export interface SpreadsheetCell {
  value: string;
  formula?: string;
  style?: CellStyle;
  format?: CellFormat;
  comment?: string;
}

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  backgroundColor?: string;
  color?: string;
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  fontSize?: number;
  fontFamily?: string;
  wrapText?: boolean;
  borders?: CellBorders;
}

export interface CellBorders {
  top?: BorderStyle;
  bottom?: BorderStyle;
  left?: BorderStyle;
  right?: BorderStyle;
}

export interface BorderStyle {
  style: 'solid' | 'dashed' | 'dotted' | 'double' | 'none';
  color?: string;
  width?: string;
}

export type CellFormat = 'general' | 'number' | 'currency' | 'percent' | 'date' | 'text';

export interface Sheet {
  id: string;
  name: string;
  cells: SpreadsheetCell[][];
  colWidths: number[];
  rowHeights: number[];
  frozenRows?: number;
  frozenCols?: number;
}

export interface Slide {
  id: string;
  title: string;
  content: string;
  background: string;
  notes: string;
}

export type EditorMode = 'edit' | 'view';

export interface AppState {
  files: OfficeFile[];
  activeFile: OfficeFile | null;
  sidebarOpen: boolean;
  editorMode: EditorMode;
}
