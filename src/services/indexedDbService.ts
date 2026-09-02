/**
 * IndexedDB storage utility for large datasets (30,000+ products)
 */
const DB_NAME = 'ContentOpsDB_v4';
const DB_VERSION = 2;

export interface DBStores {
  products: 'products';
  tasks: 'tasks';
  groups: 'groups';
  contacts: 'contacts';
  newProducts: 'newProducts';
  groupOrders: 'groupOrders';
  metadata: 'metadata';
  bitrixLinks: 'bitrixLinks';
}

class IndexedDBManager {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not available'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('products')) {
          db.createObjectStore('products', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('tasks')) {
          db.createObjectStore('tasks', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('groups')) {
          db.createObjectStore('groups', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('contacts')) {
          db.createObjectStore('contacts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('newProducts')) {
          db.createObjectStore('newProducts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('groupOrders')) {
          db.createObjectStore('groupOrders', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('bitrixLinks')) {
          db.createObjectStore('bitrixLinks', { keyPath: 'code' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return [];
    }
  }

  async setAll<T>(storeName: string, items: T[]): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);

        store.clear();
        for (const item of items) {
          store.put(item);
        }

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (e) {
      console.warn('IndexedDB setAll failed:', e);
    }
  }

  async putMetadata(key: string, value: any): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction('metadata', 'readwrite');
        const store = transaction.objectStore('metadata');
        store.put({ key, value, updatedAt: new Date().toISOString() });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch {
      // ignore
    }
  }

  async getMetadata<T>(key: string): Promise<T | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const transaction = db.transaction('metadata', 'readonly');
        const store = transaction.objectStore('metadata');
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result?.value ?? null);
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }
}

export const idb = new IndexedDBManager();
