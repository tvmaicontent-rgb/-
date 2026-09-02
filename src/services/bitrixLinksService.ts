import { idb } from './indexedDbService';

const BITRIX_BASE_URL = 'https://diy.by/bitrix/admin/iblock_element_edit.php?IBLOCK_ID=15&ID={ID}&type=CRM_PRODUCT_CATALOG&lang=ru&find_section_section=-1&WF=Y';
const SPREADSHEET_ID = '1vCZQgzBPv8uahr8ckRI1f-TA_QS6Afz2B9NP_ZMj6ek';

class BitrixLinksService {
  private codeToIdMap = new Map<string, string>();
  private isLoading = false;
  private isLoaded = false;
  private listeners: Array<() => void> = [];
  private lastFetchTime = 0;

  constructor() {
    this.initFromStorage();
  }

  private async initFromStorage() {
    try {
      // Try to load cached links from IndexedDB
      const cached = await idb.getAll<{ code: string; id: string }>('bitrixLinks').catch(() => []);
      if (cached && cached.length > 0) {
        for (const item of cached) {
          if (item.code && item.id) {
            this.codeToIdMap.set(String(item.code).trim(), String(item.id).trim());
          }
        }
        this.isLoaded = true;
        this.notify();
      }
    } catch {
      // ignore
    }

    // Auto-fetch in background if cache is empty or older than 1 hour
    if (this.codeToIdMap.size === 0) {
      this.fetchLinks().catch(() => {});
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => {
      try {
        l();
      } catch (e) {
        console.error(e);
      }
    });
  }

  getIsLoading(): boolean {
    return this.isLoading;
  }

  getIsLoaded(): boolean {
    return this.isLoaded;
  }

  getId(externalCode: string | number): string | undefined {
    if (!externalCode) return undefined;
    const clean = String(externalCode).trim();
    return this.codeToIdMap.get(clean);
  }

  getUrl(externalCode: string | number): string | null {
    const id = this.getId(externalCode);
    if (!id) return null;
    return BITRIX_BASE_URL.replace('{ID}', encodeURIComponent(id));
  }

  /**
   * Fetch links from server API or direct Google Sheets GViz CSV
   */
  async fetchLinks(force = false): Promise<number> {
    if (this.isLoading) return this.codeToIdMap.size;
    if (!force && this.isLoaded && this.codeToIdMap.size > 0 && Date.now() - this.lastFetchTime < 3600000) {
      return this.codeToIdMap.size;
    }

    this.isLoading = true;
    this.notify();

    try {
      // 1. Try fetching from server API
      let loadedFromServer = false;
      try {
        const res = await fetch('/api/bitrix-links');
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.links) {
            const entries: Array<{ code: string; id: string }> = [];
            for (const [code, id] of Object.entries(data.links)) {
              const c = String(code).trim();
              const i = String(id).trim();
              if (c && i) {
                this.codeToIdMap.set(c, i);
                entries.push({ code: c, id: i });
              }
            }
            loadedFromServer = true;
            this.lastFetchTime = Date.now();
            this.isLoaded = true;

            // Save to IndexedDB asynchronously
            idb.setAll('bitrixLinks', entries).catch(() => {});
          }
        }
      } catch {
        // Fallback to direct client Google Sheets fetch
      }

      // 2. Fallback to direct Google Sheets GViz export
      if (!loadedFromServer) {
        const sheetNames = ['Сссылки', 'Ссылки'];
        let csvText = '';

        for (const sheetName of sheetNames) {
          try {
            const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
            const res = await fetch(url);
            if (res.ok) {
              const text = await res.text();
              if (text && (text.includes('Внешний код') || text.includes('ID элемента') || text.split('\n').length > 10)) {
                csvText = text;
                break;
              }
            }
          } catch {
            // try next
          }
        }

        if (csvText) {
          const lines = csvText.split(/\r?\n/);
          const entries: Array<{ code: string; id: string }> = [];

          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Parse CSV row with simple regex for quoted or comma separated values
            const match = line.match(/^"([^"]*)","([^"]*)"/) || line.match(/^([^,]+),([^,]+)/);
            if (match) {
              const code = match[1].trim();
              const id = match[2].trim();
              if (code && id && code !== 'Внешний код') {
                this.codeToIdMap.set(code, id);
                entries.push({ code, id });
              }
            }
          }

          this.lastFetchTime = Date.now();
          this.isLoaded = true;

          // Save to IndexedDB asynchronously
          idb.setAll('bitrixLinks', entries).catch(() => {});
        }
      }

      return this.codeToIdMap.size;
    } catch (err) {
      console.error('Failed to fetch bitrix links:', err);
      return this.codeToIdMap.size;
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  /**
   * Look up specific codes if not in map yet
   */
  async lookupCodes(codes: string[]): Promise<Record<string, string>> {
    const missing = codes.filter(c => c && !this.codeToIdMap.has(String(c).trim()));
    if (missing.length === 0) {
      const result: Record<string, string> = {};
      for (const c of codes) {
        const id = this.getId(c);
        if (id) result[c] = id;
      }
      return result;
    }

    try {
      // If server route available
      const res = await fetch('/api/bitrix-links/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codes: missing }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.links) {
          for (const [code, id] of Object.entries(data.links)) {
            this.codeToIdMap.set(String(code).trim(), String(id).trim());
          }
          this.notify();
        }
      } else {
        // Fallback: fetch all links
        await this.fetchLinks();
      }
    } catch {
      await this.fetchLinks();
    }

    const result: Record<string, string> = {};
    for (const c of codes) {
      const id = this.getId(c);
      if (id) result[c] = id;
    }
    return result;
  }
}

export const bitrixLinksService = new BitrixLinksService();
