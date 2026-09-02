import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { ProductItem, DepartmentType } from '../../types';
import { storageService } from '../../services/storageService';
import { exportToExcel } from '../../services/excelService';
import { bitrixLinksService } from '../../services/bitrixLinksService';
import { SortHeader } from '../common/SortHeader';
import { SortConfig, sortData } from '../../utils/sortUtils';
import {
  Package,
  Calendar,
  Search,
  Copy,
  Check,
  FileSpreadsheet,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface AddedProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMonth?: string; // e.g. "current", "2026-05", "all"
  initialDept?: 'all' | DepartmentType;
}

function parseDateParts(dateStr?: string): { day: number; month: number; year: number } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const s = dateStr.trim();
  if (!s) return null;

  // DD.MM.YYYY or DD.MM.YYYY HH:mm
  const dotMatch = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dotMatch) {
    return {
      day: parseInt(dotMatch[1], 10),
      month: parseInt(dotMatch[2], 10),
      year: parseInt(dotMatch[3], 10),
    };
  }

  // YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return {
      day: parseInt(isoMatch[3], 10),
      month: parseInt(isoMatch[2], 10),
      year: parseInt(isoMatch[1], 10),
    };
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return {
      day: d.getDate(),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
    };
  }

  return null;
}

const MONTH_NAMES_RU: Record<number, string> = {
  1: 'Январь',
  2: 'Февраль',
  3: 'Март',
  4: 'Апрель',
  5: 'Май',
  6: 'Июнь',
  7: 'Июль',
  8: 'Август',
  9: 'Сентябрь',
  10: 'Октябрь',
  11: 'Ноябрь',
  12: 'Декабрь',
};

interface UnifiedAddedProduct {
  id: string;
  externalCode: string;
  title: string;
  group3: string;
  department: string;
  status: string;
  dateUploaded: string;
  parsedDate: { year: number; month: number; day: number } | null;
  executor: string;
  sourceFile: string;
  origin: 'products' | 'newProducts';
}

export const AddedProductsModal: React.FC<AddedProductsModalProps> = ({
  isOpen,
  onClose,
  initialMonth = 'current',
  initialDept = 'all',
}) => {
  const [products, setProducts] = useState<ProductItem[]>(() => storageService.getProducts());

  // Current system date & month helpers
  const now = useMemo(() => new Date(), []);
  const currentSysMonth = now.getMonth() + 1;
  const currentSysYear = now.getFullYear();
  const currentMonthKey = `${currentSysYear}-${String(currentSysMonth).padStart(2, '0')}`;
  const currentMonthName = MONTH_NAMES_RU[currentSysMonth] || 'Текущий месяц';

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth || 'current');
  const [selectedDept, setSelectedDept] = useState<'all' | DepartmentType>(initialDept);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [sortConfig, setSortConfig] = useState<SortConfig<UnifiedAddedProduct>>({
    key: 'dateUploaded',
    direction: 'desc',
  });

  // Action UI states
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedAllFeedback, setCopiedAllFeedback] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [, setBitrixVersion] = useState(0);

  // Sync state with storage and bitrix links
  useEffect(() => {
    if (isOpen) {
      setProducts(storageService.getProducts());
      if (initialMonth) setSelectedMonth(initialMonth);
      if (initialDept) setSelectedDept(initialDept);
      setCurrentPage(1);
      bitrixLinksService.fetchLinks().catch(() => {});
    }
    const unsubStorage = storageService.subscribe(() => {
      setProducts(storageService.getProducts());
    });
    const unsubBitrix = bitrixLinksService.subscribe(() => {
      setBitrixVersion(v => v + 1);
    });
    return () => {
      unsubStorage();
      unsubBitrix();
    };
  }, [isOpen, initialMonth, initialDept]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Convert raw records into unified display records — ONLY completed products
  const allUnifiedProducts = useMemo<UnifiedAddedProduct[]>(() => {
    const list: UnifiedAddedProduct[] = [];

    products.forEach((p, idx) => {
      const s = (p.status || '').toLowerCase();
      // Strictly ONLY completed products
      const isCompleted = s.includes('выполн') || s.includes('заверш') || s.includes('готов');
      if (!isCompleted) return;

      const completionDateStr = p.dateCompleted || p.dateUploaded || p.dateTaken || '';
      const parsed = parseDateParts(completionDateStr);
      list.push({
        id: p.id || `prod-${idx}`,
        externalCode: p.externalCode || `SKU-${idx + 1}`,
        title: p.title || p.group3 || 'Без названия',
        group3: p.group3 || 'Без группы',
        department: p.department || 'Отдел контента',
        status: 'Выполнено',
        dateUploaded: completionDateStr || '—',
        parsedDate: parsed,
        executor: p.executor || 'Не назначен',
        sourceFile: p.sourceFile || 'Google Sheets',
        origin: 'products',
      });
    });

    return list;
  }, [products]);

  // Compute all available months with count
  const { availableMonthsList, currentMonthCount } = useMemo(() => {
    const map = new Map<string, { year: number; month: number; count: number }>();

    allUnifiedProducts.forEach(p => {
      if (p.parsedDate) {
        const key = `${p.parsedDate.year}-${String(p.parsedDate.month).padStart(2, '0')}`;
        if (!map.has(key)) {
          map.set(key, { year: p.parsedDate.year, month: p.parsedDate.month, count: 0 });
        }
        map.get(key)!.count++;
      }
    });

    const currentCount = map.get(currentMonthKey)?.count || 0;

    const arr = Array.from(map.entries())
      .filter(([key]) => key !== currentMonthKey)
      .map(([key, val]) => ({
        key,
        year: val.year,
        month: val.month,
        count: val.count,
        label: `${MONTH_NAMES_RU[val.month] || val.month} ${val.year}`,
      }));

    const sortedList = arr.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    return {
      availableMonthsList: sortedList,
      currentMonthCount: currentCount,
    };
  }, [allUnifiedProducts, currentMonthKey]);

  // Filter products by selected month, department, and search query
  const filteredProducts = useMemo(() => {
    return allUnifiedProducts.filter(item => {
      // 1. Month filter
      if (selectedMonth !== 'all') {
        if (!item.parsedDate) return false;
        if (selectedMonth === 'current' || selectedMonth === currentMonthKey) {
          if (item.parsedDate.year !== currentSysYear || item.parsedDate.month !== currentSysMonth) {
            return false;
          }
        } else {
          const itemMonthKey = `${item.parsedDate.year}-${String(item.parsedDate.month).padStart(2, '0')}`;
          if (itemMonthKey !== selectedMonth) return false;
        }
      }

      // 2. Department filter
      if (selectedDept !== 'all') {
        if (item.department !== selectedDept) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          item.externalCode.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          item.group3.toLowerCase().includes(q) ||
          item.executor.toLowerCase().includes(q) ||
          item.sourceFile.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [allUnifiedProducts, selectedMonth, selectedDept, searchQuery, currentMonthKey, currentSysMonth, currentSysYear]);

  // Sorted list
  const sortedProducts = useMemo(() => {
    return sortData(filteredProducts, sortConfig);
  }, [filteredProducts, sortConfig]);

  // Statistics for current filtered set
  const stats = useMemo(() => {
    let contentCount = 0;
    let kamCount = 0;
    const uniqueGroups = new Set<string>();
    const uniqueExecutors = new Set<string>();
    const uniqueFiles = new Set<string>();

    filteredProducts.forEach(p => {
      if (p.department === 'Отдел контента') {
        contentCount++;
      } else {
        kamCount++;
      }

      if (p.group3) uniqueGroups.add(p.group3);
      if (p.executor && p.executor !== 'Не назначен') uniqueExecutors.add(p.executor);
      if (p.sourceFile) uniqueFiles.add(p.sourceFile);
    });

    return {
      total: filteredProducts.length,
      contentCount,
      kamCount,
      groupsCount: uniqueGroups.size,
      executorsCount: uniqueExecutors.size,
      filesCount: uniqueFiles.size,
    };
  }, [filteredProducts]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedProducts.slice(start, start + pageSize);
  }, [sortedProducts, currentPage, pageSize]);

  // Handle Sort Toggle
  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key, direction: null };
        return { key, direction: 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  // Copy single code
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Copy all external codes of the filtered list
  const handleCopyAllCodes = () => {
    const codes = filteredProducts.map(p => p.externalCode).filter(Boolean);
    if (codes.length === 0) {
      showNotification('Нет кодов для копирования');
      return;
    }
    navigator.clipboard.writeText(codes.join('\n'));
    setCopiedAllFeedback(true);
    showNotification(`Скопировано ${codes.length} артикулов в буфер обмена`);
    setTimeout(() => setCopiedAllFeedback(false), 2500);
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredProducts.length === 0) {
      showNotification('Нет данных для выгрузки');
      return;
    }

    const monthLabel =
      selectedMonth === 'all'
        ? 'Все_месяцы'
        : selectedMonth === 'current' || selectedMonth === currentMonthKey
        ? `Текущий_${currentMonthName}_${currentSysYear}`
        : availableMonthsList.find(m => m.key === selectedMonth)?.label.replace(/\s+/g, '_') || selectedMonth;

    const exportRows = filteredProducts.map((p, idx) => ({
      '№': idx + 1,
      'Внешний код': p.externalCode,
      'Наименование товара': p.title,
      'Группа 3': p.group3,
      'Отдел': p.department,
      'Статус': 'Выполнено',
      'Дата добавления / завершения': p.dateUploaded,
      'Исполнитель': p.executor,
      'Источник / Файл': p.sourceFile,
    }));

    exportToExcel(exportRows, `Добавленные_товары_Выполнено_${monthLabel}_${new Date().toISOString().slice(0, 10)}`);
    showNotification('Файл Excel успешно сформирован и скачан!');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📦 Реестр добавленных (выполненных) товаров с выбором по месяцам"
      maxWidth="7xl"
    >
      <div className="space-y-4 text-slate-800">
        {/* Floating toast notification */}
        {notification && (
          <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{notification}</span>
          </div>
        )}

        {/* 1. Control Panel: Month selector, Department, Search & Export */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Month Selector Dropdown */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-300 shadow-2xs">
                <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
                <span className="text-xs font-bold text-slate-600">Месяц:</span>
                <select
                  value={selectedMonth}
                  onChange={e => {
                    setSelectedMonth(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs font-black text-slate-900 focus:outline-none pr-2 py-0.5 cursor-pointer"
                  title="Выберите месяц добавления товаров"
                >
                  <option value="current">
                    Текущий ({currentMonthName} {currentSysYear}) — {currentMonthCount.toLocaleString('ru-RU')} SKU
                  </option>
                  <option value="all">
                    Все месяцы ({allUnifiedProducts.length.toLocaleString('ru-RU')} выполнено)
                  </option>
                  {availableMonthsList.map(m => (
                    <option key={m.key} value={m.key}>
                      {m.label} — {m.count.toLocaleString('ru-RU')} SKU
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Filter Toggle */}
              <div className="inline-flex p-1 bg-slate-200/80 rounded-xl border border-slate-300">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDept('all');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedDept === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Все отделы
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDept('Отдел контента');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedDept === 'Отдел контента'
                      ? 'bg-white text-sky-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🎨 Контент ({stats.contentCount})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDept('Коммерческий отдел');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedDept === 'Коммерческий отдел'
                      ? 'bg-white text-indigo-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  💼 КАМ ({stats.kamCount})
                </button>
              </div>

              {/* Fixed Status indicator */}
              <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Статус: Только Выполнено</span>
              </div>
            </div>

            {/* Action Buttons: Export Excel & Copy All */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyAllCodes}
                className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-300 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                title="Скопировать все внешние коды отфильтрованного списка"
              >
                {copiedAllFeedback ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Скопировано!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                    <span>Скопировать коды ({filteredProducts.length})</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                title="Выгрузить текущую выборку в Excel файл"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
                <span>Выгрузить в Excel</span>
              </button>
            </div>
          </div>

          {/* Search bar & Page size */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-slate-200">
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск по артикулу, названию, группе, файлу или исполнителю..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 self-end sm:self-center font-medium">
              <span>Строк на странице:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. Micro KPI Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 flex flex-col justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">Всего выполнено</span>
            <span className="text-lg font-black text-emerald-900 font-mono mt-0.5">
              {stats.total.toLocaleString('ru-RU')} SKU
            </span>
          </div>

          <div className="p-3 bg-sky-50/70 rounded-xl border border-sky-200 flex flex-col justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-800">Отдел контента</span>
            <span className="text-base font-black text-sky-700 font-mono mt-0.5">
              {stats.contentCount.toLocaleString('ru-RU')} SKU
            </span>
          </div>

          <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200 flex flex-col justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-800">Коммерческий отдел</span>
            <span className="text-base font-black text-indigo-700 font-mono mt-0.5">
              {stats.kamCount.toLocaleString('ru-RU')} SKU
            </span>
          </div>

          <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200 flex flex-col justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-800">Уникальных групп 3</span>
            <span className="text-base font-black text-purple-900 font-mono mt-0.5">
              {stats.groupsCount}
            </span>
          </div>

          <div className="p-3 bg-slate-100/70 rounded-xl border border-slate-200 flex flex-col justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Исполнителей</span>
            <span className="text-base font-black text-slate-900 font-mono mt-0.5">
              {stats.executorsCount}
            </span>
          </div>
        </div>

        {/* 3. Products Data Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white max-h-[55vh] overflow-y-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100/90 text-slate-700 uppercase font-mono text-[11px] tracking-wider sticky top-0 z-10 border-b border-slate-200 backdrop-blur-xs">
              <tr>
                <th className="px-3.5 py-2.5 w-12 text-center">№</th>
                <th className="px-3.5 py-2.5 min-w-[160px]">
                  <SortHeader
                    label="Внешний код"
                    columnKey="externalCode"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-3.5 py-2.5 min-w-[240px]">
                  <SortHeader
                    label="Наименование"
                    columnKey="title"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-3.5 py-2.5 min-w-[180px]">
                  <SortHeader
                    label="Группа 3"
                    columnKey="group3"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-3.5 py-2.5 min-w-[170px]">
                  <SortHeader
                    label="Отдел"
                    columnKey="department"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-3.5 py-2.5 min-w-[120px]">
                  <SortHeader
                    label="Статус"
                    columnKey="status"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-3.5 py-2.5 min-w-[130px]">
                  <SortHeader
                    label="Дата завершения"
                    columnKey="dateUploaded"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-3.5 py-2.5 min-w-[140px]">
                  <SortHeader
                    label="Исполнитель"
                    columnKey="executor"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-3.5 py-2.5 min-w-[160px]">
                  <SortHeader
                    label="Источник / Файл"
                    columnKey="sourceFile"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Выполненных товаров за выбранный период не найдено
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  const isCopied = copiedCode === p.externalCode;

                  return (
                    <tr key={p.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-2 text-center text-slate-400 font-mono text-[11px]">
                        {globalIdx}
                      </td>
                      <td className="px-3.5 py-2 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-[110px]">{p.externalCode}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(p.externalCode)}
                            className="text-slate-400 hover:text-sky-600 transition-colors p-1 rounded-md hover:bg-slate-100 cursor-pointer"
                            title="Скопировать артикул"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {(() => {
                            const bitrixId = bitrixLinksService.getId(p.externalCode);
                            const bitrixUrl = bitrixLinksService.getUrl(p.externalCode);

                            if (bitrixUrl) {
                              return (
                                <a
                                  href={bitrixUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded-md text-sky-600 hover:text-sky-800 hover:bg-sky-50 transition-all inline-flex items-center cursor-pointer shadow-2xs border border-sky-200/60 bg-sky-50/50"
                                  title={`Перейти к товару в Битрикс (ID: ${bitrixId})`}
                                >
                                  <ExternalLink className="w-3.5 h-3.5 text-sky-600" />
                                </a>
                              );
                            }

                            return (
                              <span
                                className="p-1 rounded-md text-slate-300 inline-flex items-center cursor-not-allowed"
                                title="ID элемента не найден в реестре ссылок"
                              >
                                <ExternalLink className="w-3.5 h-3.5 opacity-30" />
                              </span>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-3.5 py-2 text-slate-800 font-medium max-w-[280px]">
                        <div className="truncate" title={p.title}>
                          {p.title}
                        </div>
                      </td>
                      <td className="px-3.5 py-2 text-slate-600 max-w-[200px]">
                        <div className="truncate" title={p.group3}>
                          {p.group3}
                        </div>
                      </td>
                      <td className="px-3.5 py-2 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap inline-block ${
                            p.department === 'Отдел контента'
                              ? 'bg-sky-50 text-sky-800 border border-sky-200'
                              : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                          }`}
                        >
                          {p.department === 'Отдел контента' ? '🎨 Отдел контента' : '💼 Коммерческий отдел'}
                        </span>
                      </td>
                      <td className="px-3.5 py-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Выполнено</span>
                        </span>
                      </td>
                      <td className="px-3.5 py-2 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                        {p.dateUploaded}
                      </td>
                      <td className="px-3.5 py-2 text-slate-700 font-semibold max-w-[150px] truncate" title={p.executor}>
                        {p.executor}
                      </td>
                      <td className="px-3.5 py-2 text-slate-500 text-[11px] max-w-[180px]">
                        <div className="truncate" title={p.sourceFile}>
                          {p.sourceFile}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Pagination & Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-500">
            Показано с <strong className="text-slate-800 font-mono">{(currentPage - 1) * pageSize + 1}</strong> по{' '}
            <strong className="text-slate-800 font-mono">
              {Math.min(currentPage * pageSize, sortedProducts.length)}
            </strong>{' '}
            из <strong className="text-slate-900 font-mono">{sortedProducts.length.toLocaleString('ru-RU')}</strong> товаров
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Предыдущая страница"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-bold text-slate-700 px-2 font-mono">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Следующая страница"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </Modal>
  );
};
