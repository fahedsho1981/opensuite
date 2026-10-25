import { useState, useEffect } from 'react';
import { getCollaborationService, Collaborator } from '../services/collaboration';

interface CursorPosition {
  top: number;
  left: number;
  height: number;
}

export default function RemoteCursors({ editorContainerRef }: { editorContainerRef: React.RefObject<HTMLElement> }) {
  const [cursors, setCursors] = useState<Map<string, { user: Collaborator; position: CursorPosition }>>(new Map());
  const service = getCollaborationService();

  useEffect(() => {
    const unsubscribe = service.on('collaborators:change', (collaborators: Collaborator[]) => {
      // Convert collaborator cursor data to screen positions
      const newCursors = new Map();
      collaborators.forEach(user => {
        if (user.cursor) {
          const position = convertCursorToPosition(user.cursor, editorContainerRef.current);
          if (position) {
            newCursors.set(user.userId, { user, position });
          }
        }
      });
      setCursors(newCursors);
    });

    return unsubscribe;
  }, [editorContainerRef]);

  return (
    <>
      {Array.from(cursors.values()).map(({ user, position }) => (
        <div
          key={user.userId}
          className="absolute pointer-events-none z-50"
          style={{
            top: position.top,
            left: position.left,
          }}
        >
          {/* Cursor line */}
          <div
            className="w-0.5 animate-pulse"
            style={{
              backgroundColor: user.color,
              height: position.height || 20,
            }}
          />
          {/* User label */}
          <div
            className="absolute -top-5 left-0 px-1.5 py-0.5 rounded text-[10px] text-white whitespace-nowrap"
            style={{ backgroundColor: user.color }}
          >
            {user.userName}
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * Convert cursor position to screen coordinates
 * This is a placeholder - implementation depends on editor type
 */
function convertCursorToPosition(cursor: any, container: HTMLElement | null): CursorPosition | null {
  if (!container || !cursor) return null;
  
  // For contentEditable editors, we need to:
  // 1. Get the text node at the cursor position
  // 2. Create a range at that position
  // 3. Get the bounding rectangle
  
  // This is a simplified implementation
  // In a real scenario, you'd need to:
  // - Walk the DOM tree to find the correct text node
  // - Calculate offset within that node
  // - Use Range API to get coordinates
  
  try {
    // Placeholder: return a default position
    // Real implementation would calculate actual position
    return {
      top: cursor.line ? cursor.line * 20 : 0,
      left: cursor.ch ? cursor.ch * 8 : 0,
      height: 20,
    };
  } catch (error) {
    console.error('Error converting cursor position:', error);
    return null;
  }
}
