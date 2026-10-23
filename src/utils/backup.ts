/**
 * Backup & Disaster Recovery Utilities for OpenSuite Document Editor
 * Provides automated backups, version snapshots, export/import capabilities,
 * and disaster recovery procedures.
 */

// ============================================================
// Backup Types
// ============================================================

export interface BackupMetadata {
  id: string;
  timestamp: string;
  type: 'full' | 'incremental' | 'snapshot';
  size: number;
  documentCount: number;
  version?: string;
  checksum: string;
  compressed: boolean;
}

export interface BackupConfig {
  enabled: boolean;
  frequency: 'hourly' | 'daily' | 'weekly';
  retentionDays: number;
  maxBackups: number;
  compressBackups: boolean;
  includeVersions: boolean;
  storageLocation: 'local' | 'cloud';
}

// ============================================================
// Backup Manager
// ============================================================

export class BackupManager {
  private config: BackupConfig;
  private backups: BackupMetadata[] = [];
  
  constructor(config?: Partial<BackupConfig>) {
    this.config = {
      enabled: true,
      frequency: 'daily',
      retentionDays: 30,
      maxBackups: 50,
      compressBackups: true,
      includeVersions: true,
      storageLocation: 'local',
      ...config,
    };
    
    this.loadBackupList();
    this.setupAutoBackup();
  }
  
  private loadBackupList(): void {
    try {
      const stored = localStorage.getItem('backup_list');
      if (stored) {
        this.backups = JSON.parse(stored);
      }
    } catch {
      this.backups = [];
    }
  }
  
  private saveBackupList(): void {
    try {
      localStorage.setItem('backup_list', JSON.stringify(this.backups));
    } catch {
      console.error('Failed to save backup list');
    }
  }
  
  private setupAutoBackup(): void {
    if (!this.config.enabled) return;
    
    const intervals: Record<string, number> = {
      hourly: 3600000,
      daily: 86400000,
      weekly: 604800000,
    };
    
    const interval = intervals[this.config.frequency];
    
    setInterval(() => {
      this.createBackup('incremental');
    }, interval);
  }
  
  async createBackup(type: 'full' | 'incremental' | 'snapshot' = 'full'): Promise<BackupMetadata> {
    const startTime = Date.now();
    
    try {
      // Collect all data
      const documents = await this.collectDocuments();
      const versions = this.config.includeVersions ? await this.collectVersions() : [];
      const settings = await this.collectSettings();
      
      const backupData = {
        documents,
        versions,
        settings,
        metadata: {
          created: new Date().toISOString(),
          type,
          version: '1.0.0',
        },
      };
      
      // Serialize and compress
      let serialized = JSON.stringify(backupData);
      let compressed = false;
      
      if (this.config.compressBackups && serialized.length > 10000) {
        serialized = await this.compressData(serialized);
        compressed = true;
      }
      
      // Calculate checksum
      const checksum = await this.calculateChecksum(serialized);
      
      // Store backup
      const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const storageKey = `backup_${backupId}`;
      
      localStorage.setItem(storageKey, serialized);
      
      // Create metadata
      const metadata: BackupMetadata = {
        id: backupId,
        timestamp: new Date().toISOString(),
        type,
        size: serialized.length,
        documentCount: documents.length,
        checksum,
        compressed,
      };
      
      this.backups.push(metadata);
      this.saveBackupList();
      
      // Cleanup old backups
      await this.cleanupOldBackups();
      
      console.log(`✅ Backup created: ${backupId} (${this.formatBytes(metadata.size)})`);
      
      return metadata;
    } catch (error) {
      console.error('❌ Backup failed:', error);
      throw error;
    }
  }
  
  private async collectDocuments(): Promise<any[]> {
    const documents: any[] = [];
    
    // Collect from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('doc_')) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            documents.push({ key, data: JSON.parse(data) });
          }
        } catch {
          // Skip invalid entries
        }
      }
    }
    
    return documents;
  }
  
  private async collectVersions(): Promise<any[]> {
    const versions: any[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('version_')) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            versions.push({ key, data: JSON.parse(data) });
          }
        } catch {
          // Skip invalid entries
        }
      }
    }
    
    return versions;
  }
  
  private async collectSettings(): Promise<any> {
    const settings: any = {};
    
    const settingKeys = ['user_preferences', 'editor_settings', 'theme', 'language'];
    
    settingKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          settings[key] = JSON.parse(value);
        } catch {
          settings[key] = value;
        }
      }
    });
    
    return settings;
  }
  
  private async compressData(data: string): Promise<string> {
    // Simple compression using base64 encoding
    // In production, use a proper compression library like pako (gzip)
    return btoa(encodeURIComponent(data));
  }
  
  private async decompressData(data: string): Promise<string> {
    try {
      return decodeURIComponent(atob(data));
    } catch {
      return data; // Not compressed
    }
  }
  
  private async calculateChecksum(data: string): Promise<string> {
    // Simple checksum using hash
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
  
  private async cleanupOldBackups(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
    
    // Remove old backups
    this.backups = this.backups.filter(backup => {
      const backupDate = new Date(backup.timestamp);
      if (backupDate < cutoffDate) {
        localStorage.removeItem(`backup_${backup.id}`);
        return false;
      }
      return true;
    });
    
    // Keep only maxBackups
    if (this.backups.length > this.config.maxBackups) {
      const toRemove = this.backups.slice(0, this.backups.length - this.config.maxBackups);
      toRemove.forEach(backup => {
        localStorage.removeItem(`backup_${backup.id}`);
      });
      this.backups = this.backups.slice(-this.config.maxBackups);
    }
    
    this.saveBackupList();
  }
  
  async restoreBackup(backupId: string): Promise<void> {
    const storageKey = `backup_${backupId}`;
    const serialized = localStorage.getItem(storageKey);
    
    if (!serialized) {
      throw new Error(`Backup ${backupId} not found`);
    }
    
    try {
      // Decompress if needed
      const metadata = this.backups.find(b => b.id === backupId);
      let data = serialized;
      
      if (metadata?.compressed) {
        data = await this.decompressData(serialized);
      }
      
      // Parse backup data
      const backupData = JSON.parse(data);
      
      // Verify checksum
      const checksum = await this.calculateChecksum(serialized);
      if (checksum !== metadata?.checksum) {
        throw new Error('Backup checksum mismatch - data may be corrupted');
      }
      
      // Restore documents
      if (backupData.documents) {
        backupData.documents.forEach((doc: any) => {
          localStorage.setItem(doc.key, JSON.stringify(doc.data));
        });
      }
      
      // Restore versions
      if (backupData.versions) {
        backupData.versions.forEach((version: any) => {
          localStorage.setItem(version.key, JSON.stringify(version.data));
        });
      }
      
      // Restore settings
      if (backupData.settings) {
        Object.entries(backupData.settings).forEach(([key, value]) => {
          localStorage.setItem(key, JSON.stringify(value));
        });
      }
      
      console.log(`✅ Backup restored: ${backupId}`);
    } catch (error) {
      console.error('❌ Restore failed:', error);
      throw error;
    }
  }
  
  async exportBackup(backupId: string): Promise<Blob> {
    const storageKey = `backup_${backupId}`;
    const serialized = localStorage.getItem(storageKey);
    
    if (!serialized) {
      throw new Error(`Backup ${backupId} not found`);
    }
    
    const metadata = this.backups.find(b => b.id === backupId);
    const filename = `opensuite-backup-${backupId}-${new Date().toISOString().split('T')[0]}.json`;
    
    return new Blob([serialized], { type: 'application/json' });
  }
  
  async importBackup(file: File): Promise<BackupMetadata> {
    const text = await file.text();
    
    try {
      const backupData = JSON.parse(text);
      
      // Validate structure
      if (!backupData.documents || !backupData.metadata) {
        throw new Error('Invalid backup file format');
      }
      
      // Generate new backup ID
      const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const storageKey = `backup_${backupId}`;
      
      // Store backup
      localStorage.setItem(storageKey, text);
      
      // Calculate checksum
      const checksum = await this.calculateChecksum(text);
      
      // Create metadata
      const metadata: BackupMetadata = {
        id: backupId,
        timestamp: new Date().toISOString(),
        type: 'full',
        size: text.length,
        documentCount: backupData.documents.length,
        checksum,
        compressed: false,
      };
      
      this.backups.push(metadata);
      this.saveBackupList();
      
      console.log(`✅ Backup imported: ${backupId}`);
      
      return metadata;
    } catch (error) {
      console.error('❌ Import failed:', error);
      throw error;
    }
  }
  
  getBackups(): BackupMetadata[] {
    return [...this.backups].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
  
  async deleteBackup(backupId: string): Promise<void> {
    const storageKey = `backup_${backupId}`;
    localStorage.removeItem(storageKey);
    
    this.backups = this.backups.filter(b => b.id !== backupId);
    this.saveBackupList();
    
    console.log(`✅ Backup deleted: ${backupId}`);
  }
  
  async verifyBackup(backupId: string): Promise<boolean> {
    const storageKey = `backup_${backupId}`;
    const serialized = localStorage.getItem(storageKey);
    
    if (!serialized) {
      return false;
    }
    
    const metadata = this.backups.find(b => b.id === backupId);
    if (!metadata) {
      return false;
    }
    
    const checksum = await this.calculateChecksum(serialized);
    return checksum === metadata.checksum;
  }
  
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
  
  getConfig(): BackupConfig {
    return { ...this.config };
  }
  
  updateConfig(config: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  getStorageUsage(): { used: number; total: number } {
    let used = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('backup_')) {
        const value = localStorage.getItem(key);
        if (value) {
          used += value.length;
        }
      }
    }
    
    // Estimate total (typically 5-10MB for localStorage)
    const total = 5 * 1024 * 1024; // 5MB
    
    return { used, total };
  }
}

// ============================================================
// Version Snapshot Manager
// ============================================================

export interface VersionSnapshot {
  id: string;
  documentId: string;
  timestamp: string;
  label?: string;
  content: string;
  size: number;
  author?: string;
}

export class VersionSnapshotManager {
  private maxVersionsPerDocument = 50;
  
  async createSnapshot(
    documentId: string,
    content: string,
    label?: string,
    author?: string
  ): Promise<VersionSnapshot> {
    const snapshot: VersionSnapshot = {
      id: `ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      documentId,
      timestamp: new Date().toISOString(),
      label,
      content,
      size: content.length,
      author,
    };
    
    // Store snapshot
    const storageKey = `version_${documentId}_${snapshot.id}`;
    localStorage.setItem(storageKey, JSON.stringify(snapshot));
    
    // Cleanup old versions
    await this.cleanupOldVersions(documentId);
    
    console.log(`✅ Version snapshot created: ${snapshot.id}`);
    
    return snapshot;
  }
  
  async getVersions(documentId: string): Promise<VersionSnapshot[]> {
    const versions: VersionSnapshot[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`version_${documentId}_`)) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            versions.push(JSON.parse(data));
          }
        } catch {
          // Skip invalid entries
        }
      }
    }
    
    return versions.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
  
  async getVersion(versionId: string): Promise<VersionSnapshot | null> {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.endsWith(`_${versionId}`)) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            return JSON.parse(data);
          }
        } catch {
          // Skip invalid entries
        }
      }
    }
    
    return null;
  }
  
  async restoreVersion(versionId: string): Promise<void> {
    const version = await this.getVersion(versionId);
    
    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }
    
    // Restore content to document
    const docKey = `doc_${version.documentId}`;
    localStorage.setItem(docKey, version.content);
    
    console.log(`✅ Version restored: ${versionId}`);
  }
  
  async deleteVersion(versionId: string): Promise<void> {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.endsWith(`_${versionId}`)) {
        localStorage.removeItem(key);
        break;
      }
    }
    
    console.log(`✅ Version deleted: ${versionId}`);
  }
  
  private async cleanupOldVersions(documentId: string): Promise<void> {
    const versions = await this.getVersions(documentId);
    
    if (versions.length > this.maxVersionsPerDocument) {
      const toDelete = versions.slice(this.maxVersionsPerDocument);
      
      for (const version of toDelete) {
        await this.deleteVersion(version.id);
      }
    }
  }
  
  async compareVersions(versionId1: string, versionId2: string): Promise<{
    additions: number;
    deletions: number;
    changes: number;
  }> {
    const version1 = await this.getVersion(versionId1);
    const version2 = await this.getVersion(versionId2);
    
    if (!version1 || !version2) {
      throw new Error('One or both versions not found');
    }
    
    // Simple diff calculation
    const content1 = version1.content;
    const content2 = version2.content;
    
    const words1 = content1.split(/\s+/);
    const words2 = content2.split(/\s+/);
    
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    const additions = words2.filter(w => !set1.has(w)).length;
    const deletions = words1.filter(w => !set2.has(w)).length;
    const changes = additions + deletions;
    
    return { additions, deletions, changes };
  }
}

// ============================================================
// Export/Import Utilities
// ============================================================

export class ExportImportManager {
  async exportDocument(documentId: string, format: 'json' | 'html' | 'markdown' = 'json'): Promise<Blob> {
    const docKey = `doc_${documentId}`;
    const content = localStorage.getItem(docKey);
    
    if (!content) {
      throw new Error(`Document ${documentId} not found`);
    }
    
    let exportContent = content;
    let mimeType = 'application/json';
    let extension = 'json';
    
    if (format === 'html') {
      exportContent = this.convertToHTML(content);
      mimeType = 'text/html';
      extension = 'html';
    } else if (format === 'markdown') {
      exportContent = this.convertToMarkdown(content);
      mimeType = 'text/markdown';
      extension = 'md';
    }
    
    return new Blob([exportContent], { type: mimeType });
  }
  
  async importDocument(file: File, documentId?: string): Promise<string> {
    const content = await file.text();
    const id = documentId || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Detect format
    let processedContent = content;
    
    if (file.name.endsWith('.html') || content.startsWith('<!DOCTYPE') || content.startsWith('<html')) {
      processedContent = this.convertFromHTML(content);
    } else if (file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
      processedContent = this.convertFromMarkdown(content);
    }
    
    // Store document
    const docKey = `doc_${id}`;
    localStorage.setItem(docKey, processedContent);
    
    console.log(`✅ Document imported: ${id}`);
    
    return id;
  }
  
  private convertToHTML(jsonContent: string): string {
    try {
      const data = JSON.parse(jsonContent);
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Exported Document</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; }
  </style>
</head>
<body>
${data.content || jsonContent}
</body>
</html>`;
    } catch {
      return `<!DOCTYPE html><html><body>${jsonContent}</body></html>`;
    }
  }
  
  private convertToMarkdown(jsonContent: string): string {
    try {
      const data = JSON.parse(jsonContent);
      // Simple HTML to Markdown conversion
      return (data.content || jsonContent)
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        .replace(/<[^>]+>/g, '')
        .trim();
    } catch {
      return jsonContent;
    }
  }
  
  private convertFromHTML(htmlContent: string): string {
    // Extract body content
    const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const content = bodyMatch ? bodyMatch[1] : htmlContent;
    
    return JSON.stringify({ content, format: 'html' });
  }
  
  private convertFromMarkdown(markdownContent: string): string {
    // Simple Markdown to HTML conversion
    const html = markdownContent
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/\n\n/gim, '</p><p>')
      .trim();
    
    return JSON.stringify({ content: `<p>${html}</p>`, format: 'markdown' });
  }
  
  async exportAllDocuments(format: 'json' | 'html' | 'markdown' = 'json'): Promise<Blob> {
    const documents: any[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('doc_')) {
        const content = localStorage.getItem(key);
        if (content) {
          documents.push({
            id: key.replace('doc_', ''),
            content: JSON.parse(content),
          });
        }
      }
    }
    
    const exportData = {
      version: '1.0.0',
      exported: new Date().toISOString(),
      documentCount: documents.length,
      documents,
    };
    
    return new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  }
  
  async importAllDocuments(file: File): Promise<number> {
    const content = await file.text();
    const data = JSON.parse(content);
    
    if (!data.documents || !Array.isArray(data.documents)) {
      throw new Error('Invalid export file format');
    }
    
    let importCount = 0;
    
    for (const doc of data.documents) {
      const docKey = `doc_${doc.id}`;
      localStorage.setItem(docKey, JSON.stringify(doc.content));
      importCount++;
    }
    
    console.log(`✅ Imported ${importCount} documents`);
    
    return importCount;
  }
}

// ============================================================
// Disaster Recovery
// ============================================================

export class DisasterRecoveryManager {
  private backupManager: BackupManager;
  private versionManager: VersionSnapshotManager;
  private exportManager: ExportImportManager;
  
  constructor() {
    this.backupManager = new BackupManager();
    this.versionManager = new VersionSnapshotManager();
    this.exportManager = new ExportImportManager();
  }
  
  async createEmergencyBackup(): Promise<BackupMetadata> {
    console.log('🚨 Creating emergency backup...');
    return await this.backupManager.createBackup('full');
  }
  
  async recoverFromDisaster(backupId?: string): Promise<void> {
    console.log('🔄 Starting disaster recovery...');
    
    try {
      // If no backup ID specified, use latest backup
      if (!backupId) {
        const backups = this.backupManager.getBackups();
        if (backups.length === 0) {
          throw new Error('No backups available for recovery');
        }
        backupId = backups[0].id;
      }
      
      // Verify backup integrity
      const isValid = await this.backupManager.verifyBackup(backupId);
      if (!isValid) {
        throw new Error('Backup verification failed - data may be corrupted');
      }
      
      // Create emergency backup before recovery
      await this.createEmergencyBackup();
      
      // Restore from backup
      await this.backupManager.restoreBackup(backupId);
      
      console.log('✅ Disaster recovery completed successfully');
    } catch (error) {
      console.error('❌ Disaster recovery failed:', error);
      throw error;
    }
  }
  
  async exportForDisasterRecovery(): Promise<Blob> {
    console.log('📦 Creating disaster recovery export...');
    
    const exportData = {
      version: '1.0.0',
      exported: new Date().toISOString(),
      type: 'disaster_recovery',
      documents: await this.exportManager.exportAllDocuments('json'),
      backups: this.backupManager.getBackups(),
    };
    
    return new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  }
  
  async importDisasterRecovery(file: File): Promise<void> {
    console.log('📥 Importing disaster recovery data...');
    
    const content = await file.text();
    const data = JSON.parse(content);
    
    if (data.type !== 'disaster_recovery') {
      throw new Error('Invalid disaster recovery file');
    }
    
    // Import documents
    if (data.documents) {
      const docBlob = new Blob([JSON.stringify(data.documents)], { type: 'application/json' });
      const docFile = new File([docBlob], 'documents.json');
      await this.exportManager.importAllDocuments(docFile);
    }
    
    console.log('✅ Disaster recovery import completed');
  }
  
  async getRecoveryOptions(): Promise<{
    backups: BackupMetadata[];
    canRecover: boolean;
    lastBackup?: string;
  }> {
    const backups = this.backupManager.getBackups();
    const canRecover = backups.length > 0;
    const lastBackup = backups.length > 0 ? backups[0].timestamp : undefined;
    
    return {
      backups,
      canRecover,
      lastBackup,
    };
  }
  
  generateRecoveryReport(): string {
    const backups = this.backupManager.getBackups();
    const storage = this.backupManager.getStorageUsage();
    
    return `
Disaster Recovery Report
========================
Generated: ${new Date().toISOString()}

Backup Status:
- Total Backups: ${backups.length}
- Last Backup: ${backups.length > 0 ? backups[0].timestamp : 'None'}
- Storage Used: ${this.formatBytes(storage.used)} / ${this.formatBytes(storage.total)}

Backup List:
${backups.map(b => `- ${b.id}: ${b.timestamp} (${b.type}, ${this.formatBytes(b.size)})`).join('\n')}

Recovery Procedures:
1. Emergency Backup: Create immediate backup before any major operation
2. Full Recovery: Restore from latest backup
3. Selective Recovery: Restore specific documents from backup
4. Version Recovery: Restore specific document version

Recommendations:
- Enable automatic daily backups
- Keep at least 30 days of backup history
- Test recovery procedures monthly
- Store backups in multiple locations
    `.trim();
  }
  
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}
