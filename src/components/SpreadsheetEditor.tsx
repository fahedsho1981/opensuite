import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Download, Plus, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Undo, Redo, Search, Trash2, Copy, Scissors, Clipboard,
  ArrowUpAZ, ArrowDownZA, Filter, Merge, Split, WrapText,
  DollarSign, Percent, Hash, Calendar, Type, Palette,
  ChevronDown, X, Minus, Grid3x3, Eraser,
  FileDown, Printer, ZoomIn, ZoomOut, Eye, EyeOff,
  Square, Grid2x2, Columns, Rows, PaintBucket,
  Table2, TrendingUp, BarChart3, PieChart,
  Lock, Unlock, MessageSquare, Link2, Image,
  ArrowUpDown, ChevronsUpDown, ListFilter, Paintbrush,
  FileText, Save, Home, TableProperties, Settings2
} from 'lucide-react';
import { exportXlsx } from '../utils/fileHandlers';
import type { SpreadsheetCell, CellStyle, CellBorders, CellFormat, Sheet } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface SpreadsheetEditorProps {
  content: SpreadsheetCell[][];
  onChange: (content: SpreadsheetCell[][]) => void;
  fileName: string;
  readOnly?: boolean;
}

// Helper functions
function getColName(index: number): string {
  let name = '';
  let n = index;
  while (n >= 0) {
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26) - 1;
  }
  return name;
}

function parseCellRef(ref: string): { col: number; row: number } | null {
  const match = ref.match(/^([A-Z]+)(\d+)$/i);
  if (!match) return null;
  const col = match[1].toUpperCase().charCodeAt(0) - 65;
  const row = parseInt(match[2]) - 1;
  return { col, row };
}

function formatCellValue(value: string, format: CellFormat = 'general'): string {
  if (!value || value.startsWith('=')) return value;
  const num = parseFloat(value);
  if (isNaN(num)) return value;

  switch (format) {
    case 'currency':
      return '$' + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    case 'percent':
      return (num * 100).toFixed(2) + '%';
    case 'number':
      return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    case 'date':
      try {
        const d = new Date(value);
        return isNaN(d.getTime()) ? value : d.toLocaleDateString();
      } catch { return value; }
    default:
      return value;
  }
}

function evaluateFormula(formula: string, cells: SpreadsheetCell[][]): string {
  if (!formula.startsWith('=')) return formula;
  const expr = formula.substring(1).toUpperCase();

  // Handle functions
  const funcMatch = expr.match(/^(SUM|AVERAGE|AVG|COUNT|COUNTA|MIN|MAX|IF|CONCAT|ABS|ROUND|SQRT|POWER)\((.+)\)$/i);
  if (funcMatch) {
    const [, func, args] = funcMatch;
    
    // Range expansion
    const expandRange = (range: string): number[] => {
      const rangeMatch = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
      if (!rangeMatch) {
        const num = parseFloat(range);
        return isNaN(num) ? [] : [num];
      }
      const [, sc, sr, ec, er] = rangeMatch;
      const startCol = sc.charCodeAt(0) - 65;
      const startRow = parseInt(sr) - 1;
      const endCol = ec.charCodeAt(0) - 65;
      const endRow = parseInt(er) - 1;
      const values: number[] = [];
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          const val = parseFloat(cells[r]?.[c]?.value || '0');
          if (!isNaN(val)) values.push(val);
        }
      }
      return values;
    };

    const argParts = args.split(',').map(s => s.trim());
    
    switch (func.toUpperCase()) {
      case 'SUM': return expandRange(args).reduce((a, b) => a + b, 0).toString();
      case 'AVERAGE':
      case 'AVG': {
        const v = expandRange(args);
        return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : '0';
      }
      case 'COUNT': return expandRange(args).length.toString();
      case 'COUNTA': {
        let count = 0;
        const rangeMatch = args.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
        if (rangeMatch) {
          const [, sc, sr, ec, er] = rangeMatch;
          for (let r = parseInt(sr) - 1; r <= parseInt(er) - 1; r++) {
            for (let c = sc.charCodeAt(0) - 65; c <= ec.charCodeAt(0) - 65; c++) {
              if (cells[r]?.[c]?.value) count++;
            }
          }
        }
        return count.toString();
      }
      case 'MIN': { const v = expandRange(args); return v.length ? Math.min(...v).toString() : '0'; }
      case 'MAX': { const v = expandRange(args); return v.length ? Math.max(...v).toString() : '0'; }
      case 'ABS': return Math.abs(parseFloat(argParts[0]) || 0).toString();
      case 'ROUND': return (Math.round((parseFloat(argParts[0]) || 0) * Math.pow(10, parseInt(argParts[1]) || 0)) / Math.pow(10, parseInt(argParts[1]) || 0)).toString();
      case 'SQRT': return Math.sqrt(parseFloat(argParts[0]) || 0).toString();
      case 'POWER': return Math.pow(parseFloat(argParts[0]) || 0, parseFloat(argParts[1]) || 0).toString();
      case 'CONCAT': return argParts.map(a => {
        const ref = parseCellRef(a);
        return ref ? (cells[ref.row]?.[ref.col]?.value || '') : a.replace(/['"]/g, '');
      }).join('');
      case 'IF': {
        const cond = argParts[0];
        const trueVal = argParts[1];
        const falseVal = argParts[2] || '';
        try {
          const resolved = cond.replace(/([A-Z]+\d+)/g, (m) => {
            const ref = parseCellRef(m);
            return ref ? (cells[ref.row]?.[ref.col]?.value || '0') : m;
          });
          const result = new Function(`return ${resolved}`)();
          return result ? trueVal.replace(/['"]/g, '') : falseVal.replace(/['"]/g, '');
        } catch { return '#ERROR'; }
      }
    }
  }

  // Simple cell reference replacement
  let resolved = expr.replace(/([A-Z]+\d+)/g, (match) => {
    const ref = parseCellRef(match);
    if (ref) {
      const val = cells[ref.row]?.[ref.col]?.value || '0';
      return isNaN(parseFloat(val)) ? '0' : val;
    }
    return match;
  });

  try {
    const result = new Function(`return ${resolved}`)();
    return typeof result === 'number' ? (Number.isInteger(result) ? result.toString() : result.toFixed(2)) : String(result);
  } catch {
    return '#ERROR';
  }
}

type TabType = 'home' | 'insert' | 'formulas' | 'data' | 'view';
type ModalType = 'none' | 'findReplace' | 'formatCells' | 'insertFunction' | 'conditionalFormat' | 'sortFilter' | 'insertChart' | 'cellComment' | 'pageSetup';

export default function SpreadsheetEditor({ content, onChange, fileName, readOnly = false }: SpreadsheetEditorProps) {
  const [sheets, setSheets] = useState<Sheet[]>(() => [{
    id: uuidv4(),
    name: 'Sheet1',
    cells: content,
    colWidths: Array(26).fill(100),
    rowHeights: Array(content.length).fill(24),
  }]);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ start: { row: number; col: number }; end: { row: number; col: number } } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [modal, setModal] = useState<ModalType>('none');
  const [zoom, setZoom] = useState(100);
  const [showGridlines, setShowGridlines] = useState(true);
  const [showFormulaBar, setShowFormulaBar] = useState(true);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [findMatches, setFindMatches] = useState<Array<{ row: number; col: number }>>([]);
  const [findIdx, setFindIdx] = useState(0);
  const [clipboard, setClipboard] = useState<{ cells: SpreadsheetCell[][]; range: { rows: number; cols: number } } | null>(null);
  const [history, setHistory] = useState<SpreadsheetCell[][][]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [commentText, setCommentText] = useState('');
  const [showTextColor, setShowTextColor] = useState(false);
  const [showBgColor, setShowBgColor] = useState(false);
  const [showBorders, setShowBorders] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeStart, setMergeStart] = useState<{ row: number; col: number } | null>(null);
  const [mergedCells, setMergedCells] = useState<Array<{ startRow: number; startCol: number; endRow: number; endCol: number }>>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const formulaBarRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const activeSheet = sheets[activeSheetIdx];
  const cells = activeSheet.cells;
  const numCols = cells[0]?.length || 26;
  const numRows = cells.length;

  // Stats
  const stats = useMemo(() => {
    if (!selectionRange) return { sum: 0, avg: 0, count: 0, numCount: 0 };
    const { start, end } = selectionRange;
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    
    const values: number[] = [];
    let count = 0;
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const val = cells[r]?.[c]?.value;
        if (val) {
          count++;
          const num = parseFloat(val);
          if (!isNaN(num)) values.push(num);
        }
      }
    }
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      sum,
      avg: values.length ? sum / values.length : 0,
      count,
      numCount: values.length,
    };
  }, [selectionRange, cells]);

  // History management
  const pushHistory = useCallback((newCells: SpreadsheetCell[][]) => {
    setHistory(prev => [...prev.slice(0, historyIdx + 1), newCells]);
    setHistoryIdx(prev => prev + 1);
  }, [historyIdx]);

  const undo = () => {
    if (historyIdx > 0) {
      const prevCells = history[historyIdx - 1];
      updateCells(prevCells, false);
      setHistoryIdx(historyIdx - 1);
    }
  };

  const redo = () => {
    if (historyIdx < history.length - 1) {
      const nextCells = history[historyIdx + 1];
      updateCells(nextCells, false);
      setHistoryIdx(historyIdx + 1);
    }
  };

  const updateCells = (newCells: SpreadsheetCell[][], addToHistory = true) => {
    const newSheets = sheets.map((s, i) => i === activeSheetIdx ? { ...s, cells: newCells } : s);
    setSheets(newSheets);
    onChange(newCells);
    if (addToHistory) pushHistory(newCells);
  };

  // Cell operations
  const updateCell = useCallback((row: number, col: number, updates: Partial<SpreadsheetCell>) => {
    const newCells = cells.map(r => r.map(c => ({ ...c, style: { ...c.style } })));
    newCells[row][col] = { ...newCells[row][col], ...updates };
    updateCells(newCells);
  }, [cells]);

  const updateSelectedCellsStyle = (styleUpdates: Partial<CellStyle>) => {
    if (!selectionRange) return;
    const { start, end } = selectionRange;
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);

    const newCells = cells.map(r => r.map(c => ({ ...c, style: { ...c.style } })));
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        newCells[r][c].style = { ...newCells[r][c].style, ...styleUpdates };
      }
    }
    updateCells(newCells);
  };

  const handleCellClick = (row: number, col: number, e?: React.MouseEvent) => {
    if (readOnly) return;
    if (mergeMode) {
      if (!mergeStart) {
        setMergeStart({ row, col });
      } else {
        const startRow = Math.min(mergeStart.row, row);
        const endRow = Math.max(mergeStart.row, row);
        const startCol = Math.min(mergeStart.col, col);
        const endCol = Math.max(mergeStart.col, col);
        if (startRow !== endRow || startCol !== endCol) {
          setMergedCells([...mergedCells, { startRow, startCol, endRow, endCol }]);
        }
        setMergeMode(false);
        setMergeStart(null);
      }
      return;
    }
    
    setSelectedCell({ row, col });
    setEditingCell(null);
    setEditValue(cells[row][col].value);
    
    if (e?.shiftKey && selectedCell) {
      setSelectionRange({ start: selectedCell, end: { row, col } });
    } else {
      setSelectionRange({ start: { row, col }, end: { row, col } });
    }
  };

  const handleCellDoubleClick = (row: number, col: number) => {
    if (readOnly) return;
    setEditingCell({ row, col });
    setEditValue(cells[row][col].value);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleCellEdit = (row: number, col: number, value: string) => {
    updateCell(row, col, { value });
    setEditingCell(null);
  };

  const handleMouseDown = (row: number, col: number, e: React.MouseEvent) => {
    if (readOnly || mergeMode) return;
    setIsSelecting(true);
    setSelectionRange({ start: { row, col }, end: { row, col } });
    setSelectedCell({ row, col });
  };

  const handleMouseEnter = (row: number, col: number) => {
    if (isSelecting && selectedCell) {
      setSelectionRange({ start: selectedCell, end: { row, col } });
    }
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent, row: number, col: number) => {
    if (e.key === 'Enter') {
      handleCellEdit(row, col, editValue);
      setSelectedCell({ row: Math.min(row + 1, numRows - 1), col });
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleCellEdit(row, col, editValue);
      setSelectedCell({ row, col: Math.min(col + 1, numCols - 1) });
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (selectionRange) {
        const { start, end } = selectionRange;
        const minRow = Math.min(start.row, end.row);
        const maxRow = Math.max(start.row, end.row);
        const minCol = Math.min(start.col, end.col);
        const maxCol = Math.max(start.col, end.col);
        const newCells = cells.map(r => r.map(c => ({ ...c })));
        for (let r = minRow; r <= maxRow; r++) {
          for (let c = minCol; c <= maxCol; c++) {
            newCells[r][c] = { ...newCells[r][c], value: '' };
          }
        }
        updateCells(newCells);
      }
    }
  };

  // Clipboard operations
  const copyCells = () => {
    if (!selectionRange) return;
    const { start, end } = selectionRange;
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    
    const copied: SpreadsheetCell[][] = [];
    for (let r = minRow; r <= maxRow; r++) {
      copied.push(cells[r].slice(minCol, maxCol + 1).map(c => ({ ...c, style: { ...c.style } })));
    }
    setClipboard({ cells: copied, range: { rows: maxRow - minRow + 1, cols: maxCol - minCol + 1 } });
  };

  const cutCells = () => {
    copyCells();
    if (!selectionRange) return;
    const { start, end } = selectionRange;
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    const newCells = cells.map(r => r.map(c => ({ ...c })));
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        newCells[r][c] = { ...newCells[r][c], value: '' };
      }
    }
    updateCells(newCells);
  };

  const pasteCells = () => {
    if (!clipboard || !selectedCell) return;
    const newCells = cells.map(r => r.map(c => ({ ...c, style: { ...c.style } })));
    for (let r = 0; r < clipboard.range.rows; r++) {
      for (let c = 0; c < clipboard.range.cols; c++) {
        const targetRow = selectedCell.row + r;
        const targetCol = selectedCell.col + c;
        if (targetRow < numRows && targetCol < numCols) {
          newCells[targetRow][targetCol] = { 
            ...newCells[targetRow][targetCol], 
            ...clipboard.cells[r][c],
            style: { ...newCells[targetRow][targetCol].style, ...clipboard.cells[r][c].style }
          };
        }
      }
    }
    updateCells(newCells);
  };

  // Row/Column operations
  const insertRow = (above: boolean = true) => {
    if (!selectedCell) return;
    const newRow: SpreadsheetCell[] = Array(numCols).fill(null).map(() => ({ value: '' }));
    const newCells = [...cells];
    newCells.splice(selectedCell.row + (above ? 0 : 1), 0, newRow);
    updateCells(newCells);
  };

  const insertCol = (before: boolean = true) => {
    if (!selectedCell) return;
    const newCells = cells.map(row => {
      const newRow = [...row];
      newRow.splice(selectedCell.col + (before ? 0 : 1), 0, { value: '' });
      return newRow;
    });
    updateCells(newCells);
  };

  const deleteRow = () => {
    if (!selectedCell || cells.length <= 1) return;
    const newCells = cells.filter((_, i) => i !== selectedCell.row);
    updateCells(newCells);
  };

  const deleteCol = () => {
    if (!selectedCell || numCols <= 1) return;
    const newCells = cells.map(row => row.filter((_, i) => i !== selectedCell.col));
    updateCells(newCells);
  };

  // Sorting
  const sortColumn = (ascending: boolean) => {
    if (!selectedCell) return;
    const col = selectedCell.col;
    const newCells = [...cells].sort((a, b) => {
      const va = a[col]?.value || '';
      const vb = b[col]?.value || '';
      const na = parseFloat(va);
      const nb = parseFloat(vb);
      if (!isNaN(na) && !isNaN(nb)) {
        return ascending ? na - nb : nb - na;
      }
      return ascending ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    updateCells(newCells);
  };

  // Find & Replace
  const handleFind = () => {
    if (!findText) return;
    const matches: Array<{ row: number; col: number }> = [];
    cells.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell.value.toLowerCase().includes(findText.toLowerCase())) {
          matches.push({ row: r, col: c });
        }
      });
    });
    setFindMatches(matches);
    setFindIdx(0);
    if (matches.length > 0) {
      setSelectedCell(matches[0]);
      setSelectionRange({ start: matches[0], end: matches[0] });
    }
  };

  const navigateFind = (direction: 'next' | 'prev') => {
    if (findMatches.length === 0) return;
    const newIdx = direction === 'next' 
      ? (findIdx + 1) % findMatches.length
      : (findIdx - 1 + findMatches.length) % findMatches.length;
    setFindIdx(newIdx);
    setSelectedCell(findMatches[newIdx]);
    setSelectionRange({ start: findMatches[newIdx], end: findMatches[newIdx] });
  };

  const handleReplace = (all: boolean = false) => {
    if (!findText) return;
    if (all) {
      const newCells = cells.map(row => row.map(cell => ({
        ...cell,
        value: cell.value.replace(new RegExp(findText, 'gi'), replaceText)
      })));
      updateCells(newCells);
      handleFind();
    } else if (selectedCell) {
      const cell = cells[selectedCell.row][selectedCell.col];
      if (cell.value.toLowerCase().includes(findText.toLowerCase())) {
        updateCell(selectedCell.row, selectedCell.col, {
          value: cell.value.replace(new RegExp(findText, 'i'), replaceText)
        });
      }
      navigateFind('next');
    }
  };

  // Borders
  const applyBorders = (borderType: 'all' | 'outside' | 'inside' | 'none' | 'top' | 'bottom' | 'left' | 'right') => {
    if (!selectionRange) return;
    const { start, end } = selectionRange;
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);

    const border: any = { style: 'solid', color: '#000000', width: '1px' };
    const noBorder: any = { style: 'none' };

    const newCells = cells.map(r => r.map(c => ({ ...c, style: { ...c.style, borders: { ...c.style?.borders } } })));
    
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const cell = newCells[r][c];
        cell.style.borders = cell.style.borders || {};
        
        switch (borderType) {
          case 'all':
            cell.style.borders = { top: border, bottom: border, left: border, right: border };
            break;
          case 'outside':
            if (r === minRow) cell.style.borders.top = border;
            if (r === maxRow) cell.style.borders.bottom = border;
            if (c === minCol) cell.style.borders.left = border;
            if (c === maxCol) cell.style.borders.right = border;
            break;
          case 'inside':
            if (r !== minRow) cell.style.borders.top = border;
            if (r !== maxRow) cell.style.borders.bottom = border;
            if (c !== minCol) cell.style.borders.left = border;
            if (c !== maxCol) cell.style.borders.right = border;
            break;
          case 'none':
            cell.style.borders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
            break;
          case 'top': cell.style.borders.top = border; break;
          case 'bottom': cell.style.borders.bottom = border; break;
          case 'left': cell.style.borders.left = border; break;
          case 'right': cell.style.borders.right = border; break;
        }
      }
    }
    updateCells(newCells);
    setShowBorders(false);
  };

  // Format cells
  const applyFormat = (format: CellFormat) => {
    if (!selectionRange) return;
    const { start, end } = selectionRange;
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);

    const newCells = cells.map(r => r.map(c => ({ ...c })));
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        newCells[r][c].format = format;
      }
    }
    updateCells(newCells);
  };

  // Export
  const handleExport = () => {
    exportXlsx(cells, fileName);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey)) {
        switch (e.key.toLowerCase()) {
          case 'c': if (selectedCell) { e.preventDefault(); copyCells(); } break;
          case 'x': if (selectedCell) { e.preventDefault(); cutCells(); } break;
          case 'v': if (selectedCell) { e.preventDefault(); pasteCells(); } break;
          case 'z': e.preventDefault(); undo(); break;
          case 'y': e.preventDefault(); redo(); break;
          case 'b': e.preventDefault(); updateSelectedCellsStyle({ bold: !cells[selectedCell!.row][selectedCell!.col].style?.bold }); break;
          case 'i': e.preventDefault(); updateSelectedCellsStyle({ italic: !cells[selectedCell!.row][selectedCell!.col].style?.italic }); break;
          case 'u': e.preventDefault(); updateSelectedCellsStyle({ underline: !cells[selectedCell!.row][selectedCell!.col].style?.underline }); break;
          case 'f': e.preventDefault(); setModal('findReplace'); break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, cells, selectionRange, historyIdx]);

  const getDisplayValue = (cell: SpreadsheetCell): string => {
    if (cell.value.startsWith('=')) {
      return evaluateFormula(cell.value, cells);
    }
    return formatCellValue(cell.value, cell.format);
  };

  const isInSelection = (row: number, col: number): boolean => {
    if (!selectionRange) return false;
    const { start, end } = selectionRange;
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
  };

  const isFindMatch = (row: number, col: number): boolean => {
    return findMatches.some(m => m.row === row && m.col === col);
  };

  const colors = [
    '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#ffffff',
    '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff',
    '#9900ff', '#ff00ff', '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3',
    '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc', '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599',
    '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd', '#cc4125', '#e06666',
  ];

  const ToolbarButton = ({ icon: Icon, action, title, active = false, disabled = false }: any) => (
    <button
      onClick={action}
      disabled={disabled || readOnly}
      title={title}
      className={`p-1.5 rounded transition-colors disabled:opacity-50 ${
        active
          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  const ToolbarDivider = () => <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1 self-center" />;

  const selectedCellStyle = selectedCell ? cells[selectedCell.row]?.[selectedCell.col]?.style || {} : {};

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Menu Bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-2 py-1 flex items-center gap-1 text-sm">
        <button className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 flex items-center gap-1">
          <FileText className="w-3.5 h-3.5" /> File
        </button>
        <button onClick={() => setActiveTab('home')} className={`px-2 py-1 rounded ${activeTab === 'home' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
          Home
        </button>
        <button onClick={() => setActiveTab('insert')} className={`px-2 py-1 rounded ${activeTab === 'insert' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
          Insert
        </button>
        <button onClick={() => setActiveTab('formulas')} className={`px-2 py-1 rounded ${activeTab === 'formulas' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
          Formulas
        </button>
        <button onClick={() => setActiveTab('data')} className={`px-2 py-1 rounded ${activeTab === 'data' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
          Data
        </button>
        <button onClick={() => setActiveTab('view')} className={`px-2 py-1 rounded ${activeTab === 'view' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
          View
        </button>
        <div className="flex-1" />
        <button onClick={() => setModal('findReplace')} title="Find & Replace (Ctrl+F)" className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
          <Search className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
        <button onClick={handleExport} title="Export XLSX" className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
          <FileDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Ribbon Toolbar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-2 py-1.5">
        {activeTab === 'home' && (
          <div className="flex items-center gap-0.5 flex-wrap">
            {/* Clipboard */}
            <div className="flex flex-col items-center px-1">
              <div className="flex gap-0.5">
                <ToolbarButton icon={Clipboard} action={pasteCells} title="Paste (Ctrl+V)" />
                <ToolbarButton icon={Scissors} action={cutCells} title="Cut (Ctrl+X)" />
                <ToolbarButton icon={Copy} action={copyCells} title="Copy (Ctrl+C)" />
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5">Clipboard</span>
            </div>
            <ToolbarDivider />

            {/* Undo/Redo */}
            <div className="flex flex-col items-center px-1">
              <div className="flex gap-0.5">
                <ToolbarButton icon={Undo} action={undo} title="Undo (Ctrl+Z)" />
                <ToolbarButton icon={Redo} action={redo} title="Redo (Ctrl+Y)" />
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5">Undo</span>
            </div>
            <ToolbarDivider />

            {/* Font */}
            <div className="flex flex-col items-center px-1">
              <div className="flex gap-1 items-center">
                <select
                  value={selectedCellStyle.fontFamily || 'Arial'}
                  onChange={(e) => updateSelectedCellsStyle({ fontFamily: e.target.value })}
                  className="text-xs border border-gray-200 dark:border-gray-700 rounded px-1 py-1 bg-white dark:bg-gray-900 w-28"
                >
                  {['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Calibri', 'Cambria'].map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <select
                  value={selectedCellStyle.fontSize || 11}
                  onChange={(e) => updateSelectedCellsStyle({ fontSize: parseInt(e.target.value) })}
                  className="text-xs border border-gray-200 dark:border-gray-700 rounded px-1 py-1 bg-white dark:bg-gray-900 w-14"
                >
                  {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <ToolbarButton icon={Bold} action={() => updateSelectedCellsStyle({ bold: !selectedCellStyle.bold })} title="Bold (Ctrl+B)" active={selectedCellStyle.bold} />
                <ToolbarButton icon={Italic} action={() => updateSelectedCellsStyle({ italic: !selectedCellStyle.italic })} title="Italic (Ctrl+I)" active={selectedCellStyle.italic} />
                <ToolbarButton icon={Underline} action={() => updateSelectedCellsStyle({ underline: !selectedCellStyle.underline })} title="Underline (Ctrl+U)" active={selectedCellStyle.underline} />
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5">Font</span>
            </div>
            <ToolbarDivider />

            {/* Colors */}
            <div className="flex flex-col items-center px-1">
              <div className="flex gap-0.5 relative">
                <div className="relative" data-dropdown>
                  <button
                    onClick={() => { setShowTextColor(!showTextColor); setShowBgColor(false); }}
                    title="Text Color"
                    className="flex flex-col items-center p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <span className="text-sm font-bold" style={{ color: selectedCellStyle.color || '#000' }}>A</span>
                    <div className="w-4 h-0.5" style={{ backgroundColor: selectedCellStyle.color || '#000' }}></div>
                  </button>
                  {showTextColor && (
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 p-2 w-56">
                      <div className="grid grid-cols-8 gap-0.5">
                        {colors.map(c => (
                          <button key={c} onClick={() => { updateSelectedCellsStyle({ color: c }); setShowTextColor(false); }}
                            className="w-6 h-6 rounded border border-gray-200 dark:border-gray-700 hover:scale-110 transition-transform"
                            style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="relative" data-dropdown>
                  <button
                    onClick={() => { setShowBgColor(!showBgColor); setShowTextColor(false); }}
                    title="Fill Color"
                    className="flex flex-col items-center p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <PaintBucket className="w-4 h-4" style={{ color: selectedCellStyle.backgroundColor || '#ffff00' }} />
                  </button>
                  {showBgColor && (
                    <div className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 p-2 w-56">
                      <div className="grid grid-cols-8 gap-0.5">
                        {colors.map(c => (
                          <button key={c} onClick={() => { updateSelectedCellsStyle({ backgroundColor: c }); setShowBgColor(false); }}
                            className="w-6 h-6 rounded border border-gray-200 dark:border-gray-700 hover:scale-110 transition-transform"
                            style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5">Colors</span>
            </div>
            <ToolbarDivider />

            {/* Borders */}
            <div className="flex flex-col items-center px-1 relative">
              <div className="relative">
                <button
                  onClick={() => setShowBorders(!showBorders)}
                  title="Borders"
                  className="flex items-center gap-0.5 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Grid3x3 className="w-4 h-4" />
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showBorders && (
                  <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1 w-40">
                    <button onClick={() => applyBorders('all')} className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm flex items-center gap-2">
                      <Grid3x3 className="w-4 h-4" /> All Borders
                    </button>
                    <button onClick={() => applyBorders('outside')} className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm flex items-center gap-2">
                      <Square className="w-4 h-4" /> Outside Borders
                    </button>
                    <button onClick={() => applyBorders('inside')} className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm flex items-center gap-2">
                      <Grid3x3 className="w-4 h-4" /> Inside Borders
                    </button>
                    <button onClick={() => applyBorders('top')} className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm">Top Border</button>
                    <button onClick={() => applyBorders('bottom')} className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm">Bottom Border</button>
                    <button onClick={() => applyBorders('left')} className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm">Left Border</button>
                    <button onClick={() => applyBorders('right')} className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm">Right Border</button>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                    <button onClick={() => applyBorders('none')} className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm flex items-center gap-2">
                      <Eraser className="w-4 h-4" /> No Border
                    </button>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5">Borders</span>
            </div>
            <ToolbarDivider />

            {/* Alignment */}
            <div className="flex flex-col items-center px-1">
              <div className="flex gap-0.5">
                <ToolbarButton icon={AlignLeft} action={() => updateSelectedCellsStyle({ align: 'left' })} title="Align Left" active={selectedCellStyle.align === 'left'} />
                <ToolbarButton icon={AlignCenter} action={() => updateSelectedCellsStyle({ align: 'center' })} title="Align Center" active={selectedCellStyle.align === 'center'} />
                <ToolbarButton icon={AlignRight} action={() => updateSelectedCellsStyle({ align: 'right' })} title="Align Right" active={selectedCellStyle.align === 'right'} />
                <ToolbarDivider />
                <ToolbarButton icon={WrapText} action={() => updateSelectedCellsStyle({ wrapText: !selectedCellStyle.wrapText })} title="Wrap Text" active={selectedCellStyle.wrapText} />
                <ToolbarButton icon={Merge} action={() => setMergeMode(!mergeMode)} title="Merge Cells" active={mergeMode} />
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5">Alignment</span>
            </div>
            <ToolbarDivider />

            {/* Number Format */}
            <div className="flex flex-col items-center px-1">
              <div className="flex gap-0.5">
                <select
                  onChange={(e) => applyFormat(e.target.value as CellFormat)}
                  defaultValue="general"
                  className="text-xs border border-gray-200 dark:border-gray-700 rounded px-1 py-1 bg-white dark:bg-gray-900 w-24"
                  title="Number Format"
                >
                  <option value="general">General</option>
                  <option value="number">Number</option>
                  <option value="currency">Currency</option>
                  <option value="percent">Percent</option>
                  <option value="date">Date</option>
                  <option value="text">Text</option>
                </select>
                <ToolbarButton icon={DollarSign} action={() => applyFormat('currency')} title="Currency" />
                <ToolbarButton icon={Percent} action={() => applyFormat('percent')} title="Percent" />
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5">Number</span>
            </div>
            <ToolbarDivider />

            {/* Cells */}
            <div className="flex flex-col items-center px-1">
              <div className="flex gap-0.5">
                <button onClick={() => insertRow(true)} title="Insert Row Above" className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-xs">
                  <Rows className="w-4 h-4" />+
                </button>
                <button onClick={() => insertCol(true)} title="Insert Column Before" className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-xs">
                  <Columns className="w-4 h-4" />+
                </button>
                <ToolbarButton icon={Trash2} action={deleteRow} title="Delete Row" />
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5">Cells</span>
            </div>
          </div>
        )}

        {activeTab === 'insert' && (
          <div className="flex items-center gap-0.5 flex-wrap">
            <button onClick={() => setModal('insertFunction')} className="flex flex-col items-center px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              <Hash className="w-5 h-5 text-blue-500" />
              <span className="text-[10px] text-gray-500 mt-0.5">Function</span>
            </button>
            <button onClick={() => setModal('insertChart')} className="flex flex-col items-center px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              <BarChart3 className="w-5 h-5 text-green-500" />
              <span className="text-[10px] text-gray-500 mt-0.5">Chart</span>
            </button>
            <button className="flex flex-col items-center px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              <Table2 className="w-5 h-5 text-purple-500" />
              <span className="text-[10px] text-gray-500 mt-0.5">Table</span>
            </button>
            <button className="flex flex-col items-center px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              <Image className="w-5 h-5 text-orange-500" />
              <span className="text-[10px] text-gray-500 mt-0.5">Picture</span>
            </button>
            <button className="flex flex-col items-center px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              <Link2 className="w-5 h-5 text-blue-500" />
              <span className="text-[10px] text-gray-500 mt-0.5">Link</span>
            </button>
            <button onClick={() => setModal('cellComment')} className="flex flex-col items-center px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              <MessageSquare className="w-5 h-5 text-yellow-500" />
              <span className="text-[10px] text-gray-500 mt-0.5">Comment</span>
            </button>
          </div>
        )}

        {activeTab === 'formulas' && (
          <div className="flex items-center gap-0.5 flex-wrap">
            <button onClick={() => setModal('insertFunction')} className="flex items-center gap-1 px-3 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-sm">
              <Hash className="w-4 h-4" /> Insert Function
            </button>
            <ToolbarDivider />
            <div className="flex flex-wrap gap-1">
              {['SUM', 'AVERAGE', 'COUNT', 'MIN', 'MAX', 'IF', 'ROUND', 'ABS', 'SQRT'].map(fn => (
                <button
                  key={fn}
                  onClick={() => {
                    if (selectedCell) {
                      const ref = `${getColName(selectedCell.col)}${selectedCell.row + 1}`;
                      const formula = `=${fn}()`;
                      updateCell(selectedCell.row, selectedCell.col, { value: formula });
                    }
                  }}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded font-mono"
                >
                  {fn}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="flex items-center gap-0.5 flex-wrap">
            <div className="flex flex-col items-center px-2">
              <div className="flex gap-0.5">
                <ToolbarButton icon={ArrowUpAZ} action={() => sortColumn(true)} title="Sort A to Z" />
                <ToolbarButton icon={ArrowDownZA} action={() => sortColumn(false)} title="Sort Z to A" />
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5">Sort</span>
            </div>
            <ToolbarDivider />
            <div className="flex flex-col items-center px-2">
              <div className="flex gap-0.5">
                <ToolbarButton icon={Filter} action={() => setModal('sortFilter')} title="Filter" />
                <ToolbarButton icon={ListFilter} action={() => setModal('sortFilter')} title="Advanced Filter" />
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5">Filter</span>
            </div>
            <ToolbarDivider />
            <button onClick={() => setModal('findReplace')} className="flex items-center gap-1 px-3 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-sm">
              <Search className="w-4 h-4" /> Find & Replace
            </button>
          </div>
        )}

        {activeTab === 'view' && (
          <div className="flex items-center gap-0.5 flex-wrap">
            <ToolbarButton icon={showGridlines ? Grid3x3 : Grid2x2} action={() => setShowGridlines(!showGridlines)} title="Toggle Gridlines" active={showGridlines} />
            <ToolbarButton icon={showFormulaBar ? Eye : EyeOff} action={() => setShowFormulaBar(!showFormulaBar)} title="Toggle Formula Bar" active={showFormulaBar} />
            <ToolbarDivider />
            <div className="flex items-center gap-1">
              <button onClick={() => setZoom(Math.max(50, zoom - 10))} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-sm min-w-[50px] text-center">{zoom}%</span>
              <button onClick={() => setZoom(Math.min(200, zoom + 10))} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                <ZoomIn className="w-4 h-4" />
              </button>
              <button onClick={() => setZoom(100)} className="px-2 py-1 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                Reset
              </button>
            </div>
            <ToolbarDivider />
            <button onClick={handleExport} className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-medium">
              <Download className="w-4 h-4" /> Export XLSX
            </button>
          </div>
        )}
      </div>

      {/* Formula Bar */}
      {showFormulaBar && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <input
            value={selectedCell ? `${getColName(selectedCell.col)}${selectedCell.row + 1}` : ''}
            readOnly
            className="w-20 text-xs font-mono text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1"
          />
          <div className="flex gap-0.5">
            <button onClick={undo} title="Undo" className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
              <Undo className="w-3.5 h-3.5" />
            </button>
            <button onClick={redo} title="Redo" className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
              <Redo className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => selectedCell && handleCellEdit(selectedCell.row, selectedCell.col, editValue)} title="Enter" className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
              <span className="text-xs font-bold">✓</span>
            </button>
          </div>
          <span className="text-xs text-gray-500 font-mono italic">fx</span>
          <input
            ref={formulaBarRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && selectedCell) {
                handleCellEdit(selectedCell.row, selectedCell.col, editValue);
              }
            }}
            className="flex-1 text-sm font-mono bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter value or formula (e.g., =SUM(A1:A10))"
          />
        </div>
      )}

      {/* Spreadsheet Grid */}
      <div className="flex-1 overflow-auto" ref={gridRef} style={{ fontSize: `${zoom}%` }}>
        <table className="border-collapse" style={{ minWidth: '100%' }}>
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="w-12 min-w-[48px] bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-500 dark:text-gray-400 sticky left-0 z-20"></th>
              {Array.from({ length: numCols }, (_, i) => {
                const isSelected = selectionRange && i >= Math.min(selectionRange.start.col, selectionRange.end.col) && i <= Math.max(selectionRange.start.col, selectionRange.end.col);
                return (
                  <th
                    key={i}
                    className={`min-w-[100px] border border-gray-300 dark:border-gray-600 text-xs font-medium px-2 py-1.5 text-center ${
                      isSelected ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    }`}
                    style={{ width: activeSheet.colWidths[i] || 100 }}
                  >
                    {getColName(i)}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {cells.map((row, rowIdx) => {
              const isRowSelected = selectionRange && rowIdx >= Math.min(selectionRange.start.row, selectionRange.end.row) && rowIdx <= Math.max(selectionRange.start.row, selectionRange.end.row);
              return (
                <tr key={rowIdx}>
                  <td className={`w-12 min-w-[48px] border border-gray-300 dark:border-gray-600 text-xs font-medium text-center py-0.5 sticky left-0 z-10 ${
                    isRowSelected ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}>
                    {rowIdx + 1}
                  </td>
                  {row.map((cell, colIdx) => {
                    const isSelected = selectedCell?.row === rowIdx && selectedCell?.col === colIdx;
                    const inSelection = isInSelection(rowIdx, colIdx);
                    const isEditing = editingCell?.row === rowIdx && editingCell?.col === colIdx;
                    const displayValue = getDisplayValue(cell);
                    const isMatch = isFindMatch(rowIdx, colIdx);
                    const hasComment = !!cell.comment;

                    const borderStyle = cell.style?.borders;
                    const cellBorders = {
                      borderTop: borderStyle?.top?.style !== 'none' ? `${borderStyle?.top?.width || '1px'} ${borderStyle?.top?.style || (showGridlines ? 'solid' : 'none')} ${borderStyle?.top?.color || (showGridlines ? '#d1d5db' : 'transparent')}` : 'none',
                      borderRight: borderStyle?.right?.style !== 'none' ? `${borderStyle?.right?.width || '1px'} ${borderStyle?.right?.style || (showGridlines ? 'solid' : 'none')} ${borderStyle?.right?.color || (showGridlines ? '#d1d5db' : 'transparent')}` : 'none',
                      borderBottom: borderStyle?.bottom?.style !== 'none' ? `${borderStyle?.bottom?.width || '1px'} ${borderStyle?.bottom?.style || (showGridlines ? 'solid' : 'none')} ${borderStyle?.bottom?.color || (showGridlines ? '#d1d5db' : 'transparent')}` : 'none',
                      borderLeft: borderStyle?.left?.style !== 'none' ? `${borderStyle?.left?.width || '1px'} ${borderStyle?.left?.style || (showGridlines ? 'solid' : 'none')} ${borderStyle?.left?.color || (showGridlines ? '#d1d5db' : 'transparent')}` : 'none',
                    };

                    return (
                      <td
                        key={colIdx}
                        onClick={(e) => handleCellClick(rowIdx, colIdx, e)}
                        onDoubleClick={() => handleCellDoubleClick(rowIdx, colIdx)}
                        onMouseDown={(e) => handleMouseDown(rowIdx, colIdx, e)}
                        onMouseEnter={() => handleMouseEnter(rowIdx, colIdx)}
                        className={`relative px-1 py-0.5 text-sm cursor-cell ${
                          isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''
                        } ${isMatch ? 'bg-yellow-200 dark:bg-yellow-800' : ''}`}
                        style={{
                          fontWeight: cell.style?.bold ? 'bold' : 'normal',
                          fontStyle: cell.style?.italic ? 'italic' : 'normal',
                          textDecoration: cell.style?.underline ? 'underline' : cell.style?.strikethrough ? 'line-through' : 'none',
                          textAlign: cell.style?.align || 'left',
                          verticalAlign: cell.style?.verticalAlign || 'middle',
                          backgroundColor: isSelected ? undefined : (cell.style?.backgroundColor || (inSelection ? '#dbeafe' : undefined)),
                          color: cell.style?.color,
                          fontSize: cell.style?.fontSize ? `${cell.style.fontSize}px` : undefined,
                          fontFamily: cell.style?.fontFamily,
                          whiteSpace: cell.style?.wrapText ? 'normal' : 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          minWidth: activeSheet.colWidths[colIdx] || 100,
                          ...cellBorders,
                        }}
                      >
                        {isEditing ? (
                          <input
                            ref={inputRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, rowIdx, colIdx)}
                            onBlur={() => handleCellEdit(rowIdx, colIdx, editValue)}
                            className="w-full h-full absolute inset-0 px-1 text-sm border-none outline-none bg-white dark:bg-gray-900"
                            autoFocus
                          />
                        ) : (
                          <span className="block truncate">{displayValue}</span>
                        )}
                        {hasComment && (
                          <div className="absolute top-0 right-0 w-0 h-0 border-l-[6px] border-l-red-500 border-b-[6px] border-b-transparent"></div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sheet Tabs */}
      <div className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center px-2 py-1 gap-1">
        <button
          onClick={() => {
            const newSheet: Sheet = {
              id: uuidv4(),
              name: `Sheet${sheets.length + 1}`,
              cells: Array(100).fill(null).map(() => Array(26).fill(null).map(() => ({ value: '' }))),
              colWidths: Array(26).fill(100),
              rowHeights: Array(100).fill(24),
            };
            setSheets([...sheets, newSheet]);
            setActiveSheetIdx(sheets.length);
          }}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          title="Add Sheet"
        >
          <Plus className="w-4 h-4" />
        </button>
        {sheets.map((sheet, idx) => (
          <button
            key={sheet.id}
            onClick={() => {
              setActiveSheetIdx(idx);
              onChange(sheet.cells);
            }}
            className={`px-3 py-1 text-sm rounded-t border-b-2 ${
              idx === activeSheetIdx
                ? 'bg-white dark:bg-gray-900 border-blue-500 text-blue-600 dark:text-blue-400 font-medium'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {sheet.name}
          </button>
        ))}
      </div>

      {/* Status Bar */}
      <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-1 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
        <span>Ready</span>
        <div className="flex-1" />
        {selectionRange && (
          <>
            {stats.numCount > 0 && (
              <>
                <span>Average: <strong>{stats.avg.toFixed(2)}</strong></span>
                <span>Count: <strong>{stats.count}</strong></span>
                <span>Sum: <strong>{stats.sum.toFixed(2)}</strong></span>
              </>
            )}
            {stats.numCount === 0 && stats.count > 0 && (
              <span>Count: <strong>{stats.count}</strong></span>
            )}
          </>
        )}
        <div className="flex items-center gap-1 ml-4">
          <button onClick={() => setZoom(Math.max(50, zoom - 10))} className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <div className="w-24 h-1 bg-gray-200 dark:bg-gray-700 rounded-full relative">
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full"
              style={{ left: `${((zoom - 50) / 150) * 100}%` }}
            />
          </div>
          <button onClick={() => setZoom(Math.min(200, zoom + 10))} className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <span className="min-w-[40px] text-center">{zoom}%</span>
        </div>
      </div>

      {/* Modals */}
      {modal === 'findReplace' && (
        <div className="fixed top-20 right-4 bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 w-80 z-50">
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-sm">Find & Replace</h3>
            <button onClick={() => setModal('none')} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-3 space-y-2">
            <div className="flex gap-2">
              <input
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFind()}
                placeholder="Find..."
                className="flex-1 text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={handleFind} className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm">
                Find
              </button>
            </div>
            {findMatches.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{findIdx + 1} of {findMatches.length}</span>
                <button onClick={() => navigateFind('prev')} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">←</button>
                <button onClick={() => navigateFind('next')} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">→</button>
              </div>
            )}
            <input
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="Replace with..."
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button onClick={() => handleReplace(false)} className="flex-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-sm">
                Replace
              </button>
              <button onClick={() => handleReplace(true)} className="flex-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-sm">
                Replace All
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'insertFunction' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold">Insert Function</h3>
              <button onClick={() => setModal('none')} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {[
                { name: 'SUM', desc: 'Adds all the numbers in a range of cells' },
                { name: 'AVERAGE', desc: 'Returns the average of its arguments' },
                { name: 'COUNT', desc: 'Counts the number of cells that contain numbers' },
                { name: 'COUNTA', desc: 'Counts the number of cells that are not empty' },
                { name: 'MAX', desc: 'Returns the maximum value in a set of values' },
                { name: 'MIN', desc: 'Returns the minimum value in a set of values' },
                { name: 'IF', desc: 'Returns one value if a condition is true and another if false' },
                { name: 'ROUND', desc: 'Rounds a number to a specified number of digits' },
                { name: 'ABS', desc: 'Returns the absolute value of a number' },
                { name: 'SQRT', desc: 'Returns a positive square root' },
                { name: 'POWER', desc: 'Returns the result of a number raised to a power' },
                { name: 'CONCAT', desc: 'Joins two or more text strings' },
              ].map(fn => (
                <button
                  key={fn.name}
                  onClick={() => {
                    if (selectedCell) {
                      updateCell(selectedCell.row, selectedCell.col, { value: `=${fn.name}()` });
                    }
                    setModal('none');
                  }}
                  className="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                >
                  <div className="font-mono font-bold text-blue-600 dark:text-blue-400">{fn.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{fn.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {modal === 'cellComment' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold">Cell Comment</h3>
              <button onClick={() => setModal('none')} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="w-full h-32 text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (selectedCell) {
                      updateCell(selectedCell.row, selectedCell.col, { comment: commentText });
                    }
                    setModal('none');
                    setCommentText('');
                  }}
                  className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium"
                >
                  Add Comment
                </button>
                <button
                  onClick={() => {
                    if (selectedCell) {
                      updateCell(selectedCell.row, selectedCell.col, { comment: undefined });
                    }
                    setModal('none');
                  }}
                  className="px-3 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded text-sm"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal === 'sortFilter' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold">Sort & Filter</h3>
              <button onClick={() => setModal('none')} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <button
                onClick={() => { sortColumn(true); setModal('none'); }}
                className="w-full flex items-center gap-2 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
              >
                <ArrowUpAZ className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium text-sm">Sort A to Z</div>
                  <div className="text-xs text-gray-500">Sort ascending</div>
                </div>
              </button>
              <button
                onClick={() => { sortColumn(false); setModal('none'); }}
                className="w-full flex items-center gap-2 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
              >
                <ArrowDownZA className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium text-sm">Sort Z to A</div>
                  <div className="text-xs text-gray-500">Sort descending</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'insertChart' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold">Insert Chart</h3>
              <button onClick={() => setModal('none')} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-3 gap-3">
              {[
                { icon: BarChart3, name: 'Column', color: 'blue' },
                { icon: TrendingUp, name: 'Line', color: 'green' },
                { icon: PieChart, name: 'Pie', color: 'purple' },
              ].map(chart => (
                <button
                  key={chart.name}
                  className="flex flex-col items-center gap-2 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <chart.icon className={`w-10 h-10 text-${chart.color}-500`} />
                  <span className="text-sm">{chart.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
