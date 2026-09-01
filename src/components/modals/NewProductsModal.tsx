import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { NewProductItem, ProductItem } from '../../types';
import { storageService } from '../../services/storageService';
import { googleSheetsService } from '../../services/googleSheetsService';
import { parseNewProductsBatchFile, exportToExcel } from '../../services/excelService';
import { formatCurrentDate, NEW_PRODUCTS_SPREADSHEET_URL } from '../../constants';
import { safeErrorMessage } from '../../utils/errorUtils';
import { SortHeader } from '../common/SortHeader';
import { SortConfig, sortData } from '../../utils/sortUtils';
import { GoogleSheetsModal } from './GoogleSheetsModal';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  Printer,
  Layers,
  Eye,
  Search,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Filter,
  Send,
  Link2,
  Check,
  Zap,
  Copy,
} from 'lucide-react';

interface NewProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DepartmentConflictInfo {
  inContent: boolean;
  contentStatuses: string[];
  inKam: boolean;
  kamStatuses: string[];
  description: string;
}

interface PivotRow {
  manager: string;
  section: string;
  count: number;
  hasConflict: boolean;
  conflictInfo?: DepartmentConflictInfo;
}

const normalizeGroupKey = (name: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ');
};

export const NewProductsModal: React.FC<NewProductsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'view' | 'summary' | 'upload'>('view');
  const [items, setItems] = useState<NewProductItem[]>([]);
  const [allProducts, setAllProducts] = useState<ProductItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [selectedBatchKey, setSelectedBatchKey] = useState<string>('');
  const [selectedSummaryDate, setSelectedSummaryDate] = useState<string>('Все партии');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showPrintView, setShowPrintView] = useState(false);
  const [onlyConflictsFilter, setOnlyConflictsFilter] = useState(false);

  // Two-way sync & push state
  const [isPushing, setIsPushing] = useState(false);
  const [autoPushToSheets, setAutoPushToSheets] = useState(true);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [hasWebhook, setHasWebhook] = useState(Boolean(googleSheetsService.getWebhookUrl()));
  const [copiedBatchForSheets, setCopiedBatchForSheets] = useState(false);
  const [pushResultNotification, setPushResultNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const [batchSortConfig, setBatchSortConfig] = useState<SortConfig<NewProductItem>>({
    key: '',
    direction: null,
  });
  const [pivotSortConfig, setPivotSortConfig] = useState<SortConfig<PivotRow>>({
    key: '',
    direction: null,
  });

  const getBatchKey = (i: NewProductItem) =>
    i.batchTitle || (i.batchDate ? `📅 ${i.batchDate} (${i.batchFile || 'Партия'})` : (i.batchFile || 'Партия'));

  const loadData = () => {
    const data = storageService.getNewProducts();
    setItems(data);
    setAllProducts(storageService.getProducts());
    setHasWebhook(Boolean(googleSheetsService.getWebhookUrl()));

    const uniqueBatches = Array.from(new Set(data.map(getBatchKey)));
    if (uniqueBatches.length > 0 && (!selectedBatchKey || !uniqueBatches.includes(selectedBatchKey))) {
      setSelectedBatchKey(uniqueBatches[0]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      const unsub = storageService.subscribe(loadData);
      return () => unsub();
    }
  }, [isOpen]);

  // Build active group conflicts from Content and Commercial departments
  const activeGroupsConflicts = useMemo(() => {
    const map = new Map<string, DepartmentConflictInfo>();

    for (const p of allProducts) {
      const rawStatus = (p.status || '').trim();
      const stLower = rawStatus.toLowerCase();

      // Skip completed groups/products
      const isCompleted = ['выполнен', 'выполнено', 'завершен', 'готово', '✅ выполнен'].some(s =>
        stLower.includes(s)
      );
      if (isCompleted) continue;

      // Group is considered active if status is new, on pause, or in work
      const isActive =
        ['нов', 'пауз', 'работ'].some(s => stLower.includes(s)) ||
        Boolean(p.dateTaken && !isCompleted);
      if (!isActive) continue;

      const g3 = (p.group3 || '').trim();
      if (!g3) continue;

      const key = normalizeGroupKey(g3);
      if (!map.has(key)) {
        map.set(key, {
          inContent: false,
          contentStatuses: [],
          inKam: false,
          kamStatuses: [],
          description: '',
        });
      }

      const info = map.get(key)!;
      let statusClean = rawStatus || 'В работе';
      if (statusClean.includes('пауз')) statusClean = 'На паузе';
      else if (statusClean.includes('работ')) statusClean = 'В работе';
      else if (statusClean.includes('нов')) statusClean = 'Новый';

      if (p.department === 'Отдел контента') {
        info.inContent = true;
        if (!info.contentStatuses.includes(statusClean)) {
          info.contentStatuses.push(statusClean);
        }
      } else if (p.department === 'Коммерческий отдел') {
        info.inKam = true;
        if (!info.kamStatuses.includes(statusClean)) {
          info.kamStatuses.push(statusClean);
        }
      }
    }

    // Format human-friendly descriptions
    map.forEach(info => {
      const parts: string[] = [];
      if (info.inContent) {
        parts.push(`Контент: ${info.contentStatuses.join(', ')}`);
      }
      if (info.inKam) {
        parts.push(`КАМ: ${info.kamStatuses.join(', ')}`);
      }
      info.description = parts.join(' | ');
    });

    return map;
  }, [allProducts]);

  const handleSyncFromSheets = async () => {
    setIsSyncing(true);
    setSyncStatus('Загрузка партий из Google Sheets...');
    const res = await googleSheetsService.syncAll();
    setIsSyncing(false);
    if (res.success) {
      loadData();
      setSyncStatus(`Синхронизировано ${res.newProductsCount || storageService.getNewProducts().length} товаров в партиях!`);
      setTimeout(() => setSyncStatus(null), 4000);
    } else {
      setSyncStatus(`Ошибка: ${safeErrorMessage(res.error, 'не удалось синхронизировать')}`);
      setTimeout(() => setSyncStatus(null), 5000);
    }
  };

  // Push Selected Batch to Google Sheets
  const handlePushSelectedBatch = async () => {
    if (!currentBatchItems || currentBatchItems.length === 0) {
      setPushResultNotification({
        type: 'info',
        message: 'Нет товаров в выбранной партии для отправки',
      });
      setTimeout(() => setPushResultNotification(null), 4000);
      return;
    }

    if (!googleSheetsService.getWebhookUrl()) {
      setIsSheetsModalOpen(true);
      setPushResultNotification({
        type: 'info',
        message: 'Для отправки в Google Sheets укажите URL вашего Webhook в настройках.',
      });
      setTimeout(() => setPushResultNotification(null), 6000);
      return;
    }

    setIsPushing(true);
    const res = await googleSheetsService.pushNewProductsBatch(currentBatchItems, selectedBatchKey);
    setIsPushing(false);

    if (res.success) {
      setPushResultNotification({
        type: 'success',
        message: res.message,
      });
    } else {
      setPushResultNotification({
        type: 'error',
        message: res.message,
      });
    }
    setTimeout(() => setPushResultNotification(null), 7000);
  };

  // Push All Batches to Google Sheets
  const handlePushAllBatches = async () => {
    if (!items || items.length === 0) {
      setPushResultNotification({
        type: 'info',
        message: 'Список товаров пуст',
      });
      setTimeout(() => setPushResultNotification(null), 4000);
      return;
    }

    if (!googleSheetsService.getWebhookUrl()) {
      setIsSheetsModalOpen(true);
      setPushResultNotification({
        type: 'info',
        message: 'Для отправки в Google Sheets укажите URL вашего Webhook в настройках.',
      });
      setTimeout(() => setPushResultNotification(null), 6000);
      return;
    }

    setIsPushing(true);
    const res = await googleSheetsService.pushAllNewProducts(items);
    setIsPushing(false);

    if (res.success) {
      setPushResultNotification({
        type: 'success',
        message: res.message,
      });
    } else {
      setPushResultNotification({
        type: 'error',
        message: res.message,
      });
    }
    setTimeout(() => setPushResultNotification(null), 7000);
  };

  // Copy rows as TSV for direct paste into Google Sheets (e.g. from row 2761)
  const handleCopyBatchForGoogleSheets = (itemsToCopy: NewProductItem[], label = 'партия') => {
    if (!itemsToCopy || itemsToCopy.length === 0) {
      setPushResultNotification({
        type: 'info',
        message: 'Нет строк для копирования',
      });
      setTimeout(() => setPushResultNotification(null), 4000);
      return;
    }

    const rows = itemsToCopy.map(it => [
      it.externalCode || '',
      it.title || '',
      it.createdDate || it.batchDate || '',
      it.managerCode || '',
      it.sectionName || '',
      it.manager || '',
      it.content || '',
      it.isAdded ? 'TRUE' : 'FALSE',
      it.isExported ? 'TRUE' : 'FALSE',
    ].join('\t'));

    const tsv = rows.join('\n');
    navigator.clipboard.writeText(tsv);
    setCopiedBatchForSheets(true);
    setPushResultNotification({
      type: 'success',
      message: `📋 Скопировано ${itemsToCopy.length} строк (${label})! Откройте лист «Новые товары» в Google Таблице и нажмите Ctrl+V в строке 2761 (колонка A).`,
    });
    setTimeout(() => setCopiedBatchForSheets(false), 5000);
    setTimeout(() => setPushResultNotification(null), 10000);
  };

  // Group by Batch
  const batchKeys = Array.from(new Set(items.map(getBatchKey)));

  // Handle files upload with automatic two-way push to Google Sheets
  const handleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(10);
    setUploadStatus(`Чтение ${files.length} файл(ов)...`);

    try {
      const nowStr = formatCurrentDate(false);
      const allParsed: NewProductItem[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadStatus(`Обработка: ${file.name} (${i + 1}/${files.length})`);
        const parsed = await parseNewProductsBatchFile(file, nowStr);
        allParsed.push(...parsed);
        setUploadProgress(10 + Math.floor(((i + 1) / files.length) * 60));
      }

      // Save locally to storage & IndexedDB
      storageService.addNewProductsBatch(allParsed);
      setUploadProgress(75);
      loadData();

      // Automatically push to Google Sheets if enabled
      let pushMessage = '';
      if (autoPushToSheets) {
        if (googleSheetsService.getWebhookUrl()) {
          setUploadStatus(`Отправка ${allParsed.length} SKU в Google Таблицу (лист «Новые товары»)...`);
          setUploadProgress(85);
          const pushRes = await googleSheetsService.pushNewProductsBatch(allParsed);
          if (pushRes.success) {
            pushMessage = ` и успешно отправлено в Google Sheets!`;
            setPushResultNotification({
              type: 'success',
              message: `Партия (${allParsed.length} SKU) успешно записана в Google Таблицу!`,
            });
          } else {
            pushMessage = ` (сохранено локально, ошибка вебхука)`;
            setPushResultNotification({
              type: 'error',
              message: pushRes.message,
            });
          }
        } else {
          pushMessage = ` (сохранено локально; подключите Webhook для автоматической отправки в Google Sheets)`;
          setPushResultNotification({
            type: 'info',
            message: `Добавлено ${allParsed.length} SKU локально. Для отправки в Google Таблицу подключите Webhook.`,
          });
        }
      }

      setUploadProgress(100);
      setUploadStatus(`Успешно добавлено ${allParsed.length} товаров из ${files.length} файлов${pushMessage}`);

      // Switch to summary tab
      setTimeout(() => {
        setUploading(false);
        setActiveTab('summary');
      }, 1000);
    } catch (err: any) {
      setUploadStatus(`Ошибка: ${err.message || 'Сбой при чтении Excel'}`);
      setUploading(false);
    }
  };

  const handleBatchSort = (key: string) => {
    setBatchSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key: '', direction: null };
        return { key, direction: 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const handlePivotSort = (key: string) => {
    setPivotSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key: '', direction: null };
        return { key, direction: 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  // Filter items for View Batch
  const rawBatchItems = items.filter(i => getBatchKey(i) === selectedBatchKey);
  const filteredBatchItems = rawBatchItems.filter(i => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      i.externalCode.toLowerCase().includes(q) ||
      i.title.toLowerCase().includes(q) ||
      i.sectionName.toLowerCase().includes(q) ||
      i.manager.toLowerCase().includes(q)
    );
  });
  const currentBatchItems: NewProductItem[] = sortData<NewProductItem>(filteredBatchItems, batchSortConfig);

  // Summary Pivot data
  const summarySourceItems =
    selectedSummaryDate === 'Все партии'
      ? items
      : items.filter(i => getBatchKey(i) === selectedSummaryDate);

  // Calculate Pivot (Manager x Group)
  const pivotMap = new Map<string, PivotRow>();
  for (const it of summarySourceItems) {
    const mng = it.manager || 'Не указан';
    const sec = it.sectionName || 'Без группы';
    const key = `${mng}___${sec}`;

    const conflict = activeGroupsConflicts.get(normalizeGroupKey(sec));
    const hasConflict = Boolean(conflict && (conflict.inContent || conflict.inKam));

    if (!pivotMap.has(key)) {
      pivotMap.set(key, {
        manager: mng,
        section: sec,
        count: 0,
        hasConflict,
        conflictInfo: conflict,
      });
    }
    pivotMap.get(key)!.count += 1;
  }

  const rawPivotList = Array.from(pivotMap.values());
  const sortedPivotList = pivotSortConfig.direction
    ? sortData<PivotRow>(rawPivotList, pivotSortConfig)
    : rawPivotList.sort((a, b) => {
        // Prioritize conflicts on top if not sorted, then manager, then section
        if (a.hasConflict !== b.hasConflict) {
          return a.hasConflict ? -1 : 1;
        }
        if (a.manager !== b.manager) return a.manager.localeCompare(b.manager);
        return a.section.localeCompare(b.section);
      });

  const pivotList = onlyConflictsFilter
    ? sortedPivotList.filter(row => row.hasConflict)
    : sortedPivotList;

  const totalSummarySku = rawPivotList.reduce((acc, row) => acc + row.count, 0);
  const uniqueManagers = new Set(rawPivotList.map(r => r.manager)).size;
  const uniqueSections = new Set(rawPivotList.map(r => r.section)).size;
  const totalConflictRows = rawPivotList.filter(r => r.hasConflict).length;
  const totalConflictSku = rawPivotList.filter(r => r.hasConflict).reduce((acc, r) => acc + r.count, 0);

  const handleExportPivotExcel = () => {
    const exportRows = rawPivotList.map(r => ({
      'Менеджер': r.manager,
      'Группа (Раздел)': r.section,
      'Количество SKU': r.count,
      'Наличие в отделах (Контент/КАМ)': r.hasConflict ? `⚠️ ${r.conflictInfo?.description || 'Есть в работе/паузе'}` : '— Нет активных',
    }));
    exportToExcel(exportRows, `Сводная_новые_товары_${selectedSummaryDate.replace(/[^a-zA-Z0-9а-яА-Я]/g, '_')}.xlsx`, 'Сводная');
  };

  const handleExportBatchExcel = () => {
    const exportRows = currentBatchItems.map(r => ({
      'Внешний код': r.externalCode,
      'Наименование': r.title,
      'Менеджер': r.manager,
      'Код менеджера': r.managerCode,
      'Раздел (Группа 3)': r.sectionName,
      'Дата партии': r.batchDate,
      'Файл партии': r.batchFile,
    }));
    exportToExcel(exportRows, `Партия_${selectedBatchKey.replace(/[^a-zA-Z0-9а-яА-Я]/g, '_')}.xlsx`, 'Партия');
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="📦 Новые товары и партии SKU" maxWidth="6xl">
        <div className="space-y-4">
          {/* Navigation Tabs and Sync Controls (Single Row) */}
          <div className="flex items-center justify-between border-b border-slate-200 gap-2 overflow-x-auto no-scrollbar whitespace-nowrap pb-1">
            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('view')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'view'
                    ? 'border-sky-600 text-sky-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Eye className="w-4 h-4 shrink-0" />
                <span>📋 Партии ({batchKeys.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('summary')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'summary'
                    ? 'border-sky-600 text-sky-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers className="w-4 h-4 shrink-0" />
                <span>📊 Сводная</span>
                {totalConflictRows > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-2xs font-bold bg-rose-100 text-rose-700 border border-rose-300">
                    {totalConflictRows}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'upload'
                    ? 'border-sky-600 text-sky-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <UploadCloud className="w-4 h-4 shrink-0" />
                <span>📥 Загрузить Excel</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap pb-1">
              {/* Webhook Connection status pill */}
              <button
                type="button"
                onClick={() => setIsSheetsModalOpen(true)}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border shrink-0 whitespace-nowrap cursor-pointer ${
                  hasWebhook
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                }`}
                title="Настройка отправки в Google Sheets Webhook"
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${hasWebhook ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <Link2 className="w-3.5 h-3.5 shrink-0" />
                <span>{hasWebhook ? 'Webhook активен' : 'Webhook'}</span>
              </button>

              {/* Read sync from Sheets */}
              <button
                type="button"
                onClick={handleSyncFromSheets}
                disabled={isSyncing}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border shrink-0 whitespace-nowrap cursor-pointer ${
                  isSyncing
                    ? 'bg-sky-50 text-sky-500 border-sky-200 cursor-not-allowed'
                    : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-200'
                }`}
                title="Загрузить свежие партии из Google Sheets"
              >
                <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Загрузка...' : 'Обновить'}</span>
              </button>

              <a
                href={NEW_PRODUCTS_SPREADSHEET_URL}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap"
                title="Открыть лист Новые товары в Google Таблице"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>Лист в Sheets</span>
              </a>
            </div>
          </div>

          {/* Sync & Push Status Notifications */}
          {syncStatus && (
            <div className="p-2.5 text-xs font-medium text-sky-900 bg-sky-50 border border-sky-200 rounded-lg flex items-center gap-2 animate-fadeIn">
              {syncStatus.startsWith('Ошибка') ? (
                <span className="text-rose-600 font-bold">⚠️</span>
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span>{syncStatus}</span>
            </div>
          )}

          {pushResultNotification && (
            <div
              className={`p-2.5 text-xs font-medium rounded-lg flex items-center justify-between gap-2 animate-fadeIn border ${
                pushResultNotification.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : pushResultNotification.type === 'error'
                  ? 'bg-rose-50 text-rose-900 border-rose-200'
                  : 'bg-sky-50 text-sky-900 border-sky-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {pushResultNotification.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : pushResultNotification.type === 'error' ? (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                ) : (
                  <Zap className="w-4 h-4 text-sky-600 shrink-0" />
                )}
                <span>{pushResultNotification.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setPushResultNotification(null)}
                className="text-xs opacity-60 hover:opacity-100 cursor-pointer font-bold px-1.5"
              >
                ✕
              </button>
            </div>
          )}

          {/* Tab 1: View Batches */}
          {activeTab === 'view' && (
            <div className="py-2 space-y-3">
              {batchKeys.length === 0 ? (
                <div className="p-8 text-center text-slate-500">Нет загруженных партий новых товаров.</div>
              ) : (
                <>
                  {/* View Tab Toolbar (Single Row) */}
                  <div className="flex items-center justify-between gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200 overflow-x-auto no-scrollbar whitespace-nowrap">
                    <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
                      <span className="text-xs font-semibold text-slate-700 shrink-0">Партия:</span>
                      <select
                        value={selectedBatchKey}
                        onChange={e => setSelectedBatchKey(e.target.value)}
                        className="px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 w-44 sm:w-60 shrink-0 truncate"
                      >
                        {batchKeys.map(bk => {
                          const count = items.filter(i => getBatchKey(i) === bk).length;
                          return (
                            <option key={bk} value={bk}>
                              {bk} ({count} SKU)
                            </option>
                          );
                        })}
                      </select>

                      <div className="relative shrink-0">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Поиск SKU..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="pl-8 pr-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white w-36 sm:w-48 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                      {/* Push current batch to Google Sheets button */}
                      <button
                        type="button"
                        onClick={handlePushSelectedBatch}
                        disabled={isPushing || currentBatchItems.length === 0}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 shrink-0 whitespace-nowrap"
                        title="Отправить выбранную партию товаров в Google Таблицу через Webhook (лист «Новые товары»)"
                      >
                        {isPushing ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                        ) : (
                          <Send className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{isPushing ? 'Отправка...' : 'Отправить в Sheets'}</span>
                      </button>

                      {/* Copy for direct paste into Google Sheets */}
                      <button
                        type="button"
                        onClick={() => handleCopyBatchForGoogleSheets(currentBatchItems, selectedBatchKey)}
                        disabled={currentBatchItems.length === 0}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-white hover:bg-sky-50 text-sky-700 border border-sky-300 rounded-lg shadow-xs transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                        title="Скопировать строки партии для мгновенной вставки Ctrl+V прямо в Google Таблицу (со строки 2761)"
                      >
                        {copiedBatchForSheets ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <Copy className="w-3.5 h-3.5 text-sky-600 shrink-0" />}
                        <span>{copiedBatchForSheets ? 'Скопировано!' : 'Скопировать для Sheets'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportBatchExcel}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg shadow-xs transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                        title="Экспорт в Excel"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Excel</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 px-1">
                    <span>
                      Показано: <strong className="text-slate-900">{currentBatchItems.length}</strong> из{' '}
                      <strong>{rawBatchItems.length}</strong> SKU в выбранной партии
                    </span>
                    <span>
                      Всего по всем партиям: <strong className="text-blue-600">{items.length}</strong> SKU
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[50vh] overflow-y-auto shadow-xs">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-600 font-semibold uppercase sticky top-0 border-b border-slate-200 z-10">
                        <tr>
                          <th className="px-3 py-2.5 min-w-[120px]">
                            <SortHeader
                              label="Внешний код"
                              columnKey="externalCode"
                              currentSortKey={batchSortConfig.key}
                              currentDirection={batchSortConfig.direction}
                              onSort={handleBatchSort}
                            />
                          </th>
                          <th className="px-3 py-2.5 min-w-[220px]">
                            <SortHeader
                              label="Наименование"
                              columnKey="title"
                              currentSortKey={batchSortConfig.key}
                              currentDirection={batchSortConfig.direction}
                              onSort={handleBatchSort}
                            />
                          </th>
                          <th className="px-3 py-2.5 min-w-[130px]">
                            <SortHeader
                              label="Менеджер"
                              columnKey="manager"
                              currentSortKey={batchSortConfig.key}
                              currentDirection={batchSortConfig.direction}
                              onSort={handleBatchSort}
                            />
                          </th>
                          <th className="px-3 py-2.5 min-w-[80px]">
                            <SortHeader
                              label="Код"
                              columnKey="managerCode"
                              currentSortKey={batchSortConfig.key}
                              currentDirection={batchSortConfig.direction}
                              onSort={handleBatchSort}
                            />
                          </th>
                          <th className="px-3 py-2.5 min-w-[180px]">
                            <SortHeader
                              label="Раздел (Группа 3)"
                              columnKey="sectionName"
                              currentSortKey={batchSortConfig.key}
                              currentDirection={batchSortConfig.direction}
                              onSort={handleBatchSort}
                            />
                          </th>
                          <th className="px-3 py-2.5 min-w-[120px]">
                            <SortHeader
                              label="Дата партии"
                              columnKey="batchDate"
                              currentSortKey={batchSortConfig.key}
                              currentDirection={batchSortConfig.direction}
                              onSort={handleBatchSort}
                            />
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {currentBatchItems.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                              {searchQuery ? 'Ничего не найдено по запросу' : 'В этой партии нет товаров'}
                            </td>
                          </tr>
                        ) : (
                          currentBatchItems.map(item => {
                            const conflict = activeGroupsConflicts.get(normalizeGroupKey(item.sectionName));
                            const hasConflict = Boolean(conflict && (conflict.inContent || conflict.inKam));

                            return (
                              <tr
                                key={item.id}
                                className={
                                  hasConflict
                                    ? 'bg-rose-50/70 hover:bg-rose-100/70 transition-colors'
                                    : 'hover:bg-slate-50/70 transition-colors'
                                }
                              >
                                <td className="px-3 py-2 font-mono font-medium text-slate-900">{item.externalCode}</td>
                                <td className="px-3 py-2 font-medium text-slate-800">{item.title}</td>
                                <td className="px-3 py-2 text-slate-700">
                                  {hasConflict && (
                                    <span className="inline-flex items-center gap-1 font-semibold text-rose-800">
                                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                      {item.manager}
                                    </span>
                                  )}
                                  {!hasConflict && item.manager}
                                </td>
                                <td className="px-3 py-2 text-slate-500 font-mono">{item.managerCode || '—'}</td>
                                <td className="px-3 py-2">
                                  <div className="flex flex-col gap-0.5">
                                    <span className={hasConflict ? 'font-bold text-rose-950' : 'text-slate-700'}>
                                      {item.sectionName}
                                    </span>
                                    {hasConflict && conflict && (
                                      <span className="inline-flex items-center gap-1 text-2xs font-semibold text-rose-700">
                                        ⚠️ {conflict.description}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-slate-400 font-mono text-[11px]">{item.batchDate}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tab 2: Summary (Manager + Group) with Red Conflict Validation */}
          {activeTab === 'summary' && (
            <div className="py-2 space-y-4">
              {/* Filter and Top controls (Single Row) */}
              <div className="flex items-center justify-between gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200 overflow-x-auto no-scrollbar whitespace-nowrap">
                <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
                  <span className="text-xs font-semibold text-slate-700 shrink-0">Партия:</span>
                  <select
                    value={selectedSummaryDate}
                    onChange={e => setSelectedSummaryDate(e.target.value)}
                    className="px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 w-40 sm:w-56 shrink-0 truncate"
                  >
                    <option value="Все партии">Все партии ({items.length} SKU)</option>
                    {batchKeys.map(bk => {
                      const count = items.filter(i => getBatchKey(i) === bk).length;
                      return (
                        <option key={bk} value={bk}>
                          {bk} ({count} SKU)
                        </option>
                      );
                    })}
                  </select>

                  <button
                    type="button"
                    onClick={() => setOnlyConflictsFilter(!onlyConflictsFilter)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                      onlyConflictsFilter
                        ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
                    }`}
                  >
                    <Filter className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {onlyConflictsFilter ? 'Только совпадения' : `Все строки (${rawPivotList.length})`}
                    </span>
                    {totalConflictRows > 0 && !onlyConflictsFilter && (
                      <span className="px-1.5 py-0.2 rounded-full text-2xs font-bold bg-rose-100 text-rose-700 border border-rose-300 shrink-0">
                        {totalConflictRows}
                      </span>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                  {/* Push to Sheets button */}
                  <button
                    type="button"
                    onClick={handlePushAllBatches}
                    disabled={isPushing || items.length === 0}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 shrink-0 whitespace-nowrap"
                    title="Отправить партии товаров в Google Таблицу"
                  >
                    {isPushing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                    ) : (
                      <Send className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{isPushing ? 'Отправка...' : 'Отправить в Sheets'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyBatchForGoogleSheets(summarySourceItems, selectedSummaryDate)}
                    disabled={summarySourceItems.length === 0}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-white hover:bg-sky-50 text-sky-700 border border-sky-300 rounded-lg shadow-xs transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                    title="Скопировать строки для Google Таблицы (Ctrl+V со строки 2761)"
                  >
                    {copiedBatchForSheets ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <Copy className="w-3.5 h-3.5 text-sky-600 shrink-0" />}
                    <span>{copiedBatchForSheets ? 'Скопировано!' : 'Скопировать для Sheets'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportPivotExcel}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-lg shadow-xs transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Экспорт</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPrintView(!showPrintView)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg shadow-xs transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{showPrintView ? 'Скрыть печать' : 'Печать'}</span>
                  </button>
                </div>
              </div>

              {/* Validation Notice Banner */}
              {totalConflictRows > 0 && (
                <div className="p-3 bg-rose-50/90 border border-rose-200 rounded-xl flex items-start gap-3">
                  <div className="p-1 bg-rose-100 rounded-lg shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                  </div>
                  <div className="text-xs text-rose-900 flex-1">
                    <div className="font-bold flex items-center gap-2">
                      <span>Обнаружены группы, уже находящиеся в работе или на паузе ({totalConflictRows} групп / {totalConflictSku} SKU)</span>
                    </div>
                    <p className="text-rose-800 text-[11.5px] mt-0.5">
                      Строки, выделенные <strong className="text-rose-950 underline decoration-rose-400">красным цветом</strong>, уже присутствуют в Отделе контента или Коммерческом отделе со статусами «Новый», «В работе» или «На паузе».
                    </p>
                  </div>
                </div>
              )}

              {/* Metrics cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-2xs uppercase tracking-wider text-slate-400 font-bold">Всего SKU</div>
                  <div className="text-xl font-bold font-mono text-slate-900 mt-1">{totalSummarySku}</div>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-2xs uppercase tracking-wider text-slate-400 font-bold">Менеджеров</div>
                  <div className="text-xl font-bold font-mono text-indigo-600 mt-1">{uniqueManagers}</div>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-2xs uppercase tracking-wider text-slate-400 font-bold">Групп / Разделов</div>
                  <div className="text-xl font-bold font-mono text-blue-600 mt-1">{uniqueSections}</div>
                </div>
                <div className={`p-3.5 rounded-xl border shadow-xs ${totalConflictRows > 0 ? 'bg-rose-50/80 border-rose-200' : 'bg-white border-slate-200'}`}>
                  <div className={`text-2xs uppercase tracking-wider font-bold ${totalConflictRows > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                    В работе / на паузе
                  </div>
                  <div className={`text-xl font-bold font-mono mt-1 ${totalConflictRows > 0 ? 'text-rose-700' : 'text-emerald-600'}`}>
                    {totalConflictRows} {totalConflictRows > 0 ? 'групп ⚠️' : '— нет'}
                  </div>
                </div>
              </div>

              {/* Pivot Table with Red Highlights for matched groups */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[52vh] overflow-y-auto shadow-xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-600 font-semibold uppercase sticky top-0 border-b border-slate-200 z-10">
                    <tr>
                      <th className="px-4 py-2.5 min-w-[180px]">
                        <SortHeader
                          label="Менеджер"
                          columnKey="manager"
                          currentSortKey={pivotSortConfig.key}
                          currentDirection={pivotSortConfig.direction}
                          onSort={handlePivotSort}
                        />
                      </th>
                      <th className="px-4 py-2.5 min-w-[280px]">
                        <SortHeader
                          label="Группа 3 (Раздел)"
                          columnKey="section"
                          currentSortKey={pivotSortConfig.key}
                          currentDirection={pivotSortConfig.direction}
                          onSort={handlePivotSort}
                        />
                      </th>
                      <th className="px-4 py-2.5 text-center min-w-[120px]">
                        <SortHeader
                          label="Количество SKU"
                          columnKey="count"
                          currentSortKey={pivotSortConfig.key}
                          currentDirection={pivotSortConfig.direction}
                          onSort={handlePivotSort}
                          align="center"
                        />
                      </th>
                      <th className="px-4 py-2.5 min-w-[200px] text-slate-500">
                        Статус в отделах (Контент / КАМ)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {pivotList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                          {onlyConflictsFilter ? 'Нет совпадений с активными группами' : 'Нет данных для отображения'}
                        </td>
                      </tr>
                    ) : (
                      pivotList.map((row, i) => {
                        const isConflict = row.hasConflict;

                        return (
                          <tr
                            key={i}
                            className={`transition-colors ${
                              isConflict
                                ? 'bg-rose-50/80 hover:bg-rose-100/80 border-l-4 border-l-rose-600 font-medium'
                                : 'hover:bg-slate-50/70'
                            }`}
                          >
                            {/* Manager Column */}
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-1.5">
                                {isConflict && (
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                )}
                                <span className={isConflict ? 'font-bold text-rose-950' : 'font-medium text-slate-900'}>
                                  {row.manager}
                                </span>
                              </div>
                            </td>

                            {/* Group (Section / Group 3) Column */}
                            <td className="px-4 py-2.5">
                              <div className="flex flex-col gap-1">
                                <span className={isConflict ? 'font-bold text-rose-950 text-[12.5px]' : 'text-slate-800'}>
                                  {row.section}
                                </span>
                              </div>
                            </td>

                            {/* SKU Count */}
                            <td className="px-4 py-2.5 text-center font-mono font-bold">
                              <span className={isConflict ? 'text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-md border border-rose-200' : 'text-blue-700'}>
                                {row.count}
                              </span>
                            </td>

                            {/* Department Conflict Status Badge */}
                            <td className="px-4 py-2.5">
                              {isConflict && row.conflictInfo ? (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-2xs font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                                  <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                                  <span>{row.conflictInfo.description}</span>
                                </div>
                              ) : (
                                <span className="text-2xs text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                  ✓ Свободна (нет в работе)
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}

                    {pivotList.length > 0 && (
                      <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                        <td colSpan={2} className="px-4 py-2.5 text-right text-slate-800">
                          Итого{onlyConflictsFilter ? ' (совпадений)' : ''}:
                        </td>
                        <td className="px-4 py-2.5 text-center font-mono font-bold text-blue-900 text-sm">
                          {pivotList.reduce((acc, r) => acc + r.count, 0)} SKU
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">
                          {totalConflictRows} групп пересекаются
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Upload */}
          {activeTab === 'upload' && (
            <div className="py-4 space-y-4">
              <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/60 rounded-xl p-8 text-center transition-colors">
                <UploadCloud className="w-12 h-12 mx-auto text-blue-500 mb-3" />
                <div className="text-base font-semibold text-slate-800 mb-1">
                  Выберите один или несколько Excel файлов (.xlsx, .xls)
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                  Колонки сопоставляются автоматически: Внешний код, Наименование, Раздел (Группа 3), Код менеджера (main_mng_code)
                </p>
                <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm cursor-pointer shadow-xs transition-colors">
                  <FileSpreadsheet className="w-4 h-4" />
                  Выбрать файлы на компьютере
                  <input
                    type="file"
                    multiple
                    accept=".xlsx, .xls"
                    onChange={handleFilesUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Automatic Sync Option Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoPushToSheets}
                    onChange={e => setAutoPushToSheets(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900">
                      Автоматически синхронизировать и отправлять новые партии в Google Таблицу (лист «Новые товары»)
                    </span>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      При включенной опции загруженные файлы сразу отправляются через Google Apps Script Webhook в таблицу и сохраняются локально.
                    </p>
                  </div>
                </label>

                {!hasWebhook && autoPushToSheets && (
                  <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Webhook URL пока не настроен. Отправка в таблицу заработает после подключения скрипта.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSheetsModalOpen(true)}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-bold text-2xs transition-colors cursor-pointer shrink-0"
                    >
                      Настроить Webhook
                    </button>
                  </div>
                )}
              </div>

              {uploading && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                  <div className="flex justify-between text-xs font-medium text-blue-900">
                    <span>{uploadStatus}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Google Sheets Modal sub-trigger */}
      <GoogleSheetsModal
        isOpen={isSheetsModalOpen}
        onClose={() => {
          setIsSheetsModalOpen(false);
          setHasWebhook(Boolean(googleSheetsService.getWebhookUrl()));
        }}
        onSyncComplete={loadData}
      />
    </>
  );
};
