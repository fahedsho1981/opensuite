import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export interface Collaborator {
  userId: string;
  userName: string;
  color: string;
  cursor?: { line: number; ch: number };
  selection?: { anchor: number; head: number };
}

export class CollaborationService {
  private ydoc: Y.Doc;
  private provider: WebsocketProvider | null = null;
  private collaborators: Map<number, Collaborator> = new Map();
  private listeners: Map<string, Set<Function>> = new Map();
  private status: 'connecting' | 'connected' | 'disconnected' = 'disconnected';

  constructor() {
    this.ydoc = new Y.Doc();
  }

  /**
   * Connect to CloudDrive WebSocket server
   */
  connect(wsUrl: string): void {
    try {
      const url = new URL(wsUrl);
      const roomId = url.searchParams.get('roomId') || 'default';
      
      // Strip query params for y-websocket (it adds its own)
      const baseUrl = `${url.protocol}//${url.host}`;
      
      this.provider = new WebsocketProvider(baseUrl, roomId, this.ydoc, {
        connect: true,
        params: Object.fromEntries(url.searchParams),
      });

      // Set local user awareness
      const userId = url.searchParams.get('userId') || 'anonymous';
      const userName = decodeURIComponent(url.searchParams.get('userName') || 'Anonymous');
      
      this.provider.awareness.setLocalStateField('user', {
        userId,
        userName,
        color: this.generateColor(userId),
      });

      // Listen for awareness changes (other users' cursors)
      this.provider.awareness.on('change', () => {
        this.updateCollaborators();
        this.emit('collaborators:change', this.getCollaborators());
      });

      // Connection status
      this.provider.on('status', (event: { status: string }) => {
        this.status = event.status as 'connecting' | 'connected' | 'disconnected';
        this.emit('status:change', this.status);
      });

      this.status = 'connecting';
      this.emit('status:change', this.status);
    } catch (error) {
      console.error('Failed to connect to collaboration server:', error);
      this.status = 'disconnected';
      this.emit('status:change', this.status);
    }
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    if (this.provider) {
      this.provider.disconnect();
      this.provider.destroy();
      this.provider = null;
    }
    this.ydoc.destroy();
    this.ydoc = new Y.Doc();
    this.collaborators.clear();
    this.status = 'disconnected';
    this.emit('status:change', this.status);
  }

  /**
   * Get the Yjs document
   */
  getYDoc(): Y.Doc {
    return this.ydoc;
  }

  /**
   * Get shared text type for document editor
   */
  getYText(name: string = 'content'): Y.Text {
    return this.ydoc.getText(name);
  }

  /**
   * Get shared array type for spreadsheet/presentation
   */
  getYArray<T = any>(name: string = 'cells'): Y.Array<T> {
    return this.ydoc.getArray<T>(name);
  }

  /**
   * Get shared map type for metadata
   */
  getYMap<T = any>(name: string = 'meta'): Y.Map<T> {
    return this.ydoc.getMap<T>(name);
  }

  /**
   * Update local cursor position (broadcasts to others)
   */
  updateCursor(cursor: any, selection?: any): void {
    if (this.provider) {
      this.provider.awareness.setLocalStateField('cursor', { cursor, selection });
    }
  }

  /**
   * Get list of collaborators
   */
  getCollaborators(): Collaborator[] {
    return Array.from(this.collaborators.values());
  }

  /**
   * Subscribe to events
   */
  on(event: string, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.status === 'connected';
  }

  /**
   * Get current status
   */
  getStatus(): string {
    return this.status;
  }

  // Private methods

  private updateCollaborators(): void {
    if (!this.provider) return;
    
    this.collaborators.clear();
    this.provider.awareness.getStates().forEach((state, clientId) => {
      if (clientId !== this.provider!.awareness.clientID && state.user) {
        this.collaborators.set(clientId, {
          ...state.user,
          cursor: state.cursor?.cursor,
          selection: state.cursor?.selection,
        });
      }
    });
  }

  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(cb => {
      try {
        cb(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  private generateColor(seed: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
      '#F8B739', '#52B788', '#E63946', '#457B9D',
    ];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }
}

// Singleton
let instance: CollaborationService | null = null;
export function getCollaborationService(): CollaborationService {
  if (!instance) instance = new CollaborationService();
  return instance;
}
