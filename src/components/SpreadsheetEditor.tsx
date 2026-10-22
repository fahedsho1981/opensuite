import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Download, Plus, Bold, Italic } from 'lucide-react';
import { exportXlsx } from '../utils/fileHandlers';
import type { SpreadsheetCell } from '../types';

interface SpreadsheetEditorProps {
  content: SpreadsheetCell[][];
  onChange: (content: SpreadsheetCell[][]) => void;
  fileName: string;
  readOnly?: boolean;
}

function getColName(index: number): string {
  let name = '';
  let n = index;
  while (n >= 0) {
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26) - 1;
  }
  return name;
}

function evaluateFormula(formula: string, cells: SpreadsheetCell[][]): string {
  if (!formula.startsWith('=')) return formula;
  
  const expr = formula.substring(1);
  
  // Handle SUM, AVERAGE, COUNT, MIN, MAX
  const funcMatch = expr.match(/^(SUM|AVERAGE|AVG|COUNT|MIN|MAX)\(([A-Z]+\d+):([A-Z]+\d+)\)$/i);
  if (funcMatch) {
    const [, func, start, end] = funcMatch;
    const startCol = start.charCodeAt(0) - 65;
    const startRow = parseInt(start.substring(1)) - 1;
    const endCol = end.charCodeAt(0) - 65;
    const endRow = parseInt(end.substring(1)) - 1;
    
    const values: number[] = [];
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const val = parseFloat(cells[r]?.[c]?.value || '0');
        if (!isNaN(val)) values.push(val);
      }
    }
    
    switch (func.toUpperCase()) {
      case 'SUM': return values.reduce((a, b) => a + b, 0).toString();
      case 'AVERAGE':
      case 'AVG': return values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toString() : '0';
      case 'COUNT': return values.length.toString();
      case 'MIN': return values.length ? Math.min(...values).toString() : '0';
      case 'MAX': return values.length ? Math.max(...values).toString() : '0';
    }
  }
  
  // Simple cell reference replacement
  let resolved = expr.replace(/([A-Z]+)(\d+)/g, (match, col, row) => {
    const c = col.charCodeAt(0) - 65;
    const r = parseInt(row) - 1;
    const val = cells[r]?.[c]?.value || '0';
    return isNaN(parseFloat(val)) ? '0' : val;
  });
  
  try {
    const result = new Function(`return ${resolved}`)();
    return typeof result === 'number' ? result.toString() : String(result);
  } catch {
    return '#ERROR';
  }
}

export default function SpreadsheetEditor({ content, onChange, fileName, readOnly = false }: SpreadsheetEditorProps) {
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const formulaBarRef = useRef<HTMLInputElement>(null);

  const updateCell = useCallback((row: number, col: number, value: string) => {
    const newContent = content.map(r => r.map(c => ({ ...c })));
    newContent[row][col] = { ...newContent[row][col], value };
    onChange(newContent);
  }, [content, onChange]);

  const handleCellClick = (row: number, col: number) => {
    if (readOnly) return;
    setSelectedCell({ row, col });
    setEditingCell(null);
  };

  const handleCellDoubleClick = (row: number, col: number) => {
    if (readOnly) return;
    setEditingCell({ row, col });
    setEditValue(content[row][col].value);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleCellEdit = (row: number, col: number, value: string) => {
    updateCell(row, col, value);
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, row: number, col: number) => {
    if (e.key === 'Enter') {
      handleCellEdit(row, col, editValue);
      setSelectedCell({ row: row + 1, col });
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleCellEdit(row, col, editValue);
      setSelectedCell({ row, col: col + 1 });
    }
  };

  const handleFormulaBarChange = (value: string) => {
    if (selectedCell) {
      setEditValue(value);
    }
  };

  const handleFormulaBarSubmit = () => {
    if (selectedCell) {
      updateCell(selectedCell.row, selectedCell.col, editValue);
    }
  };

  const getDisplayValue = (cell: SpreadsheetCell): string => {
    if (cell.value.startsWith('=')) {
      return evaluateFormula(cell.value, content);
    }
    return cell.value;
  };

  const handleExport = () => {
    exportXlsx(content, fileName);
  };

  const addRow = () => {
    const newRow: SpreadsheetCell[] = Array(content[0]?.length || 26).fill(null).map(() => ({ value: '' }));
    onChange([...content, newRow]);
  };

  const addCol = () => {
    const newContent = content.map(row => [...row, { value: '' }]);
    onChange(newContent);
  };

  const toggleBold = () => {
    if (!selectedCell) return;
    const newContent = content.map(r => r.map(c => ({ ...c })));
    const cell = newContent[selectedCell.row][selectedCell.col];
    cell.style = { ...cell.style, bold: !cell.style?.bold };
    onChange(newContent);
  };

  const toggleItalic = () => {
    if (!selectedCell) return;
    const newContent = content.map(r => r.map(c => ({ ...c })));
    const cell = newContent[selectedCell.row][selectedCell.col];
    cell.style = { ...cell.style, italic: !cell.style?.italic };
    onChange(newContent);
  };

  useEffect(() => {
    if (selectedCell) {
      setEditValue(content[selectedCell.row]?.[selectedCell.col]?.value || '');
    }
  }, [selectedCell, content]);

  const numCols = content[0]?.length || 26;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-2">
        <div className="flex items-center gap-1">
          <button onClick={toggleBold} title="Bold" className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
            <Bold className="w-4 h-4" />
          </button>
          <button onClick={toggleItalic} title="Italic" className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
            <Italic className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
          <button onClick={addRow} title="Add Row" className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={addCol} title="Add Column" className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-medium px-2">
            +Col
          </button>
          <div className="flex-1" />
          <button
            onClick={handleExport}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Export XLSX
          </button>
        </div>
      </div>

      {/* Formula Bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <span className="text-xs font-mono text-gray-500 dark:text-gray-400 w-16">
          {selectedCell ? `${getColName(selectedCell.col)}${selectedCell.row + 1}` : ''}
        </span>
        <input
          ref={formulaBarRef}
          value={editValue}
          onChange={(e) => handleFormulaBarChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleFormulaBarSubmit(); }}
          className="flex-1 text-sm font-mono bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter value or formula (e.g., =SUM(A1:A10))"
        />
      </div>

      {/* Spreadsheet Grid */}
      <div className="flex-1 overflow-auto">
        <table className="border-collapse min-w-full">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="w-12 min-w-[48px] bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400"></th>
              {Array.from({ length: numCols }, (_, i) => (
                <th
                  key={i}
                  className="min-w-[100px] bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-1.5 text-center"
                >
                  {getColName(i)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {content.map((row, rowIdx) => (
              <tr key={rowIdx}>
                <td className="w-12 min-w-[48px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 text-center py-0.5">
                  {rowIdx + 1}
                </td>
                {row.map((cell, colIdx) => {
                  const isSelected = selectedCell?.row === rowIdx && selectedCell?.col === colIdx;
                  const isEditing = editingCell?.row === rowIdx && editingCell?.col === colIdx;
                  const displayValue = getDisplayValue(cell);

                  return (
                    <td
                      key={colIdx}
                      onClick={() => handleCellClick(rowIdx, colIdx)}
                      onDoubleClick={() => handleCellDoubleClick(rowIdx, colIdx)}
                      className={`border border-gray-200 dark:border-gray-700 px-1 py-0.5 text-sm cursor-cell relative ${
                        isSelected ? 'ring-2 ring-blue-500 ring-inset bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      style={{
                        fontWeight: cell.style?.bold ? 'bold' : 'normal',
                        fontStyle: cell.style?.italic ? 'italic' : 'normal',
                        textAlign: cell.style?.align || 'left',
                        backgroundColor: isSelected ? undefined : cell.style?.backgroundColor,
                        color: cell.style?.color,
                        fontSize: cell.style?.fontSize ? `${cell.style.fontSize}px` : undefined,
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
                        />
                      ) : (
                        <span className="block truncate">{displayValue}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
