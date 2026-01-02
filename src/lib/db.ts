export interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  wordCount: number;
  isStarred: boolean;
  isArchived: boolean;
  isEdited: boolean;
  editHistory: Array<{
    timestamp: Date;
    changes: string;
  }>;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  lastBackup: Date | null;
}

export class DiaryDBService {
  private dbName = 'diary-app-v2';
  private dbVersion = 2;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    if (!window.indexedDB) {
      throw new Error('您的瀏覽器不支持 IndexedDB');
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(new Error('數據庫初始化失敗'));

      request.onsuccess = () => {
        this.db = request.result;
        this.initSettings().then(resolve).catch(reject);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('diary')) {
          const diaryStore = db.createObjectStore('diary', { keyPath: 'id' });
          diaryStore.createIndex('by-date', 'createdAt');
          diaryStore.createIndex('by-starred', 'isStarred');
          diaryStore.createIndex('by-archived', 'isArchived');
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  private async initSettings(): Promise<void> {
    const settings = await this.getSettings();
    if (!settings) {
      await this.saveSettings({
        key: 'app',
        theme: 'light',
        lastBackup: null,
      });
    }
  }

  private async dbOperation<T>(
    storeNames: string | string[],
    mode: IDBTransactionMode,
    operation: (transaction: IDBTransaction) => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('數據庫未初始化'));
        return;
      }

      const stores = Array.isArray(storeNames) ? storeNames : [storeNames];
      const transaction = this.db.transaction(stores, mode);
      transaction.onerror = () => reject(transaction.error);
      operation(transaction).then(resolve).catch(reject);
    });
  }

  private parseDate(date: any): Date {
    if (date instanceof Date) return date;
    return new Date(date);
  }

  private async getSettings(): Promise<any> {
    return this.dbOperation('settings', 'readonly', (tx) => {
      return new Promise((resolve, reject) => {
        const request = tx.objectStore('settings').get('app');
        request.onsuccess = () => {
          const result = request.result;
          if (result?.lastBackup) {
            result.lastBackup = this.parseDate(result.lastBackup);
          }
          resolve(result);
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  private async saveSettings(settings: any): Promise<void> {
    return this.dbOperation('settings', 'readwrite', (tx) => {
      return new Promise<void>((resolve, reject) => {
        const request = tx.objectStore('settings').put(settings);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  }

  private normalizeDiaryEntry(entry: any): DiaryEntry {
    return {
      ...entry,
      createdAt: this.parseDate(entry.createdAt),
      updatedAt: this.parseDate(entry.updatedAt),
      isStarred: entry.isStarred ?? false,
      isArchived: entry.isArchived ?? false,
      isEdited: entry.isEdited ?? false,
      editHistory: (entry.editHistory || []).map((h: any) => ({
        ...h,
        timestamp: this.parseDate(h.timestamp)
      })),
    };
  }

  async getAllDiaries(): Promise<DiaryEntry[]> {
    return this.dbOperation('diary', 'readonly', (tx) => {
      return new Promise((resolve, reject) => {
        const request = tx.objectStore('diary').getAll();
        request.onsuccess = () => {
          const entries = request.result.map((entry: any) => this.normalizeDiaryEntry(entry));
          resolve(entries);
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  async getDiary(id: string): Promise<DiaryEntry | undefined> {
    return this.dbOperation('diary', 'readonly', (tx) => {
      return new Promise((resolve, reject) => {
        const request = tx.objectStore('diary').get(id);
        request.onsuccess = () => {
          const entry = request.result;
          resolve(entry ? this.normalizeDiaryEntry(entry) : undefined);
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  async createDiary(diary: Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt' | 'wordCount' | 'isStarred' | 'isArchived' | 'isEdited' | 'editHistory'> & { createdAt?: Date }): Promise<string> {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const wordCount = this.calculateWordCount(diary.content);
    const now = diary.createdAt || new Date();
    const entry: DiaryEntry = {
      ...diary,
      id,
      createdAt: now,
      updatedAt: now,
      wordCount,
      isStarred: false,
      isArchived: false,
      isEdited: false,
      editHistory: [],
    };

    await this.dbOperation('diary', 'readwrite', async (tx) => {
      return new Promise<void>((resolve, reject) => {
        const request = tx.objectStore('diary').put(entry);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    return id;
  }

  async updateDiary(
    id: string,
    updates: Partial<Omit<DiaryEntry, 'id' | 'createdAt'>>
  ): Promise<void> {
    const existing = await this.getDiary(id);
    if (!existing) return;

    const newWordCount = updates.content
      ? this.calculateWordCount(updates.content)
      : existing.wordCount;

    const hasContentChange = updates.content !== undefined && updates.content !== existing.content;
    const hasTitleChange = updates.title !== undefined && updates.title !== existing.title;
    const hasActualChange = hasContentChange || hasTitleChange;

    const newEditHistory = updates.editHistory !== undefined 
      ? updates.editHistory 
      : existing.editHistory || [];

    const updated: DiaryEntry = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
      wordCount: newWordCount,
      isEdited: updates.isEdited !== undefined ? updates.isEdited : (existing.isEdited || hasActualChange),
      editHistory: newEditHistory,
    };

    await this.dbOperation('diary', 'readwrite', async (tx) => {
      return new Promise<void>((resolve) => {
        tx.objectStore('diary').put(updated);
        resolve();
      });
    });
  }

  async toggleStarred(id: string): Promise<void> {
    const diary = await this.getDiary(id);
    if (!diary) return;
    await this.updateDiary(id, { isStarred: !diary.isStarred });
  }

  async toggleArchived(id: string): Promise<void> {
    const diary = await this.getDiary(id);
    if (!diary) return;
    await this.updateDiary(id, { isArchived: !diary.isArchived });
  }

  async deleteDiary(id: string): Promise<void> {
    await this.dbOperation('diary', 'readwrite', async (tx) => {
      return new Promise<void>((resolve) => {
        tx.objectStore('diary').delete(id);
        resolve();
      });
    });
  }

  private calculateWordCount(content: string): number {
    const cleanContent = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (!cleanContent) return 0;

    let totalCount = 0;
    const cjkChars = cleanContent.match(/[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g);
    totalCount += cjkChars ? cjkChars.length : 0;

    const nonCjkContent = cleanContent.replace(/[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g, ' ');
    const englishWords = nonCjkContent
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0 && /[a-zA-Z0-9]/.test(word));
    
    totalCount += englishWords.length;
    return totalCount;
  }

  async getTheme(): Promise<'light' | 'dark'> {
    const settings = await this.getSettings();
    return settings?.theme || 'light';
  }

  async setTheme(theme: 'light' | 'dark'): Promise<void> {
    const settings = await this.getSettings();
    if (settings) {
      settings.theme = theme;
      await this.saveSettings(settings);
    }
  }

  async setShowTitle(show: boolean): Promise<void> {
    const settings = await this.getSettings();
    if (settings) {
      settings.showTitle = show;
      await this.saveSettings(settings);
    }
  }

  async getShowTitle(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings?.showTitle !== undefined ? settings.showTitle : true; // 預設顯示標題
  }

  async getLastBackup(): Promise<Date | null> {
    const settings = await this.getSettings();
    return settings?.lastBackup || null;
  }

  async updateLastBackup(): Promise<void> {
    const settings = await this.getSettings();
    if (settings) {
      settings.lastBackup = new Date();
      await this.saveSettings(settings);
    }
  }

  async backupData(): Promise<string> {
    const diaries = await this.getAllDiaries();
    const settings = await this.getSettings();

    const data = {
      diaries,
      settings,
      exportDate: new Date().toISOString(),
    };

    return JSON.stringify(data, null, 2);
  }

  async restoreBackup(backupJson: string): Promise<void> {
    try {
      const data = JSON.parse(backupJson);
      if (!data.diaries || !Array.isArray(data.diaries)) {
        throw new Error('備份數據格式錯誤');
      }
      await this.importData(data);
    } catch (error) {
      throw new Error('備份數據無效或已損壞');
    }
  }

  private async importData(data: { diaries: DiaryEntry[]; settings: any }): Promise<void> {
    await this.dbOperation(['diary', 'settings'], 'readwrite', async (tx) => {
      return new Promise<void>(resolve => {
        const diaryStore = tx.objectStore('diary');
        const settingsStore = tx.objectStore('settings');

        diaryStore.clear();
        
        data.diaries.forEach(diary => {
          diaryStore.put({
            ...diary,
            isStarred: diary.isStarred ?? false,
            isArchived: diary.isArchived ?? false,
            isEdited: diary.isEdited ?? false,
            editHistory: diary.editHistory || [],
          });
        });

        if (data.settings) {
          settingsStore.put({
            key: 'app',
            ...data.settings,
          });
        }

        resolve();
      });
    });
  }

  async getAllKeysFromStore(storeName: string): Promise<IDBValidKey[]> {
    return this.dbOperation(storeName, 'readonly', (tx) => {
      return new Promise((resolve, reject) => {
        const request = tx.objectStore(storeName).getAllKeys();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async deleteFromStore(storeName: string, key: string): Promise<void> {
    return this.dbOperation(storeName, 'readwrite', (tx) => {
      return new Promise<void>(resolve => {
        tx.objectStore(storeName).delete(key);
        resolve();
      });
    });
  }
}

export const dbService = new DiaryDBService();
