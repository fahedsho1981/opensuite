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
}

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  backgroundColor?: string;
  color?: string;
  align?: 'left' | 'center' | 'right';
  fontSize?: number;
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
