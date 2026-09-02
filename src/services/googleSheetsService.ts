import { ProductItem, TaskItem, CategoryGroup, GroupOrderItem, NewProductItem, SupplierContact, DepartmentType } from '../types';
import { idb } from './indexedDbService';
import { storageService } from './storageService';
import { authService } from './authService';
import { bitrixLinksService } from './bitrixLinksService';
import { safeErrorMessage } from '../utils/errorUtils';

export interface SyncResult {
  success: boolean;
  contentCount: number;
  kamCount: number;
  tasksCount: number;
  groupsCount: number;
  newProductsCount: number;
  contactsCount: number;
  timestamp: string;
  error?: string;
  source?: string;
}

export interface PushLogItem {
  id: string;
  title: string;
  details: string;
  time: string;
  status: 'pending' | 'success' | 'error';
}

const DEFAULT_SPREADSHEET_ID = '1vCZQgzBPv8uahr8ckRI1f-TA_QS6Afz2B9NP_ZMj6ek';
const GROUPS_SPREADSHEET_ID = '1LABW3U4TdX6cDjps_g_mBBsWRW8_Xx7W8LqBZB4CO2g';

const GIDS = {
  CONTENT: '59376984',
  KAM: '183144046',
  TASKS: '1482592400',
  NEW_PRODUCTS: '413377182',
  CONTACTS: '1825148105',
  MANAGERS: '1474629181',
  WORKING_KAM: '1367779997',
  WORKING_CONTENT: '33531424',
  GROUPS: '0',
  SITE_ORDER: '442661295',
};

// Client-side CSV helper
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let field = '';

  let cleanText = text || '';
  if (cleanText.charCodeAt(0) === 0xfeff) {
    cleanText = cleanText.slice(1);
  }

  for (let i = 0; i < cleanText.length; i++) {
    const c = cleanText[i];
    if (inQuotes) {
      if (c === '"') {
        if (i + 1 < cleanText.length && cleanText[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && i + 1 < cleanText.length && cleanText[i + 1] === '\n') {
          i++;
        }
        row.push(field);
        field = '';
        if (row.some(f => f.trim().length > 0)) {
          lines.push(row);
        }
        row = [];
      } else {
        field += c;
      }
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some(f => f.trim().length > 0)) {
      lines.push(row);
    }
  }

  return lines;
}

function cleanStr(val: string | undefined | null): string {
  if (!val) return '';
  return val.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

function extractBatchInfo(header: string) {
  const raw = cleanStr(header);
  let fileName = '';
  const fileMatch =
    raw.match(/\((export_[^)]+\.(?:xlsx|xls))\)/i) ||
    raw.match(/\(([^)]+\.(?:xlsx|xls))\)/i) ||
    raw.match(/\(([^)]+)\)/);
  if (fileMatch) {
    fileName = fileMatch[1].trim();
  }

  const dateMatch = raw.match(/(\d{2}\.\d{2}\.\d{4}(?:\s+\d{2}:\d{2}(?::\d{2})?)?)/);
  const dateStr = dateMatch ? dateMatch[1] : '';

  let displayTitle = raw;
  if (!displayTitle.startsWith('📅') && !displayTitle.startsWith('Партия')) {
    displayTitle = `📅 ${raw}`;
  }

  return {
    title: displayTitle,
    date: dateStr || raw,
    file: fileName || (dateStr ? `Партия от ${dateStr}` : raw),
  };
}

export class GoogleSheetsService {
  private isSyncing = false;
  private lastSyncTime: string | null = null;
  private listeners: Array<() => void> = [];
  private webhookUrl: string = '';
  private pushLogs: PushLogItem[] = [];
  private autoSyncInterval: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('GOOGLE_SHEETS_WEBHOOK_URL');
        if (saved) {
          this.webhookUrl = saved;
        }
      } catch {
        // ignore
      }
    }
  }

  getWebhookUrl(): string {
    return this.webhookUrl;
  }

  setWebhookUrl(url: string): void {
    this.webhookUrl = (url || '').trim();
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('GOOGLE_SHEETS_WEBHOOK_URL', this.webhookUrl);
      } catch {
        // ignore
      }
    }
    // Also save to server if admin
    if (authService.isAdmin()) {
      authService.fetchWithAuth('/api/sheets/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: this.webhookUrl }),
      }).catch(() => {});
    }
    this.notify();
  }

  clearWebhookUrl(): void {
    this.webhookUrl = '';
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('GOOGLE_SHEETS_WEBHOOK_URL');
      } catch {
        // ignore
      }
    }
    this.notify();
  }

  getPushLog(): PushLogItem[] {
    return [...this.pushLogs];
  }

  clearLogs(): void {
    this.pushLogs = [];
    this.notify();
  }

  private addLog(title: string, details: string, status: 'pending' | 'success' | 'error'): string {
    const id = `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    this.pushLogs.unshift({ id, title, details, time, status });
    if (this.pushLogs.length > 50) this.pushLogs.pop();
    this.notify();
    return id;
  }

  private updateLog(id: string, status: 'success' | 'error', details?: string) {
    const item = this.pushLogs.find(l => l.id === id);
    if (item) {
      item.status = status;
      if (details) item.details = details;
      this.notify();
    }
  }

  /**
   * Test webhook connection securely via server proxy or direct fallback
   */
  async testWebhook(targetUrl?: string): Promise<{ success: boolean; message: string; spreadsheetName?: string }> {
    const url = (targetUrl !== undefined ? targetUrl : this.webhookUrl).trim();

    try {
      const res = await authService.fetchWithAuth('/api/sheets/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: url }),
      });

      if (res.status === 404 && url) {
        // Direct client fallback
        const directRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'ping' }),
        });
        const data = await directRes.json();
        return {
          success: Boolean(data && data.success),
          message: data?.message || 'Связь с Google Apps Script активна',
          spreadsheetName: data?.spreadsheetName,
        };
      }

      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          message: data.message || 'Связь с Google Apps Script активна',
          spreadsheetName: data.spreadsheetName,
        };
      }
      return {
        success: false,
        message: safeErrorMessage(data?.message || data?.error, 'Ошибка связи с Google Apps Script'),
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Ошибка: ${safeErrorMessage(err, 'Сбой подключения к Webhook')}`,
      };
    }
  }

  private async fetchDirectCsv(docId: string, gid: string): Promise<string> {
    const url = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=${gid}&_t=${Date.now()}`;
    const res = await fetch(url, {
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
      },
    });
    if (!res.ok) {
      throw new Error(`Google Sheets HTTP ${res.status} for gid ${gid}`);
    }
    return res.text();
  }

  private async performClientDirectSync(): Promise<SyncResult> {
    const [
      contentCsv,
      kamCsv,
      tasksCsv,
      newProductsCsv,
      contactsCsv,
      managersCsv,
      groupsCsv,
      orderCsv,
    ] = await Promise.all([
      this.fetchDirectCsv(DEFAULT_SPREADSHEET_ID, GIDS.CONTENT),
      this.fetchDirectCsv(DEFAULT_SPREADSHEET_ID, GIDS.KAM),
      this.fetchDirectCsv(DEFAULT_SPREADSHEET_ID, GIDS.TASKS),
      this.fetchDirectCsv(DEFAULT_SPREADSHEET_ID, GIDS.NEW_PRODUCTS),
      this.fetchDirectCsv(DEFAULT_SPREADSHEET_ID, GIDS.CONTACTS).catch(() => ''),
      this.fetchDirectCsv(DEFAULT_SPREADSHEET_ID, GIDS.MANAGERS).catch(() => ''),
      this.fetchDirectCsv(GROUPS_SPREADSHEET_ID, GIDS.GROUPS).catch(() => ''),
      this.fetchDirectCsv(GROUPS_SPREADSHEET_ID, GIDS.SITE_ORDER).catch(() => ''),
    ]);

    const contentRows = parseCSV(contentCsv).slice(1);
    const kamRows = parseCSV(kamCsv).slice(1);
    const taskRows = parseCSV(tasksCsv).slice(1);
    const newProductRawRows = parseCSV(newProductsCsv);
    const contactRawRows = contactsCsv ? parseCSV(contactsCsv).slice(1) : [];
    const managerRawRows = managersCsv ? parseCSV(managersCsv).slice(1) : [];

    const managersDict: Record<string, string> = {};
    for (const mr of managerRawRows) {
      const code = cleanStr(mr[0]);
      const name = cleanStr(mr[1]);
      if (code && name) managersDict[code] = name;
    }

    const contentProducts: ProductItem[] = contentRows
      .filter(r => r && r.some(cell => cleanStr(cell).length > 0))
      .map((r, idx) => {
        const rawId = cleanStr(r[0]);
        const externalCode = cleanStr(r[1]);
        const group3 = cleanStr(r[2]);
        const title = cleanStr(r[3]);
        const dateUploaded = cleanStr(r[12]) || cleanStr(r[8]) || '';
        const sourceFile = cleanStr(r[11]) || (dateUploaded ? `Партия от ${dateUploaded}` : (rawId ? `Файл ${rawId}` : 'Google Sheets'));

        return {
          id: `cnt-${rawId || idx + 1}`,
          externalCode: externalCode || (rawId ? `SKU-${rawId}` : `SKU-${idx + 1}`),
          group3,
          title: title || group3 || `Товар ${externalCode || rawId || idx + 1}`,
          status: cleanStr(r[4]) || '🆕 Новый',
          pauseReason: cleanStr(r[5]),
          pauseDate: cleanStr(r[6]),
          executor: cleanStr(r[7]),
          dateTaken: cleanStr(r[8]),
          dateCompleted: cleanStr(r[9]),
          dateFinished: cleanStr(r[10]),
          sourceFile,
          dateUploaded: dateUploaded || new Date().toLocaleDateString('ru-RU'),
          department: 'Отдел контента' as DepartmentType,
        };
      })
      .filter(p => p.externalCode || p.title || p.group3);

    const kamProducts: ProductItem[] = kamRows
      .filter(r => r && r.some(cell => cleanStr(cell).length > 0))
      .map((r, idx) => {
        const rawId = cleanStr(r[0]);
        const externalCode = cleanStr(r[1]);
        const group3 = cleanStr(r[2]);
        const title = cleanStr(r[3]);
        const dateUploaded = cleanStr(r[12]) || cleanStr(r[8]) || '';
        const sourceFile = cleanStr(r[11]) || (dateUploaded ? `Партия от ${dateUploaded}` : (rawId ? `Файл ${rawId}` : 'Google Sheets'));

        return {
          id: `kam-${rawId || idx + 1}`,
          externalCode: externalCode || (rawId ? `SKU-${rawId}` : `SKU-${idx + 1}`),
          group3,
          title: title || group3 || `Товар ${externalCode || rawId || idx + 1}`,
          status: cleanStr(r[4]) || '🆕 Новый',
          pauseReason: cleanStr(r[5]),
          pauseDate: cleanStr(r[6]),
          executor: cleanStr(r[7]),
          dateTaken: cleanStr(r[8]),
          dateCompleted: cleanStr(r[9]),
          dateFinished: cleanStr(r[10]),
          sourceFile,
          dateUploaded: dateUploaded || new Date().toLocaleDateString('ru-RU'),
          department: 'Коммерческий отдел' as DepartmentType,
        };
      })
      .filter(p => p.externalCode || p.title || p.group3);

    const tasks: TaskItem[] = taskRows.map((r, idx) => ({
      id: cleanStr(r[0]) || String(idx + 1),
      title: cleanStr(r[1]),
      description: cleanStr(r[2]),
      executors: cleanStr(r[3]),
      status: (cleanStr(r[4]) || 'Новая') as TaskItem['status'],
      urgency: (cleanStr(r[5]) || 'Текущая задача') as TaskItem['urgency'],
      imageBase64: cleanStr(r[6]),
      createdAt: cleanStr(r[7]),
      updatedAt: cleanStr(r[8]),
    }));

    const contacts: SupplierContact[] = contactRawRows
      .map((r, idx) => ({
        id: `cont-${idx + 1}`,
        producer: cleanStr(r[0]),
        site: cleanStr(r[1]),
        contact: cleanStr(r[2]),
        name: cleanStr(r[3]),
        productGroups: cleanStr(r[4]),
        note: cleanStr(r[5]),
      }))
      .filter(c => c.producer || c.name || c.contact || c.site || c.productGroups || c.note);

    const newProducts: NewProductItem[] = [];
    let currentBatch = extractBatchInfo('Загрузка: 20.05.2026 09:15:20');

    for (let i = 0; i < newProductRawRows.length; i++) {
      const r = newProductRawRows[i];
      const firstCell = cleanStr(r[0]);
      const isBatchHeader =
        firstCell.startsWith('📅') ||
        firstCell.toLowerCase().startsWith('загрузка') ||
        (firstCell.length > 10 && !/^\d{5,10}$/.test(firstCell) && firstCell !== 'Внешний код');

      if (isBatchHeader) {
        currentBatch = extractBatchInfo(firstCell);
        continue;
      }

      if (firstCell === 'Внешний код' || !firstCell) continue;

      let mgrCode = cleanStr(r[3]);
      let mgrName = cleanStr(r[5]);
      let section = cleanStr(r[4]);

      if (/^\d+$/.test(section) && !mgrCode) {
        mgrCode = section;
        section = mgrName;
        mgrName = '';
      }

      if (!mgrName && mgrCode && managersDict[mgrCode]) {
        mgrName = managersDict[mgrCode];
      }

      const isAdded = (r[7] || '').toUpperCase() === 'TRUE' || (r[7] || '').toLowerCase().includes('да');
      const isExported = (r[8] || '').toUpperCase() === 'TRUE' || (r[8] || '').toLowerCase().includes('да');

      newProducts.push({
        id: `np-${i}`,
        externalCode: firstCell,
        title: cleanStr(r[1]),
        createdDate: cleanStr(r[2]),
        managerCode: mgrCode,
        sectionName: section,
        manager: mgrName,
        content: cleanStr(r[6]),
        isAdded,
        isExported,
        batchDate: currentBatch.date,
        batchFile: currentBatch.file,
        batchTitle: currentBatch.title,
      });
    }

    const groupsRows = groupsCsv ? parseCSV(groupsCsv).slice(1) : [];
    const categoryGroups: CategoryGroup[] = [];
    if (groupsRows.length > 0) {
      for (let i = 0; i < groupsRows.length; i++) {
        const r = groupsRows[i];
        if (!r || r.every(cell => !cleanStr(cell))) continue;
        const g3 = cleanStr(r[2]);
        if (!g3) continue;

        categoryGroups.push({
          id: `grp-${i + 1}`,
          group1: cleanStr(r[0]),
          group2: cleanStr(r[1]),
          group3: g3,
          manager: cleanStr(r[3]),
          includedMaterik: cleanStr(r[4]) || '0',
          includedPalas: cleanStr(r[5]) || '0',
          skuCount: cleanStr(r[6]) || '0',
          startDate: cleanStr(r[7]),
          donorRequestDate: cleanStr(r[8]),
          donorReceivedDate: cleanStr(r[9]),
          approvalSentDate: cleanStr(r[10]),
          approvalDate: cleanStr(r[11]),
          releaseDate: cleanStr(r[12]),
          palasAllocated: cleanStr(r[13]),
          kamFile: cleanStr(r[14]),
        });
      }
    }

    const orderRows = orderCsv ? parseCSV(orderCsv) : [];
    let currentGroup1 = '';
    let currentGroup2Cols: string[] = [];
    const groupOrders: GroupOrderItem[] = [];

    if (orderRows.length > 0) {
      for (let rowIndex = 0; rowIndex < orderRows.length; rowIndex++) {
        const r = orderRows[rowIndex].map(c => cleanStr(c));
        if (r.every(c => !c)) continue;

        const firstCell = r[0];
        const otherCells = r.slice(1).filter(Boolean);

        if (firstCell && otherCells.length === 0 && isNaN(Number(firstCell))) {
          currentGroup1 = firstCell;
          currentGroup2Cols = [];
          continue;
        }

        if (!firstCell && otherCells.length > 0) {
          currentGroup2Cols = r.slice(1);
          continue;
        }

        if (firstCell && !isNaN(Number(firstCell)) && currentGroup2Cols.length > 0) {
          const pos = parseInt(firstCell, 10);
          for (let colIdx = 0; colIdx < currentGroup2Cols.length; colIdx++) {
            const g2 = currentGroup2Cols[colIdx];
            const g3 = r[colIdx + 1];
            if (g3 && g2 && currentGroup1) {
              groupOrders.push({
                id: `ord-${groupOrders.length + 1}`,
                group1: currentGroup1,
                group2: g2,
                group3: g3,
                groupName: g3,
                section: g2,
                status: 'Активно',
                position: pos,
              });
            }
          }
        }
      }
    }

    const currentProducts = storageService.getProducts();
    const existingGoogleCodes = new Set(
      [...contentProducts, ...kamProducts].map(p => `${p.department}_${p.externalCode}_${p.sourceFile}`)
    );
    const customLocalProducts = currentProducts.filter(
      p => !existingGoogleCodes.has(`${p.department}_${p.externalCode}_${p.sourceFile}`) && p.sourceFile && !p.id.startsWith('cnt-') && !p.id.startsWith('kam-')
    );

    const allMergedProducts = [...customLocalProducts, ...contentProducts, ...kamProducts];

    storageService.saveProducts(allMergedProducts);
    storageService.saveTasks(tasks);
    if (categoryGroups.length > 0) storageService.saveCategoryGroups(categoryGroups);
    if (groupOrders.length > 0) storageService.saveGroupOrders(groupOrders);
    if (contacts.length > 0) storageService.saveContacts(contacts);
    if (newProducts.length > 0) storageService.saveNewProducts(newProducts);

    const nowStr = new Date().toLocaleString('ru-RU');
    await Promise.all([
      idb.setAll('products', allMergedProducts),
      idb.setAll('tasks', tasks),
      categoryGroups.length > 0 ? idb.setAll('groups', categoryGroups) : Promise.resolve(),
      groupOrders.length > 0 ? idb.setAll('groupOrders', groupOrders) : Promise.resolve(),
      contacts.length > 0 ? idb.setAll('contacts', contacts) : Promise.resolve(),
      newProducts.length > 0 ? idb.setAll('newProducts', newProducts) : Promise.resolve(),
      idb.putMetadata('last_sync', {
        time: nowStr,
        contentCount: contentProducts.length,
        kamCount: kamProducts.length,
        tasksCount: tasks.length,
        groupsCount: categoryGroups.length,
        newProductsCount: newProducts.length,
        contactsCount: contacts.length,
        source: 'Google Sheets (Direct)',
      }),
    ]);

    this.lastSyncTime = nowStr;
    bitrixLinksService.fetchLinks(true).catch(() => {});
    return {
      success: true,
      contentCount: contentProducts.length,
      kamCount: kamProducts.length,
      tasksCount: tasks.length,
      groupsCount: categoryGroups.length,
      newProductsCount: newProducts.length,
      contactsCount: contacts.length,
      timestamp: nowStr,
      source: 'Google Sheets (Direct)',
    };
  }

  /**
   * Main Synchronization method: Requests server proxy with Bearer authentication,
   * falls back to direct Google Sheets fetching if running on static hosting or server unreachable.
   */
  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        success: false,
        contentCount: 0,
        kamCount: 0,
        tasksCount: 0,
        groupsCount: 0,
        newProductsCount: 0,
        contactsCount: 0,
        timestamp: this.lastSyncTime || '',
        error: 'Синхронизация уже выполняется',
      };
    }

    this.isSyncing = true;
    this.notify();

    try {
      // Secure call through server with Bearer auth header
      let res: Response;
      let is404OrFailed = false;

      try {
        res = await authService.fetchWithAuth('/api/sheets/sync');
        if (res.status === 404) {
          is404OrFailed = true;
        }
      } catch {
        is404OrFailed = true;
      }

      if (is404OrFailed) {
        console.info('Server proxy /api/sheets/sync not found or unreachable, performing direct client sync fallback...');
        const directResult = await this.performClientDirectSync();
        this.isSyncing = false;
        this.notify();
        return directResult;
      }

      if (!res!.ok && res!.status !== 304) {
        const errorJson = await res!.json().catch(() => ({}));
        throw new Error(safeErrorMessage(errorJson?.error, `HTTP ${res!.status} при обращении к серверному прокси`));
      }

      const data = await res!.json();
      if (!data || data.success === false) {
        throw new Error(safeErrorMessage(data?.error, 'Сервер не вернул данные'));
      }

      const contentProducts: ProductItem[] = data.contentProducts || [];
      const kamProducts: ProductItem[] = data.kamProducts || [];
      const tasks: TaskItem[] = data.tasks || [];
      const categoryGroups: CategoryGroup[] = data.groups || [];
      const groupOrders: GroupOrderItem[] = data.groupOrders || [];
      const contacts: SupplierContact[] = data.contacts || [];
      const newProducts: NewProductItem[] = data.newProducts || [];

      // Preserve any locally uploaded custom files not yet on Google Sheets
      const currentProducts = storageService.getProducts();
      const existingGoogleCodes = new Set(
        [...contentProducts, ...kamProducts].map(p => `${p.department}_${p.externalCode}_${p.sourceFile}`)
      );
      const customLocalProducts = currentProducts.filter(
        p => !existingGoogleCodes.has(`${p.department}_${p.externalCode}_${p.sourceFile}`) && p.sourceFile && !p.id.startsWith('cnt-') && !p.id.startsWith('kam-')
      );

      const allMergedProducts = [...customLocalProducts, ...contentProducts, ...kamProducts];

      // Update storage and indexedDB
      storageService.saveProducts(allMergedProducts);
      storageService.saveTasks(tasks);
      if (categoryGroups.length > 0) storageService.saveCategoryGroups(categoryGroups);
      if (groupOrders.length > 0) storageService.saveGroupOrders(groupOrders);
      if (contacts.length > 0) storageService.saveContacts(contacts);

      // Preserve local new products
      const currentLocalNewProducts = storageService.getNewProducts();
      let mergedNewProducts: NewProductItem[] = [];
      if (newProducts.length > 0) {
        const googleCodes = new Set(
          newProducts.map(it => (it.externalCode || '').trim().toLowerCase()).filter(Boolean)
        );
        const unSyncedLocalItems = currentLocalNewProducts.filter(loc => {
          const code = (loc.externalCode || '').trim().toLowerCase();
          return code && !googleCodes.has(code);
        });
        mergedNewProducts = [...unSyncedLocalItems, ...newProducts];
      } else {
        mergedNewProducts = currentLocalNewProducts;
      }

      if (mergedNewProducts.length > 0) {
        storageService.saveNewProducts(mergedNewProducts);
      }

      // Save to IndexedDB
      await Promise.all([
        idb.setAll('products', allMergedProducts),
        idb.setAll('tasks', tasks),
        categoryGroups.length > 0 ? idb.setAll('groups', categoryGroups) : Promise.resolve(),
        groupOrders.length > 0 ? idb.setAll('groupOrders', groupOrders) : Promise.resolve(),
        contacts.length > 0 ? idb.setAll('contacts', contacts) : Promise.resolve(),
        mergedNewProducts.length > 0 ? idb.setAll('newProducts', mergedNewProducts) : Promise.resolve(),
        idb.putMetadata('last_sync', {
          time: data.timestamp || new Date().toLocaleString('ru-RU'),
          contentCount: contentProducts.length,
          kamCount: kamProducts.length,
          tasksCount: tasks.length,
          groupsCount: categoryGroups.length,
          newProductsCount: mergedNewProducts.length,
          contactsCount: contacts.length,
          source: data.source || 'Server Proxy',
        }),
      ]);

      this.lastSyncTime = data.timestamp || new Date().toLocaleString('ru-RU');
      this.isSyncing = false;
      this.notify();
      bitrixLinksService.fetchLinks(true).catch(() => {});

      return {
        success: true,
        contentCount: contentProducts.length,
        kamCount: kamProducts.length,
        tasksCount: tasks.length,
        groupsCount: categoryGroups.length,
        newProductsCount: mergedNewProducts.length,
        contactsCount: contacts.length,
        timestamp: this.lastSyncTime,
        source: data.source || 'Server Proxy',
      };
    } catch (err: any) {
      console.warn('Sync error, attempting direct client sync fallback:', err);
      try {
        const fallbackResult = await this.performClientDirectSync();
        this.isSyncing = false;
        this.notify();
        return fallbackResult;
      } catch (fallbackErr: any) {
        this.isSyncing = false;
        this.notify();
        return {
          success: false,
          contentCount: 0,
          kamCount: 0,
          tasksCount: 0,
          groupsCount: 0,
          newProductsCount: 0,
          contactsCount: 0,
          timestamp: this.lastSyncTime || '',
          error: safeErrorMessage(fallbackErr || err, 'Ошибка синхронизации данных'),
        };
      }
    }
  }

  /**
   * Push product status updates through server proxy or direct webhook
   */
  async pushProductStatusUpdate(
    files: string[],
    department: DepartmentType,
    updates: Partial<ProductItem>,
    externalCodes?: string[]
  ): Promise<boolean> {
    const title = `Обновление статуса: ${updates.status || 'изменения'}`;
    const details = `${department} — файлов: ${files.length} (${files.slice(0, 2).join(', ')}${files.length > 2 ? '...' : ''})`;
    const logId = this.addLog(title, details, 'pending');

    try {
      const res = await authService.fetchWithAuth('/api/sheets/push-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department,
          files,
          updates,
          externalCodes,
          webhookUrl: this.webhookUrl,
        }),
      });

      if (res.status === 404 && this.webhookUrl) {
        // Direct Webhook Fallback
        const directRes = await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'updateStatus',
            department,
            files,
            updates,
            externalCodes,
          }),
        });
        const data = await directRes.json();
        if (data && data.success) {
          this.updateLog(logId, 'success', `${details} — отправлено через Webhook напрямую`);
          return true;
        }
      }

      const data = await res.json();
      if (res.ok && data.success) {
        this.updateLog(logId, 'success', `${details} — отправлено в Google Sheets`);
        return true;
      } else {
        this.updateLog(logId, 'error', `${details} — ${safeErrorMessage(data?.error, 'ошибка сервера')}`);
        return false;
      }
    } catch (err: any) {
      this.updateLog(logId, 'error', `${details} — ${safeErrorMessage(err, 'ошибка сети')}`);
      return false;
    }
  }

  /**
   * Push single task (create / edit) through server proxy or direct webhook
   */
  async pushTask(task: TaskItem): Promise<boolean> {
    const isEdit = Boolean(task.id && task.id.length > 0 && !task.id.startsWith('temp-'));
    const title = isEdit ? `Обновление задачи: ${task.title}` : `Создание задачи: ${task.title}`;
    const details = `Исполнители: ${task.executors || 'Не назначены'}, Срочность: ${task.urgency}`;
    const logId = this.addLog(title, details, 'pending');

    try {
      const res = await authService.fetchWithAuth('/api/sheets/push-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          action: isEdit ? 'updateTask' : 'createTask',
          webhookUrl: this.webhookUrl,
        }),
      });

      if (res.status === 404 && this.webhookUrl) {
        const directRes = await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: isEdit ? 'updateTask' : 'createTask',
            task,
          }),
        });
        const data = await directRes.json();
        if (data && data.success) {
          this.updateLog(logId, 'success', `${details} — сохранено через Webhook`);
          return true;
        }
      }

      const data = await res.json();
      if (res.ok && data.success) {
        this.updateLog(logId, 'success', `${details} — записано в Google Sheets`);
        return true;
      } else {
        this.updateLog(logId, 'error', `${details} — ${safeErrorMessage(data?.error, 'ошибка')}`);
        return false;
      }
    } catch (err: any) {
      this.updateLog(logId, 'error', `${details} — ${safeErrorMessage(err, 'ошибка сети')}`);
      return false;
    }
  }

  /**
   * Delete task through server proxy or direct webhook
   */
  async deleteTask(id: string): Promise<boolean> {
    const details = `Удаление задачи ID: ${id}`;
    const logId = this.addLog(`Удаление задачи`, details, 'pending');

    try {
      const res = await authService.fetchWithAuth('/api/sheets/push-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: id,
          action: 'deleteTask',
          webhookUrl: this.webhookUrl,
        }),
      });

      if (res.status === 404 && this.webhookUrl) {
        const directRes = await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'deleteTask',
            taskId: id,
          }),
        });
        const data = await directRes.json();
        if (data && data.success) {
          this.updateLog(logId, 'success', `${details} — удалено через Webhook`);
          return true;
        }
      }

      const data = await res.json();
      if (res.ok && data.success) {
        this.updateLog(logId, 'success', `${details} — удалено из Google Sheets`);
        return true;
      } else {
        this.updateLog(logId, 'error', `${details} — ${safeErrorMessage(data?.error, 'ошибка')}`);
        return false;
      }
    } catch (err: any) {
      this.updateLog(logId, 'error', `${details} — ${safeErrorMessage(err, 'ошибка сети')}`);
      return false;
    }
  }

  /**
   * Alias for pushTask for backwards compatibility
   */
  async pushTaskUpdate(task: TaskItem): Promise<boolean> {
    return this.pushTask(task);
  }

  /**
   * Alias for deleteTask for backwards compatibility
   */
  async pushTaskDelete(id: string): Promise<boolean> {
    return this.deleteTask(id);
  }

  /**
   * Push category group update through server proxy or direct webhook
   */
  async pushGroupUpdate(group3: string, updates: Partial<CategoryGroup>): Promise<boolean> {
    const details = `Группа: ${group3}`;
    const logId = this.addLog(`Обновление группы: ${group3}`, details, 'pending');

    try {
      const res = await authService.fetchWithAuth('/api/sheets/push-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group3,
          updates,
          webhookUrl: this.webhookUrl,
        }),
      });

      if (res.status === 404 && this.webhookUrl) {
        const directRes = await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'updateGroup',
            group3,
            updates,
          }),
        });
        const data = await directRes.json();
        if (data && data.success) {
          this.updateLog(logId, 'success', `${details} — обновлено через Webhook`);
          return true;
        }
      }

      const data = await res.json();
      if (res.ok && data.success) {
        this.updateLog(logId, 'success', `${details} — обновлено в Google Sheets`);
        return true;
      } else {
        this.updateLog(logId, 'error', `${details} — ${safeErrorMessage(data?.error, 'ошибка')}`);
        return false;
      }
    } catch (err: any) {
      this.updateLog(logId, 'error', `${details} — ${safeErrorMessage(err, 'ошибка сети')}`);
      return false;
    }
  }

  /**
   * Push department products batch through server proxy
   */
  async pushDepartmentProducts(
    department: DepartmentType,
    products: ProductItem[]
  ): Promise<{ success: boolean; message: string; count?: number }> {
    if (!products || products.length === 0) {
      return { success: true, message: 'Список товаров пуст', count: 0 };
    }

    const targetSheetName = department.includes('КАМ') || department.includes('Коммерческий')
      ? '📥 Загруженные данные КАМ'
      : '📥 Загруженные данные контента';

    const title = `Выгрузка товаров: ${department}`;
    const filesCount = new Set(products.map(p => p.sourceFile || 'Файл')).size;
    const details = `${products.length} SKU (${filesCount} файлов) в лист «${targetSheetName}»`;
    const logId = this.addLog(title, details, 'pending');

    try {
      const res = await authService.fetchWithAuth('/api/sheets/push-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department,
          products,
          webhookUrl: this.webhookUrl,
        }),
      });

      if (res.status === 404 && this.webhookUrl) {
        const directRes = await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'pushDepartmentProducts',
            department,
            products,
          }),
        });
        const data = await directRes.json();
        if (data && data.success) {
          this.updateLog(logId, 'success', `${details} — выгружено через Webhook`);
          return {
            success: true,
            message: `Успешно выгружено ${products.length} SKU через Webhook!`,
            count: products.length,
          };
        }
      }

      const data = await res.json();
      if (res.ok && data.success) {
        this.updateLog(logId, 'success', `${details} — выгружено в Google Sheets`);
        return {
          success: true,
          message: data.message || `Успешно выгружено ${products.length} SKU в Google Таблицу (лист «${targetSheetName}»)!`,
          count: products.length,
        };
      } else {
        this.updateLog(logId, 'error', `${details} — ${safeErrorMessage(data?.error, 'ошибка сервера')}`);
        return {
          success: false,
          message: safeErrorMessage(data?.error, 'Ошибка при отправке в Google Sheets через сервер'),
          count: 0,
        };
      }
    } catch (err: any) {
      this.updateLog(logId, 'error', `${details} — ${safeErrorMessage(err, 'ошибка сети')}`);
      return {
        success: false,
        message: safeErrorMessage(err, 'Сетевая ошибка при отправке через сервер'),
        count: 0,
      };
    }
  }

  /**
   * Push new products batch through server proxy
   */
  async pushNewProductsBatch(
    items: NewProductItem[],
    batchTitle?: string
  ): Promise<{ success: boolean; message: string; count: number }> {
    const title = batchTitle || (items[0]?.batchTitle || items[0]?.batchFile || `Партия от ${new Date().toLocaleDateString('ru-RU')}`);
    const details = `Новые товары: ${items.length} SKU (${title})`;
    const logId = this.addLog(`Отправка партии в Google Sheets`, details, 'pending');

    try {
      const res = await authService.fetchWithAuth('/api/sheets/push-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchTitle: title,
          items,
          webhookUrl: this.webhookUrl,
        }),
      });

      if (res.status === 404 && this.webhookUrl) {
        const directRes = await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'pushNewProductsBatch',
            batchTitle: title,
            items,
          }),
        });
        const data = await directRes.json();
        if (data && data.success) {
          this.updateLog(logId, 'success', `${details} — записано через Webhook`);
          return {
            success: true,
            message: `Успешно отправлено ${items.length} SKU в Google Таблицу через Webhook`,
            count: items.length,
          };
        }
      }

      const data = await res.json();
      if (res.ok && data.success) {
        this.updateLog(logId, 'success', `${details} — записано в лист «Новые товары»`);
        return {
          success: true,
          message: data.message || `Успешно отправлено ${items.length} SKU в Google Таблицу (лист «Новые товары»)`,
          count: items.length,
        };
      } else {
        this.updateLog(logId, 'error', `${details} — ${safeErrorMessage(data?.error, 'ошибка')}`);
        return {
          success: false,
          message: safeErrorMessage(data?.error, 'Ошибка при отправке в Google Sheets через сервер'),
          count: 0,
        };
      }
    } catch (err: any) {
      this.updateLog(logId, 'error', `${details} — ${safeErrorMessage(err, 'ошибка сети')}`);
      return {
        success: false,
        message: safeErrorMessage(err, 'Сетевая ошибка при обращении к серверу'),
        count: 0,
      };
    }
  }

  async pushAllNewProducts(items: NewProductItem[], batchTitle?: string) {
    return this.pushNewProductsBatch(items, batchTitle);
  }

  startAutoSync(intervalMinutes: number = 3): () => void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }
    this.autoSyncInterval = setInterval(() => {
      this.syncAll().catch(() => {});
    }, intervalMinutes * 60 * 1000);

    return () => {
      if (this.autoSyncInterval) {
        clearInterval(this.autoSyncInterval);
        this.autoSyncInterval = null;
      }
    };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  getIsSyncing(): boolean {
    return this.isSyncing;
  }

  getLastSyncTime(): string | null {
    return this.lastSyncTime;
  }
}

export const googleSheetsService = new GoogleSheetsService();
