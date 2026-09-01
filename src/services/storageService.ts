import {
  ProductItem,
  SupplierContact,
  NewProductItem,
  CategoryGroup,
  GroupOrderItem,
  TaskItem,
  FileGroupSummary,
  DepartmentType,
} from '../types';
import { calculateBusinessDays, getManagerForCategory, getCategoryHierarchy } from '../constants';
import initialProductsData from '../data/initialProducts.json';
import initialTasksData from '../data/initialTasks.json';
import initialGroupsData from '../data/initialGroups.json';
import initialGroupOrdersData from '../data/initialGroupOrders.json';
import initialNewProductsData from '../data/initialNewProducts.json';
import initialContactsData from '../data/initialContacts.json';
import { idb } from './indexedDbService';
import { googleSheetsService } from './googleSheetsService';

// Initial Supplier Contacts Seed
const SEED_CONTACTS: SupplierContact[] = [
  {
    id: 'cont-1',
    producer: 'Moderli Lighting',
    site: 'https://moderli.ru',
    contact: '+7 (495) 789-01-23 / info@moderli.ru',
    name: 'Алексей Смирнов',
    productGroups: 'Люстры, бра, подвесные светильники',
    note: 'Предоставляют 3D-модели и фото высокого разрешения по запросу на Яндекс.Диск',
  },
  {
    id: 'cont-2',
    producer: 'Novotech',
    site: 'https://novotech.ru',
    contact: '+7 (495) 123-45-67 / b2b@novotech.ru',
    name: 'Мария Кузнецова',
    productGroups: 'Трековые системы, встраиваемые споты',
    note: 'Быстрые ответы в Telegram @novotech_b2b',
  },
  {
    id: 'cont-3',
    producer: 'Gauss',
    site: 'https://gauss.ru',
    contact: 'sales@gauss.ru',
    name: 'Дмитрий Романов',
    productGroups: 'Светодиодные лампы, ленты, прожекторы',
    note: 'Прайс-лист обновляется по понедельникам',
  },
  {
    id: 'cont-4',
    producer: 'Schneider Electric',
    site: 'https://se.com',
    contact: 'support@se-rus.com',
    name: 'Ольга Васильева',
    productGroups: 'Розетки, выключатели, автоматика',
    note: 'Серии AtlasDesign, Glossa, Blanca',
  },
];

const SEED_GROUP_ORDERS: GroupOrderItem[] = [
  { id: '1', position: 1, groupName: 'Люстры и подвесы', section: 'Интерьерный свет', status: 'Активна', comment: 'Основное меню' },
  { id: '2', position: 2, groupName: 'Бра и подсветка', section: 'Интерьерный свет', status: 'Активна', comment: 'Высокий спрос' },
  { id: '3', position: 3, groupName: 'Трековые системы', section: 'Технический свет', status: 'В работе', comment: 'Новинки 2025' },
  { id: '4', position: 4, groupName: 'Споты', section: 'Технический свет', status: 'Активна', comment: 'Встраиваемые' },
  { id: '5', position: 5, groupName: 'Уличные светильники', section: 'Уличное освещение', status: 'Подготовка к сезону', comment: 'Весна-Лето' },
  { id: '6', position: 6, groupName: 'Светодиодные ленты', section: 'LED компоненты', status: 'Активна', comment: '12V/24V' },
];

const initialGroupsLookup = new Map<string, CategoryGroup>();
((initialGroupsData as unknown as CategoryGroup[]) || []).forEach(ig => {
  if (ig.group3) {
    initialGroupsLookup.set(ig.group3.trim().toLowerCase(), ig);
  }
});

// Sanitize groups to ensure category managers and group1/group2 hierarchies are properly filled
function sanitizeCategoryGroups(groups: CategoryGroup[]): CategoryGroup[] {
  return groups.map(g => {
    let group1 = g.group1 || '';
    let group2 = g.group2 || '';

    // If group1 or group2 is missing or generic placeholder, auto-derive from group3
    if (!group1 || group1 === 'Каталог' || !group2) {
      const hierarchy = getCategoryHierarchy(g.group3);
      if (!group1 || group1 === 'Каталог') {
        group1 = hierarchy.group1;
      }
      if (!group2) {
        group2 = hierarchy.group2;
      }
    }

    const g3Key = (g.group3 || '').trim().toLowerCase();
    const snapshotGroup = initialGroupsLookup.get(g3Key);

    let manager = g.manager;
    const m = (manager || '').toLowerCase().trim();
    if (!m || m === '—' || m === '-' || m.includes('таня') || m.includes('катя') || m.includes('анжелик') || m.includes('исполнит')) {
      if (snapshotGroup && snapshotGroup.manager && snapshotGroup.manager !== '—') {
        manager = snapshotGroup.manager;
      } else {
        manager = getManagerForCategory(g.group3);
      }
    } else if (snapshotGroup && snapshotGroup.manager && snapshotGroup.manager !== '—' && snapshotGroup.manager !== manager) {
      manager = snapshotGroup.manager;
    }

    let kamFile = g.kamFile;
    if ((!kamFile || kamFile === '—' || kamFile === '-') && snapshotGroup && snapshotGroup.kamFile === 'Добавлено') {
      kamFile = 'Добавлено';
    }

    return {
      ...g,
      group1,
      group2,
      manager,
      kamFile: kamFile || '',
    };
  });
}

// In-memory runtime cache initialized with pre-bundled snapshots
let memoryProducts: ProductItem[] = initialProductsData as unknown as ProductItem[];
let memoryTasks: TaskItem[] = initialTasksData as unknown as TaskItem[];
let memoryGroups: CategoryGroup[] = sanitizeCategoryGroups(initialGroupsData as unknown as CategoryGroup[]);
let memoryContacts: SupplierContact[] = initialContactsData as unknown as SupplierContact[];
let memoryNewProducts: NewProductItem[] = initialNewProductsData as unknown as NewProductItem[];
let memoryGroupOrders: GroupOrderItem[] = (initialGroupOrdersData as unknown as GroupOrderItem[]) || [];

// Subscribers
type StorageListener = () => void;
const listeners: Set<StorageListener> = new Set();

function notifySubscribers() {
  listeners.forEach(fn => {
    try {
      fn();
    } catch (e) {
      console.error('Storage listener error:', e);
    }
  });
}

let isInitialized = false;
let initPromise: Promise<void> | null = null;

async function initFromStorage(): Promise<void> {
  if (isInitialized || typeof window === 'undefined') return;
  try {
    const [dbProducts, dbTasks, dbGroups, dbContacts, dbNewProducts, dbGroupOrders] = await Promise.all([
      idb.getAll<ProductItem>('products'),
      idb.getAll<TaskItem>('tasks'),
      idb.getAll<CategoryGroup>('groups'),
      idb.getAll<SupplierContact>('contacts'),
      idb.getAll<NewProductItem>('newProducts'),
      idb.getAll<GroupOrderItem>('groupOrders'),
    ]);

    if (dbProducts && dbProducts.length > 0) {
      memoryProducts = dbProducts;
    } else {
      idb.setAll('products', memoryProducts).catch(() => {});
    }

    if (dbTasks && dbTasks.length > 0) {
      memoryTasks = dbTasks;
    } else {
      idb.setAll('tasks', memoryTasks).catch(() => {});
    }

    if (dbGroups && dbGroups.length > 0) {
      memoryGroups = sanitizeCategoryGroups(dbGroups);
    } else {
      idb.setAll('groups', memoryGroups).catch(() => {});
    }

    if (dbContacts && dbContacts.length > 0) {
      memoryContacts = dbContacts;
    } else {
      idb.setAll('contacts', memoryContacts).catch(() => {});
    }

    if (dbNewProducts && dbNewProducts.length > 0) {
      memoryNewProducts = dbNewProducts;
    } else {
      // Try fallback from localStorage backup
      try {
        const lsNp = localStorage.getItem('CONTENT_OPS_NEW_PRODUCTS_V1');
        if (lsNp) {
          const parsed = JSON.parse(lsNp);
          if (Array.isArray(parsed) && parsed.length > 0) {
            memoryNewProducts = parsed;
          }
        }
      } catch {
        // ignore
      }
      idb.setAll('newProducts', memoryNewProducts).catch(() => {});
    }

    if (dbGroupOrders && dbGroupOrders.length > 0) {
      memoryGroupOrders = dbGroupOrders;
    } else {
      idb.setAll('groupOrders', memoryGroupOrders).catch(() => {});
    }

    isInitialized = true;
    notifySubscribers();

    // Trigger initial background sync from Google Sheets live CSVs
    setTimeout(() => {
      googleSheetsService.syncAll().then(res => {
        if (res.success) {
          console.log(`[Google Sheets] Auto-synced on startup: ${res.contentCount + res.kamCount} products, ${res.tasksCount} tasks, ${res.groupsCount} groups.`);
        }
      }).catch(err => {
        console.warn('[Google Sheets] Startup sync error:', err);
      });
      // Start periodic sync every 3 minutes
      googleSheetsService.startAutoSync(3);
    }, 500);
  } catch (e) {
    console.warn('Init from IndexedDB fallback:', e);
    isInitialized = true;
    notifySubscribers();
  }
}

// Start async init immediately
initPromise = initFromStorage();

export const storageService = {
  subscribe(listener: StorageListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  notify(): void {
    notifySubscribers();
  },

  async whenReady(): Promise<void> {
    if (initPromise) {
      await initPromise;
    }
  },

  // PRODUCTS
  getProducts(): ProductItem[] {
    return memoryProducts;
  },

  getProductsByDepartment(department: DepartmentType): ProductItem[] {
    return memoryProducts.filter(p => p.department === department);
  },

  saveProducts(products: ProductItem[]): void {
    memoryProducts = products;
    // Async flush to IndexedDB
    idb.setAll('products', products).catch(err => {
      console.warn('Failed to save products to idb:', err);
    });
    this.notify();
  },

  addProducts(newProducts: ProductItem[]): void {
    const current = this.getProducts();
    // Put new products at the top so user immediately sees them
    this.saveProducts([...newProducts, ...current]);
  },

  updateProductsStatus(
    sourceFiles: string[],
    department: DepartmentType,
    updates: Partial<ProductItem>
  ): void {
    const products = this.getProducts();
    const cleanFiles = new Set(sourceFiles.map(f => f.trim().toLowerCase()));

    const updated = products.map(p => {
      const pFile = (p.sourceFile || '').trim().toLowerCase();
      if (p.department === department && cleanFiles.has(pFile)) {
        return {
          ...p,
          ...updates,
        };
      }
      return p;
    });

    this.saveProducts(updated);

    // Push two-way update to Google Sheets via Webhook
    googleSheetsService.pushProductStatusUpdate(sourceFiles, department, updates).catch(err => {
      console.warn('[Google Sheets] Push status error:', err);
    });
  },

  // CONTACTS
  getContacts(): SupplierContact[] {
    return memoryContacts;
  },

  saveContacts(contacts: SupplierContact[]): void {
    memoryContacts = contacts;
    idb.setAll('contacts', contacts).catch(() => {});
    this.notify();
  },

  addContact(contact: Omit<SupplierContact, 'id'>): SupplierContact {
    const contacts = this.getContacts();
    const newContact: SupplierContact = {
      ...contact,
      id: `cont-${Date.now()}`,
    };
    this.saveContacts([newContact, ...contacts]);
    return newContact;
  },

  // NEW PRODUCTS (BATCHES)
  getNewProducts(): NewProductItem[] {
    return memoryNewProducts;
  },

  saveNewProducts(items: NewProductItem[]): void {
    memoryNewProducts = items;
    idb.setAll('newProducts', items).catch(() => {});
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('CONTENT_OPS_NEW_PRODUCTS_V1', JSON.stringify(items.slice(0, 15000)));
      }
    } catch (e) {
      console.warn('localStorage backup failed:', e);
    }
    this.notify();
  },

  addNewProductsBatch(items: NewProductItem[]): void {
    const current = this.getNewProducts();
    this.saveNewProducts([...items, ...current]);
  },

  // CATEGORY GROUPS
  getCategoryGroups(): CategoryGroup[] {
    return memoryGroups;
  },

  saveCategoryGroups(groups: CategoryGroup[]): void {
    memoryGroups = groups;
    idb.setAll('groups', groups).catch(() => {});
    this.notify();
  },

  addCategoryGroup(group: Omit<CategoryGroup, 'id'>): void {
    const groups = this.getCategoryGroups();
    const manager = group.manager && group.manager.trim() && group.manager !== '—'
      ? group.manager.trim()
      : getManagerForCategory(group.group3);

    const hierarchy = getCategoryHierarchy(group.group3);
    const group1 = group.group1 && group.group1.trim() && group.group1 !== 'Каталог'
      ? group.group1.trim()
      : hierarchy.group1;
    const group2 = group.group2 && group.group2.trim()
      ? group.group2.trim()
      : hierarchy.group2;

    const newGroup: CategoryGroup = {
      ...group,
      group1,
      group2,
      manager,
      id: `grp-${Date.now()}`,
    };
    this.saveCategoryGroups([newGroup, ...groups]);
  },

  bulkAddCategoryGroups(groupNames: string[], defaultManager?: string): number {
    const groups = this.getCategoryGroups();
    const newItems: CategoryGroup[] = groupNames.map((name, idx) => {
      const hierarchy = getCategoryHierarchy(name);
      return {
        id: `grp-${Date.now()}-${idx}`,
        group1: hierarchy.group1,
        group2: hierarchy.group2,
        group3: name,
        manager: defaultManager && defaultManager !== 'auto' ? defaultManager : getManagerForCategory(name),
        includedMaterik: '0',
        includedPalas: '0',
        skuCount: '0',
        startDate: '',
        donorRequestDate: '',
        donorReceivedDate: '',
        approvalSentDate: '',
        approvalDate: '',
        releaseDate: '',
        palasAllocated: '',
        kamFile: '',
      };
    });
    this.saveCategoryGroups([...groups, ...newItems]);
    return newItems.length;
  },

  // GROUP ORDERS
  getGroupOrders(): GroupOrderItem[] {
    return memoryGroupOrders;
  },

  saveGroupOrders(orders: GroupOrderItem[]): void {
    memoryGroupOrders = orders;
    idb.setAll('groupOrders', orders).catch(() => {});
    this.notify();
  },

  // TASKS
  getTasks(): TaskItem[] {
    return memoryTasks;
  },

  saveTasks(tasks: TaskItem[]): void {
    memoryTasks = tasks;
    idb.setAll('tasks', tasks).catch(() => {});
    this.notify();
  },

  addTask(task: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>): TaskItem {
    const tasks = this.getTasks();
    const nextId = String(tasks.length + 1);
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newTask: TaskItem = {
      ...task,
      id: nextId,
      createdAt: dateStr,
      updatedAt: dateStr,
    };
    this.saveTasks([...tasks, newTask]);
    googleSheetsService.pushTaskUpdate(newTask).catch(() => {});
    return newTask;
  },

  updateTask(id: string, updates: Partial<TaskItem>): void {
    const tasks = this.getTasks();
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let updatedItem: TaskItem | null = null;
    const updated = tasks.map(t => {
      if (t.id === id) {
        updatedItem = { ...t, ...updates, updatedAt: dateStr };
        return updatedItem;
      }
      return t;
    });
    this.saveTasks(updated);
    if (updatedItem) {
      googleSheetsService.pushTaskUpdate(updatedItem).catch(() => {});
    }
  },

  deleteTask(id: string): void {
    const tasks = this.getTasks();
    const filtered = tasks.filter(t => t.id !== id);
    const reindexed = filtered.map((t, idx) => ({ ...t, id: String(idx + 1) }));
    this.saveTasks(reindexed);
    googleSheetsService.pushTaskDelete(id).catch(() => {});
  },

  // BUILD SUMMARY (identical to Python script build_summary logic)
  buildFileSummaries(products: ProductItem[], department: DepartmentType): FileGroupSummary[] {
    const deptProducts = products.filter(p => p.department === department);
    if (deptProducts.length === 0) return [];

    // Group by sourceFile
    const grouped = new Map<string, ProductItem[]>();
    for (const p of deptProducts) {
      const key = (p.sourceFile || 'Без названия').trim();
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(p);
    }

    const summaries: FileGroupSummary[] = [];

    grouped.forEach((items, fileName) => {
      const total = items.length;
      const first = items[0];

      const getCleanVal = (getter: (p: ProductItem) => string) => {
        for (const p of items) {
          const val = getter(p)?.trim();
          if (val && val.toLowerCase() !== 'nan' && val.toLowerCase() !== 'none') {
            return val;
          }
        }
        return '';
      };

      const stVal = (first.status || '').toLowerCase().trim();
      const dateDone = getCleanVal(p => p.dateFinished || p.dateCompleted);
      const dateTake = getCleanVal(p => p.dateTaken);
      const pauseReason = getCleanVal(p => p.pauseReason);
      const datePause = getCleanVal(p => p.pauseDate);
      const dateAdded = getCleanVal(p => p.dateUploaded);

      const isCompleted = ['выполнено', 'выполнен', 'завершен', '✅ выполнен', '✅ завершена'].some(s => stVal.includes(s));
      const isPaused = ['пауза', 'на паузе', '⏸️ на паузе', '⏸'].some(s => stVal.includes(s));
      const isInWork = ['в работе', 'взято в работу', '🔄 в работе'].some(s => stVal.includes(s)) || (Boolean(dateTake) && !isCompleted && !isPaused);

      let doneCnt = 0;
      let inWorkCnt = 0;
      let newCnt = 0;
      let groupStatus: '🆕 Новый' | '🔄 В работе' | '⏸️ На паузе' | '✅ Выполнен' = '🆕 Новый';

      if (isCompleted) {
        doneCnt = total;
        groupStatus = '✅ Выполнен';
      } else if (isPaused) {
        newCnt = total;
        groupStatus = '⏸️ На паузе';
      } else if (isInWork) {
        inWorkCnt = total;
        groupStatus = '🔄 В работе';
      } else {
        newCnt = total;
        groupStatus = '🆕 Новый';
      }

      const daysPassed = calculateBusinessDays(dateAdded);

      summaries.push({
        fileName,
        group3: first.group3 || '',
        totalProducts: total,
        newCount: newCnt,
        inWorkCount: inWorkCnt,
        doneCount: doneCnt,
        groupStatus,
        pauseReason,
        pauseDate: datePause,
        executor: first.executor || '',
        startDate: dateTake,
        endDate: dateDone,
        addedDate: dateAdded,
        daysPassed,
        department,
      });
    });

    return summaries;
  },

  // Reset to initial Google Sheets snapshot
  resetAll(): void {
    memoryProducts = initialProductsData as unknown as ProductItem[];
    memoryTasks = initialTasksData as unknown as TaskItem[];
    memoryGroups = initialGroupsData as unknown as CategoryGroup[];
    memoryContacts = initialContactsData as unknown as SupplierContact[];
    memoryNewProducts = initialNewProductsData as unknown as NewProductItem[];
    memoryGroupOrders = SEED_GROUP_ORDERS;

    idb.setAll('products', memoryProducts).catch(() => {});
    idb.setAll('tasks', memoryTasks).catch(() => {});
    idb.setAll('groups', memoryGroups).catch(() => {});
    idb.setAll('contacts', memoryContacts).catch(() => {});
    idb.setAll('newProducts', memoryNewProducts).catch(() => {});

    this.notify();
  }
};
