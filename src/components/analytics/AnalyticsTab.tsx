import React, { useState, useMemo } from 'react';
import { storageService } from '../../services/storageService';
import { exportAnalyticsReportToExcel } from '../../services/excelService';
import { ProductItem, DepartmentType, CategoryGroup } from '../../types';
import { SPREADSHEET_URL, KAM_SPREADSHEET_URL, TASKS_SPREADSHEET_URL, GROUPS_SPREADSHEET_URL, SITE_ORDER_SPREADSHEET_URL } from '../../constants';
import { GroupsMonthlyTrendCard } from './GroupsMonthlyTrendCard';
import { SortHeader } from '../common/SortHeader';
import { SortConfig, sortData } from '../../utils/sortUtils';
import { Modal } from '../common/Modal';
import { AddedProductsModal } from '../modals/AddedProductsModal';
import {
  BarChart3,
  TrendingUp,
  Users,
  PauseCircle,
  CheckCircle2,
  Clock,
  Search,
  FolderTree,
  FileSpreadsheet,
  CalendarCheck,
  Sparkles,
  Calendar,
  Layers,
  FileText,
  ExternalLink,
  Copy,
  HelpCircle,
  Info,
  ShieldAlert,
  CalendarRange,
  ArrowUpRight,
  ArrowDownRight,
  PackagePlus,
  Package,
  Table as TableIcon,
  LineChart as LineChartIcon,
  BarChart2
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

export interface ExecutorStat {
  executor: string;
  department: string;
  completedSku: number;
  inWorkSku: number;
  pausedSku: number;
  newSku: number;
  totalSku: number;
}

export interface PauseReasonStat {
  reason: string;
  count: number;
  percentage: number;
  affectedFiles: string[];
  affectedExecutors: string[];
}

export interface CompletedFileInfo {
  fileName: string;
  group3: string;
  executor: string;
  completionDate: string;
  department: string;
  skuCount: number;
}

export interface MonthlySkuDynamicsPoint {
  monthKey: string;
  monthLabel: string;
  monthFullLabel: string;
  year: number;
  month: number;
  totalAdded: number;
  contentAdded: number;
  kamAdded: number;
  completed: number;
  filesCount: number;
  deptAdded: number;
  momGrowthSku: number;
  momGrowthPct: number | null;
  // Recharts field helpers
  'Всего добавлено': number;
  'Контент (добавлено)': number;
  'КАМ (добавлено)': number;
  'Выведено': number;
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

const SHORT_MONTH_NAMES_RU: Record<number, string> = {
  1: 'Янв',
  2: 'Фев',
  3: 'Мар',
  4: 'Апр',
  5: 'Май',
  6: 'Июн',
  7: 'Июл',
  8: 'Авг',
  9: 'Сен',
  10: 'Окт',
  11: 'Ноя',
  12: 'Дек',
};

export const AnalyticsTab: React.FC = () => {
  const [selectedDept, setSelectedDept] = useState<'all' | DepartmentType>('all');
  const [searchExecutor, setSearchExecutor] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Month selection filter ('current' | 'YYYY-MM' | 'all')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current');

  // Bottom Monthly Chart settings
  const [monthlyChartMode, setMonthlyChartMode] = useState<'stacked' | 'compare' | 'trend'>('stacked');
  const [showMonthlyTable, setShowMonthlyTable] = useState(false);

  // Modals state
  const [isCompletedFilesModalOpen, setIsCompletedFilesModalOpen] = useState(false);
  const [isSheetsHelpModalOpen, setIsSheetsHelpModalOpen] = useState(false);
  const [isAddedProductsModalOpen, setIsAddedProductsModalOpen] = useState(false);
  const [addedProductsModalMonth, setAddedProductsModalMonth] = useState<string>('all');
  const [completedFileSearch, setCompletedFileSearch] = useState('');

  // Sorting configs for executors
  const [executorSort, setExecutorSort] = useState<SortConfig<ExecutorStat>>({
    key: 'completedSku',
    direction: 'desc',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Ссылка на ${label} скопирована в буфер обмена`);
  };

  // Load all products and category groups with reactive subscription
  const [allProducts, setAllProducts] = useState<ProductItem[]>(() => storageService.getProducts());
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>(() => storageService.getCategoryGroups());

  React.useEffect(() => {
    setAllProducts(storageService.getProducts());
    setCategoryGroups(storageService.getCategoryGroups());
    const unsub = storageService.subscribe(() => {
      setAllProducts(storageService.getProducts());
      setCategoryGroups(storageService.getCategoryGroups());
    });
    return () => unsub();
  }, []);

  // Filter products by selected department
  const filteredProducts = useMemo(() => {
    if (selectedDept === 'all') return allProducts;
    return allProducts.filter(p => p.department === selectedDept);
  }, [allProducts, selectedDept]);

  // Current system month/year
  const now = new Date();
  const currentSysMonth = now.getMonth() + 1;
  const currentSysYear = now.getFullYear();

  // Find all distinct months available in completed products
  const availableMonths = useMemo(() => {
    const monthMap = new Map<string, { year: number; month: number; count: number }>();

    allProducts.forEach(p => {
      const s = (p.status || '').toLowerCase();
      const isDone = s.includes('выполн') || s.includes('заверш') || s.includes('готово');
      if (isDone) {
        const dObj = parseDateParts(p.dateCompleted || p.dateFinished);
        if (dObj) {
          const key = `${dObj.year}-${String(dObj.month).padStart(2, '0')}`;
          if (!monthMap.has(key)) {
            monthMap.set(key, { year: dObj.year, month: dObj.month, count: 0 });
          }
          monthMap.get(key)!.count++;
        }
      }
    });

    const list = Array.from(monthMap.entries()).map(([key, val]) => ({
      key,
      year: val.year,
      month: val.month,
      count: val.count,
      label: `${MONTH_NAMES_RU[val.month] || val.month} ${val.year}`,
    }));

    // Sort descending by date
    return list.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [allProducts]);

  // Active target month and year based on selectedPeriod
  const activePeriodInfo = useMemo(() => {
    if (selectedPeriod === 'all') {
      return { isAll: true, month: null, year: null, label: 'За все время' };
    }
    if (selectedPeriod === 'current') {
      return {
        isAll: false,
        month: currentSysMonth,
        year: currentSysYear,
        label: `${MONTH_NAMES_RU[currentSysMonth]} ${currentSysYear}`,
      };
    }
    // format YYYY-MM
    const parts = selectedPeriod.split('-');
    if (parts.length === 2) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      return {
        isAll: false,
        month: m,
        year: y,
        label: `${MONTH_NAMES_RU[m] || m} ${y}`,
      };
    }
    return {
      isAll: false,
      month: currentSysMonth,
      year: currentSysYear,
      label: `${MONTH_NAMES_RU[currentSysMonth]} ${currentSysYear}`,
    };
  }, [selectedPeriod, currentSysMonth, currentSysYear]);

  // 1. KPI and Global Summary
  const { kpiStats, completedFilesInPeriod } = useMemo(() => {
    let completed = 0;
    let inWork = 0;
    let paused = 0;
    let newQueue = 0;
    let periodCompletedSku = 0;

    const fileMap = new Map<string, CompletedFileInfo>();

    filteredProducts.forEach(p => {
      const s = (p.status || '').toLowerCase();
      const isDone = s.includes('выполн') || s.includes('заверш') || s.includes('готово');

      if (isDone) {
        completed++;
        const dateObj = parseDateParts(p.dateCompleted || p.dateFinished);

        let matchesPeriod = false;
        if (activePeriodInfo.isAll) {
          matchesPeriod = true;
        } else if (dateObj && dateObj.month === activePeriodInfo.month && dateObj.year === activePeriodInfo.year) {
          matchesPeriod = true;
        }

        if (matchesPeriod) {
          periodCompletedSku++;

          // Aggregate file info
          const fName = (p.sourceFile || '').trim() || 'Без имени файла';
          if (!fileMap.has(fName)) {
            fileMap.set(fName, {
              fileName: fName,
              group3: p.group3 || 'Общая группа',
              executor: p.executor || 'Не назначен',
              completionDate: p.dateCompleted || p.dateFinished || '—',
              department: p.department,
              skuCount: 0,
            });
          }
          fileMap.get(fName)!.skuCount++;
        }
      } else if (s.includes('работ')) {
        inWork++;
      } else if (s.includes('пауз')) {
        paused++;
      } else {
        newQueue++;
      }
    });

    const fileList = Array.from(fileMap.values()).sort((a, b) => b.skuCount - a.skuCount);

    return {
      kpiStats: {
        completedInPeriod: periodCompletedSku,
        filesInPeriodCount: fileList.length,
        completed,
        inWork,
        paused,
        newQueue,
      },
      completedFilesInPeriod: fileList,
    };
  }, [filteredProducts, activePeriodInfo]);

  // 2. Executors Statistics & Breakdown
  const executorStats = useMemo<ExecutorStat[]>(() => {
    const map = new Map<string, {
      executor: string;
      departments: Set<string>;
      completedSku: number;
      inWorkSku: number;
      pausedSku: number;
      newSku: number;
      totalSku: number;
    }>();

    filteredProducts.forEach(p => {
      const rawExec = (p.executor || '').trim();
      const exec = rawExec || 'Не назначен';
      const key = exec.toLowerCase();

      if (!map.has(key)) {
        map.set(key, {
          executor: exec,
          departments: new Set([p.department]),
          completedSku: 0,
          inWorkSku: 0,
          pausedSku: 0,
          newSku: 0,
          totalSku: 0,
        });
      }

      const entry = map.get(key)!;
      entry.departments.add(p.department);
      entry.totalSku++;

      const s = (p.status || '').toLowerCase();
      if (s.includes('выполн') || s.includes('заверш') || s.includes('готово')) {
        entry.completedSku++;
      } else if (s.includes('работ')) {
        entry.inWorkSku++;
      } else if (s.includes('пауз')) {
        entry.pausedSku++;
      } else {
        entry.newSku++;
      }
    });

    return Array.from(map.values()).map(e => {
      let deptDisplay = '';
      if (selectedDept !== 'all') {
        deptDisplay = selectedDept;
      } else {
        if (e.departments.size > 1) {
          deptDisplay = 'Контент + КАМ';
        } else {
          deptDisplay = Array.from(e.departments)[0] || 'Все отделы';
        }
      }

      return {
        executor: e.executor,
        department: deptDisplay,
        completedSku: e.completedSku,
        inWorkSku: e.inWorkSku,
        pausedSku: e.pausedSku,
        newSku: e.newSku,
        totalSku: e.totalSku,
      };
    });
  }, [filteredProducts, selectedDept]);

  // Top performers for Bar Chart
  const topExecutorsChartData = useMemo(() => {
    return [...executorStats]
      .filter(e => e.executor !== 'Не назначен' && (e.completedSku > 0 || e.inWorkSku > 0 || e.pausedSku > 0 || e.newSku > 0))
      .sort((a, b) => b.completedSku - a.completedSku || b.totalSku - a.totalSku)
      .slice(0, 12)
      .map(e => ({
        name: e.executor.length > 15 ? `${e.executor.slice(0, 13)}...` : e.executor,
        fullName: e.executor,
        department: e.department,
        'Выполнено': e.completedSku,
        'В работе': e.inWorkSku,
        'На паузе': e.pausedSku,
        'В очереди': e.newSku,
      }));
  }, [executorStats]);

  // Filtered & Sorted Executors for Table
  const sortedExecutors = useMemo(() => {
    let list = executorStats;
    if (searchExecutor.trim()) {
      const q = searchExecutor.toLowerCase();
      list = list.filter(e => e.executor.toLowerCase().includes(q) || e.department.toLowerCase().includes(q));
    }
    return sortData(list, executorSort);
  }, [executorStats, searchExecutor, executorSort]);

  // 3. Pause Reasons Analysis
  const pauseReasonStats = useMemo<PauseReasonStat[]>(() => {
    const pausedProducts = filteredProducts.filter(p => {
      const s = (p.status || '').toLowerCase();
      return s.includes('пауз');
    });

    const totalPaused = pausedProducts.length;
    if (totalPaused === 0) return [];

    const map = new Map<string, {
      reason: string;
      count: number;
      files: Set<string>;
      executors: Set<string>;
    }>();

    pausedProducts.forEach(p => {
      const r = (p.pauseReason || '').trim() || 'Причина не указана';
      if (!map.has(r)) {
        map.set(r, {
          reason: r,
          count: 0,
          files: new Set(),
          executors: new Set(),
        });
      }
      const entry = map.get(r)!;
      entry.count++;
      if (p.sourceFile) entry.files.add(p.sourceFile);
      if (p.executor) entry.executors.add(p.executor);
    });

    return Array.from(map.values())
      .map(entry => ({
        reason: entry.reason,
        count: entry.count,
        percentage: Number(((entry.count / totalPaused) * 100).toFixed(1)),
        affectedFiles: Array.from(entry.files),
        affectedExecutors: Array.from(entry.executors),
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredProducts]);

  // 4. Monthly SKU Addition Dynamics (All Months)
  const monthlySkuDynamics = useMemo<MonthlySkuDynamicsPoint[]>(() => {
    const monthMap = new Map<string, {
      year: number;
      month: number;
      totalAdded: number;
      contentAdded: number;
      kamAdded: number;
      completed: number;
      files: Set<string>;
    }>();

    allProducts.forEach(p => {
      // 1. Added SKU by upload / intake date
      const uObj = parseDateParts(p.dateUploaded || p.dateTaken);
      if (uObj) {
        const key = `${uObj.year}-${String(uObj.month).padStart(2, '0')}`;
        if (!monthMap.has(key)) {
          monthMap.set(key, {
            year: uObj.year,
            month: uObj.month,
            totalAdded: 0,
            contentAdded: 0,
            kamAdded: 0,
            completed: 0,
            files: new Set(),
          });
        }
        const entry = monthMap.get(key)!;
        entry.totalAdded++;
        if (p.department === 'Отдел контента') {
          entry.contentAdded++;
        } else if (p.department === 'Коммерческий отдел') {
          entry.kamAdded++;
        }
        if (p.sourceFile) {
          entry.files.add(p.sourceFile);
        }
      }

      // 2. Completed SKU by completion date
      const isDone = (p.status || '').toLowerCase().includes('выполн');
      if (isDone) {
        const dObj = parseDateParts(p.dateCompleted || p.dateFinished);
        if (dObj) {
          const key = `${dObj.year}-${String(dObj.month).padStart(2, '0')}`;
          if (!monthMap.has(key)) {
            monthMap.set(key, {
              year: dObj.year,
              month: dObj.month,
              totalAdded: 0,
              contentAdded: 0,
              kamAdded: 0,
              completed: 0,
              files: new Set(),
            });
          }
          monthMap.get(key)!.completed++;
        }
      }
    });

    const sortedKeys = Array.from(monthMap.keys()).sort();

    let prevDeptAdded = 0;
    return sortedKeys.map((key, index) => {
      const item = monthMap.get(key)!;
      const shortLabel = `${SHORT_MONTH_NAMES_RU[item.month] || item.month} '${String(item.year).slice(2)}`;
      const fullLabel = `${MONTH_NAMES_RU[item.month] || item.month} ${item.year}`;

      let deptAdded = item.totalAdded;
      if (selectedDept === 'Отдел контента') {
        deptAdded = item.contentAdded;
      } else if (selectedDept === 'Коммерческий отдел') {
        deptAdded = item.kamAdded;
      }

      const momDiff = index === 0 ? 0 : deptAdded - prevDeptAdded;
      const momPct = index === 0 || prevDeptAdded === 0 ? null : Number(((momDiff / prevDeptAdded) * 100).toFixed(1));
      prevDeptAdded = deptAdded;

      return {
        monthKey: key,
        monthLabel: shortLabel,
        monthFullLabel: fullLabel,
        year: item.year,
        month: item.month,
        totalAdded: item.totalAdded,
        contentAdded: item.contentAdded,
        kamAdded: item.kamAdded,
        completed: item.completed,
        filesCount: item.files.size,
        deptAdded,
        momGrowthSku: momDiff,
        momGrowthPct: momPct,
        'Всего добавлено': deptAdded,
        'Контент (добавлено)': item.contentAdded,
        'КАМ (добавлено)': item.kamAdded,
        'Выведено': item.completed,
      };
    });
  }, [allProducts, selectedDept]);

  // Overall Monthly Stats Summary
  const monthlySummary = useMemo(() => {
    if (monthlySkuDynamics.length === 0) {
      return { totalAdded: 0, avgMonthly: 0, peakMonth: null, totalCompleted: 0 };
    }

    const totalAdded = monthlySkuDynamics.reduce((acc, m) => acc + m.deptAdded, 0);
    const totalCompleted = monthlySkuDynamics.reduce((acc, m) => acc + m.completed, 0);
    const avgMonthly = Math.round(totalAdded / monthlySkuDynamics.length);

    let peak = monthlySkuDynamics[0];
    monthlySkuDynamics.forEach(m => {
      if (m.deptAdded > peak.deptAdded) {
        peak = m;
      }
    });

    return {
      totalAdded,
      avgMonthly,
      peakMonth: peak,
      totalCompleted,
    };
  }, [monthlySkuDynamics]);

  // Filtered completed files for modal search
  const filteredModalFiles = useMemo(() => {
    if (!completedFileSearch.trim()) return completedFilesInPeriod;
    const q = completedFileSearch.toLowerCase();
    return completedFilesInPeriod.filter(
      f =>
        f.fileName.toLowerCase().includes(q) ||
        f.group3.toLowerCase().includes(q) ||
        f.executor.toLowerCase().includes(q)
    );
  }, [completedFilesInPeriod, completedFileSearch]);

  // Export Analytics to Excel
  const handleExportExcel = () => {
    try {
      const deptLabel = selectedDept === 'all' ? 'Все отделы' : selectedDept;

      // 1. KPI summary sheet
      const kpiRows = [
        { 'Показатель': 'Выбранный отдел', 'Значение': deptLabel },
        { 'Показатель': `Выведено за период (${activePeriodInfo.label})`, 'Значение': kpiStats.completedInPeriod },
        { 'Показатель': 'Файлов выведено за период', 'Значение': kpiStats.filesInPeriodCount },
        { 'Показатель': 'Выполнено всего SKU', 'Значение': kpiStats.completed },
        { 'Показатель': 'В работе SKU', 'Значение': kpiStats.inWork },
        { 'Показатель': 'На паузе SKU', 'Значение': kpiStats.paused },
        { 'Показатель': 'В очереди / Новые SKU', 'Значение': kpiStats.newQueue },
      ];

      // 2. Monthly SKU additions sheet
      const monthlyRows = monthlySkuDynamics.map(m => ({
        'Месяц': m.monthFullLabel,
        'Добавлено (Отдел контента)': m.contentAdded,
        'Добавлено (КАМ)': m.kamAdded,
        'Всего добавлено SKU': m.totalAdded,
        'Выведено в этом месяце': m.completed,
        'Количество файлов': m.filesCount,
        'Прирост к пред. месяцу (SKU)': m.momGrowthSku >= 0 ? `+${m.momGrowthSku}` : String(m.momGrowthSku),
        'Прирост к пред. месяцу (%)': m.momGrowthPct !== null ? `${m.momGrowthPct > 0 ? '+' : ''}${m.momGrowthPct}%` : '—',
      }));

      // 3. Completed Files in Period sheet
      const completedFilesRows = completedFilesInPeriod.map(f => ({
        'Имя файла': f.fileName,
        'Группа 3': f.group3,
        'Исполнитель': f.executor,
        'Дата завершения': f.completionDate,
        'Отдел': f.department,
        'Количество SKU': f.skuCount,
      }));

      // 4. Executors sheet
      const execRows = executorStats.map(e => ({
        'Исполнитель': e.executor,
        'Отдел': e.department,
        'Выполнено (SKU)': e.completedSku,
        'В работе (SKU)': e.inWorkSku,
        'На паузе (SKU)': e.pausedSku,
        'В очереди (SKU)': e.newSku,
      }));

      // 5. Pause reasons sheet
      const pauseRows = pauseReasonStats.map(p => ({
        'Причина паузы': p.reason,
        'Количество SKU': p.count,
        'Доля от всех на паузе (%)': `${p.percentage}%`,
        'Затронутые файлы': p.affectedFiles.join(', '),
        'Исполнители': p.affectedExecutors.join(', '),
      }));

      const dateStr = new Date().toISOString().split('T')[0];
      exportAnalyticsReportToExcel({
        kpi: kpiRows,
        monthlyStats: monthlyRows,
        executors: execRows,
        categories: completedFilesRows,
        pauseReasons: pauseRows,
      }, `Аналитический_отчет_${dateStr}`);

      showToast('Аналитический отчет успешно выгружен в Excel!');
    } catch (err: any) {
      showToast(`Ошибка экспорта: ${err.message || err}`);
    }
  };

  const handleExecutorSort = (key: string) => {
    setExecutorSort(prev => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key, direction: null };
        return { key, direction: 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/90 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 backdrop-blur-sm border border-slate-700 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Controls Header */}
      <div className="bg-white/95 backdrop-blur-xs rounded-2xl p-5 border border-sky-100/80 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-sky-500 to-indigo-600 text-white rounded-xl shadow-xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-none">
                Операционная аналитика и показатели
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Сводка по статусам, выведенным товарам и производительности сотрудников
            </p>
          </div>
        </div>

        {/* Action buttons & Department / Month Toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month / Period Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-500 ml-2" />
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none pr-2 py-1 cursor-pointer"
              title="Выберите отчетный месяц для расчета выведенных товаров"
            >
              <option value="current">Текущий месяц ({MONTH_NAMES_RU[currentSysMonth]} {currentSysYear})</option>
              {availableMonths.map(m => (
                <option key={m.key} value={m.key}>
                  {m.label} ({m.count} SKU)
                </option>
              ))}
              <option value="all">За все время</option>
            </select>
          </div>

          {/* Department Filter Toggle */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setSelectedDept('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedDept === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Все отделы
            </button>
            <button
              type="button"
              onClick={() => setSelectedDept('Отдел контента')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedDept === 'Отдел контента'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🎨 Контент
            </button>
            <button
              type="button"
              onClick={() => setSelectedDept('Коммерческий отдел')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedDept === 'Коммерческий отдел'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              💼 КАМ
            </button>
          </div>

          {/* NEW: View Added Products by Month Button */}
          <button
            type="button"
            onClick={() => {
              setAddedProductsModalMonth(selectedPeriod === 'current' ? `${currentSysYear}-${String(currentSysMonth).padStart(2, '0')}` : selectedPeriod);
              setIsAddedProductsModalOpen(true);
            }}
            className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer hover:shadow-sky-200"
            title="Просмотреть детальный реестр добавленных товаров с выбором по месяцам"
          >
            <Package className="w-4 h-4 text-sky-100" />
            <span>Добавленные товары</span>
          </button>

          {/* Google Sheets Access Help Button */}
          <button
            type="button"
            onClick={() => setIsSheetsHelpModalOpen(true)}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Открыть ссылки на Google Таблицы и помощь с доступом"
          >
            <HelpCircle className="w-4 h-4 text-sky-600" />
            <span className="hidden sm:inline">Доступ к таблице</span>
          </button>

          {/* Excel Export Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer hover:shadow-emerald-200"
            title="Выгрузить сводный отчет со всеми показателями в формате Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
            <span>Экспорт в Excel</span>
          </button>
        </div>
      </div>

      {/* 1. Highlight Banner / KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Highlighted Card: Released in Period */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-4.5 shadow-sm flex flex-col justify-between relative overflow-hidden border border-emerald-500">
          <div className="absolute right-[-10px] bottom-[-10px] opacity-15 pointer-events-none">
            <Sparkles className="w-24 h-24 text-white" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-100">
              Выведено за период
            </span>
            <div className="p-1.5 bg-white/20 rounded-lg text-white backdrop-blur-xs">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black tracking-tight text-white font-mono">
              {kpiStats.completedInPeriod.toLocaleString('ru-RU')}
            </div>
            <div className="text-[11px] text-emerald-100 font-semibold mt-1 flex items-center justify-between gap-1.5">
              <span>{activePeriodInfo.label}</span>
              <button
                type="button"
                onClick={() => setIsCompletedFilesModalOpen(true)}
                className="underline hover:text-white text-[11px] cursor-pointer bg-emerald-700/50 hover:bg-emerald-700 px-2 py-0.5 rounded-md transition-colors"
                title="Посмотреть список выведенных файлов"
              >
                Файлы ({kpiStats.filesInPeriodCount})
              </button>
            </div>
          </div>
        </div>

        {/* Completed SKU (All time) */}
        <div className="bg-white rounded-2xl p-4.5 border border-emerald-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Выполнено всего</span>
            <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-emerald-700 tracking-tight font-mono">
              {kpiStats.completed.toLocaleString('ru-RU')}
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-1">
              Карточек завершено
            </div>
          </div>
        </div>

        {/* In Work SKU */}
        <div className="bg-white rounded-2xl p-4.5 border border-blue-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-800">В работе</span>
            <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-blue-700 tracking-tight font-mono">
              {kpiStats.inWork.toLocaleString('ru-RU')}
            </div>
            <div className="text-[11px] text-blue-700 font-medium mt-1">
              Находятся у исполнителей
            </div>
          </div>
        </div>

        {/* On Pause SKU */}
        <div className="bg-white rounded-2xl p-4.5 border border-amber-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">На паузе</span>
            <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600">
              <PauseCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-amber-700 tracking-tight font-mono">
              {kpiStats.paused.toLocaleString('ru-RU')}
            </div>
            <div className="text-[11px] text-amber-700 font-medium mt-1">
              Приостановлено
            </div>
          </div>
        </div>

        {/* In Queue / New */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200 shadow-xs flex flex-col justify-between sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">В очереди / Новые</span>
            <div className="p-1.5 bg-slate-100 rounded-lg text-slate-600">
              <FolderTree className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-800 tracking-tight font-mono">
              {kpiStats.newQueue.toLocaleString('ru-RU')}
            </div>
            <div className="text-[11px] text-slate-600 font-medium mt-1">
              Ожидают взятия в работу
            </div>
          </div>
        </div>
      </div>

      {/* 2. Bar Chart: Performer Performance (Full Width, Single Combined Bar per Executor) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Производительность исполнителей (SKU)
            </h3>
            {selectedDept === 'all' && (
              <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                Суммировано по Контенту и КАМ
              </span>
            )}
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Топ сотрудников по количеству выполненных и активных карточек
          </span>
        </div>

        <div className="h-72 w-full pt-2">
          {topExecutorsChartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Нет данных об исполнителях в выбранном отделе
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topExecutorsChartData}
                margin={{ top: 10, right: 15, left: -10, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                  angle={-15}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(val: number | string | undefined, name: string | undefined) => [
                    `${Number(val || 0).toLocaleString('ru-RU')} SKU`,
                    name || '',
                  ]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    borderRadius: '8px',
                    fontSize: '12px',
                    border: 'none',
                  }}
                  itemStyle={{ color: '#ffffff' }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
                />
                <Bar dataKey="Выполнено" stackId="a" fill="#10b981" />
                <Bar dataKey="В работе" stackId="a" fill="#3b82f6" />
                <Bar dataKey="На паузе" stackId="a" fill="#f59e0b" />
                <Bar dataKey="В очереди" stackId="a" fill="#94a3b8" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 3. Detailed Assignee Table */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Таблица по исполнителям
              </h3>
              <p className="text-xs text-slate-500">
                Количество карточек по каждому сотруднику (выполнено, в работе, на паузе и в очереди)
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по исполнителю..."
              value={searchExecutor}
              onChange={e => setSearchExecutor(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 uppercase font-mono text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 min-w-[180px]">
                  <SortHeader
                    label="Исполнитель"
                    columnKey="executor"
                    currentSortKey={executorSort.key}
                    currentDirection={executorSort.direction}
                    onSort={handleExecutorSort}
                  />
                </th>
                <th className="px-4 py-3 min-w-[150px]">
                  <SortHeader
                    label="Отдел"
                    columnKey="department"
                    currentSortKey={executorSort.key}
                    currentDirection={executorSort.direction}
                    onSort={handleExecutorSort}
                  />
                </th>
                <th className="px-4 py-3 text-center min-w-[120px]">
                  <SortHeader
                    label="Выполнено"
                    columnKey="completedSku"
                    currentSortKey={executorSort.key}
                    currentDirection={executorSort.direction}
                    onSort={handleExecutorSort}
                    align="center"
                  />
                </th>
                <th className="px-4 py-3 text-center min-w-[120px]">
                  <SortHeader
                    label="В работе"
                    columnKey="inWorkSku"
                    currentSortKey={executorSort.key}
                    currentDirection={executorSort.direction}
                    onSort={handleExecutorSort}
                    align="center"
                  />
                </th>
                <th className="px-4 py-3 text-center min-w-[120px]">
                  <SortHeader
                    label="На паузе"
                    columnKey="pausedSku"
                    currentSortKey={executorSort.key}
                    currentDirection={executorSort.direction}
                    onSort={handleExecutorSort}
                    align="center"
                  />
                </th>
                <th className="px-4 py-3 text-center min-w-[120px]">
                  <SortHeader
                    label="В очереди"
                    columnKey="newSku"
                    currentSortKey={executorSort.key}
                    currentDirection={executorSort.direction}
                    onSort={handleExecutorSort}
                    align="center"
                  />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {sortedExecutors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Нет данных по исполнителям
                  </td>
                </tr>
              ) : (
                sortedExecutors.map((row, i) => {
                  return (
                    <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-2.5 font-bold text-slate-900">
                        {row.executor}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        <span className={`px-2.5 py-0.5 rounded-md font-semibold text-[11px] ${
                          row.department === 'Отдел контента'
                            ? 'bg-sky-50 text-sky-800 border border-sky-200'
                            : row.department === 'Коммерческий отдел'
                            ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          {row.department}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center font-bold font-mono text-emerald-600">
                        {row.completedSku.toLocaleString('ru-RU')}
                      </td>
                      <td className="px-4 py-2.5 text-center font-bold font-mono text-blue-600">
                        {row.inWorkSku.toLocaleString('ru-RU')}
                      </td>
                      <td className="px-4 py-2.5 text-center font-bold font-mono text-amber-600">
                        {row.pausedSku.toLocaleString('ru-RU')}
                      </td>
                      <td className="px-4 py-2.5 text-center font-bold font-mono text-slate-500">
                        {row.newSku.toLocaleString('ru-RU')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Pause Reasons Analysis Section */}
      <div className="bg-white rounded-2xl p-5 border border-amber-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-amber-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <PauseCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Анализ причин пауз
              </h3>
              <p className="text-xs text-slate-500">
                Перечень причин приостановки карточек с распределением по файлам и исполнителям
              </p>
            </div>
          </div>

          <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 font-mono">
            Всего на паузе: {kpiStats.paused} SKU
          </span>
        </div>

        {pauseReasonStats.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl text-xs">
            🎉 В настоящий момент нет товаров, находящихся на паузе.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pauseReasonStats.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-amber-300 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-snug">
                      {item.reason}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                      Затронуто файлов: {item.affectedFiles.length} • Исполнителей: {item.affectedExecutors.length || 1}
                    </p>
                  </div>
                  <span className="text-xs font-black text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md shrink-0 font-mono">
                    {item.count} SKU
                  </span>
                </div>

                {item.affectedExecutors.length > 0 && (
                  <div className="text-[11px] text-slate-500 truncate">
                    <span className="font-semibold">Ответственные:</span> {item.affectedExecutors.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Monthly Added SKU Dynamics (График добавления SKU по всем месяцам) */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
        {/* Header with Title and Mode Switcher */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between pb-4 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-violet-500 to-indigo-600 text-white rounded-xl shadow-xs">
              <CalendarRange className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Динамика добавления SKU по месяцам
                </h3>
                <span className="text-[11px] font-bold text-violet-700 bg-violet-50 px-2.5 py-0.5 rounded-full border border-violet-200">
                  Все месяцы ({monthlySkuDynamics.length})
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Помесячный объем поступления карточек в работу с разбивкой по отделам и сравнением с выводом
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Controls */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setMonthlyChartMode('stacked')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  monthlyChartMode === 'stacked'
                    ? 'bg-white text-violet-900 shadow-xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Показать вклад Контента и КАМ в виде составных столбцов"
              >
                <Layers className="w-3.5 h-3.5 text-violet-600" />
                <span>По отделам</span>
              </button>
              <button
                type="button"
                onClick={() => setMonthlyChartMode('compare')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  monthlyChartMode === 'compare'
                    ? 'bg-white text-emerald-900 shadow-xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Сравнить количество добавленных SKU с выведенными в каждом месяце"
              >
                <BarChart2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Добавлено vs Выведено</span>
              </button>
              <button
                type="button"
                onClick={() => setMonthlyChartMode('trend')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  monthlyChartMode === 'trend'
                    ? 'bg-white text-sky-900 shadow-xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Показать динамику добавления в виде сплошной кривой с заливкой"
              >
                <LineChartIcon className="w-3.5 h-3.5 text-sky-600" />
                <span>Тренд</span>
              </button>
            </div>

            {/* Toggle Table Button */}
            <button
              type="button"
              onClick={() => setShowMonthlyTable(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                showMonthlyTable
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title="Показать / скрыть подробную таблицу с цифрами по каждому месяцу"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>{showMonthlyTable ? 'Скрыть таблицу' : 'Таблица'}</span>
            </button>
          </div>
        </div>

        {/* Summary Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            onClick={() => {
              setAddedProductsModalMonth('all');
              setIsAddedProductsModalOpen(true);
            }}
            className="p-3.5 rounded-xl bg-violet-50/70 hover:bg-violet-100/70 border border-violet-200 flex flex-col justify-between cursor-pointer transition-all group"
            title="Нажмите, чтобы открыть подробный список всех добавленных товаров"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-violet-700">
                Всего добавлено
              </span>
              <span className="text-[10px] font-bold text-violet-600 underline group-hover:text-violet-800">
                Смотреть список →
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-black text-violet-950 font-mono">
                {monthlySummary.totalAdded.toLocaleString('ru-RU')}
              </span>
              <span className="text-[11px] font-semibold text-violet-600">SKU</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-100 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
              Среднее в месяц
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-black text-sky-950 font-mono">
                {monthlySummary.avgMonthly.toLocaleString('ru-RU')}
              </span>
              <span className="text-[11px] font-semibold text-sky-600">SKU / мес</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-100 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Пиковый месяц
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-black text-amber-950 truncate max-w-[120px]" title={monthlySummary.peakMonth?.monthFullLabel}>
                {monthlySummary.peakMonth?.monthLabel || '—'}
              </span>
              <span className="text-xs font-black text-amber-700 font-mono">
                {monthlySummary.peakMonth?.deptAdded.toLocaleString('ru-RU')} SKU
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Всего выведено
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-black text-emerald-950 font-mono">
                {monthlySummary.totalCompleted.toLocaleString('ru-RU')}
              </span>
              <span className="text-[11px] font-semibold text-emerald-600">
                {monthlySummary.totalAdded > 0
                  ? `${((monthlySummary.totalCompleted / monthlySummary.totalAdded) * 100).toFixed(0)}%`
                  : '0%'}
              </span>
            </div>
          </div>
        </div>

        {/* Recharts Chart Area */}
        <div className="h-80 w-full pt-2">
          {monthlySkuDynamics.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Нет данных по датам добавления товаров
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {monthlyChartMode === 'stacked' ? (
                <BarChart
                  data={monthlySkuDynamics}
                  margin={{ top: 15, right: 15, left: -5, bottom: 15 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="monthLabel"
                    tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(val: number | string | undefined, name: string | undefined) => [
                      `${Number(val || 0).toLocaleString('ru-RU')} SKU`,
                      name || '',
                    ]}
                    labelFormatter={label => {
                      const item = monthlySkuDynamics.find(m => m.monthLabel === label);
                      return item ? `📅 ${item.monthFullLabel}` : label;
                    }}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      color: '#ffffff',
                      borderRadius: '10px',
                      fontSize: '12px',
                      border: 'none',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                    }}
                    itemStyle={{ color: '#ffffff' }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 600 }}
                  />
                  {selectedDept === 'all' ? (
                    <>
                      <Bar
                        dataKey="Контент (добавлено)"
                        stackId="added"
                        fill="#0284c7"
                        name="🎨 Отдел контента"
                      />
                      <Bar
                        dataKey="КАМ (добавлено)"
                        stackId="added"
                        fill="#6366f1"
                        name="💼 Коммерческий отдел"
                        radius={[4, 4, 0, 0]}
                      />
                    </>
                  ) : (
                    <Bar
                      dataKey="Всего добавлено"
                      fill={selectedDept === 'Отдел контента' ? '#0284c7' : '#6366f1'}
                      name={`📥 Добавлено (${selectedDept === 'Отдел контента' ? 'Контент' : 'КАМ'})`}
                      radius={[4, 4, 0, 0]}
                    />
                  )}
                </BarChart>
              ) : monthlyChartMode === 'compare' ? (
                <BarChart
                  data={monthlySkuDynamics}
                  margin={{ top: 15, right: 15, left: -5, bottom: 15 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="monthLabel"
                    tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(val: number | string | undefined, name: string | undefined) => [
                      `${Number(val || 0).toLocaleString('ru-RU')} SKU`,
                      name || '',
                    ]}
                    labelFormatter={label => {
                      const item = monthlySkuDynamics.find(m => m.monthLabel === label);
                      return item ? `📅 ${item.monthFullLabel}` : label;
                    }}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      color: '#ffffff',
                      borderRadius: '10px',
                      fontSize: '12px',
                      border: 'none',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                    }}
                    itemStyle={{ color: '#ffffff' }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 600 }}
                  />
                  <Bar
                    dataKey="Всего добавлено"
                    fill="#6366f1"
                    name="📥 Поступило / Добавлено"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="Выведено"
                    fill="#10b981"
                    name="✅ Выведено / Завершено"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              ) : (
                <AreaChart
                  data={monthlySkuDynamics}
                  margin={{ top: 15, right: 15, left: -5, bottom: 15 }}
                >
                  <defs>
                    <linearGradient id="colorTotalAdded" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="monthLabel"
                    tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(val: number | string | undefined, name: string | undefined) => [
                      `${Number(val || 0).toLocaleString('ru-RU')} SKU`,
                      name || '',
                    ]}
                    labelFormatter={label => {
                      const item = monthlySkuDynamics.find(m => m.monthLabel === label);
                      return item ? `📅 ${item.monthFullLabel}` : label;
                    }}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      color: '#ffffff',
                      borderRadius: '10px',
                      fontSize: '12px',
                      border: 'none',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                    }}
                    itemStyle={{ color: '#ffffff' }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 600 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Всего добавлено"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorTotalAdded)"
                    name="📥 Добавлено SKU"
                  />
                  <Area
                    type="monotone"
                    dataKey="Выведено"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#colorCompleted)"
                    name="✅ Выведено SKU"
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {/* Collapsible Detailed Monthly Table */}
        {showMonthlyTable && (
          <div className="pt-3 border-t border-slate-100 animate-fadeIn">
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Детальная таблица по месяцам
              </h4>
              <span className="text-[11px] text-slate-500 font-mono">
                Динамика MoM (месяц к месяцу)
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 text-slate-600 uppercase font-mono text-[11px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-2.5">Месяц</th>
                    <th className="px-3.5 py-2.5 text-right">Контент</th>
                    <th className="px-3.5 py-2.5 text-right">КАМ</th>
                    <th className="px-3.5 py-2.5 text-right font-bold text-slate-900">Всего добавлено</th>
                    <th className="px-3.5 py-2.5 text-right font-bold text-emerald-700">Выведено</th>
                    <th className="px-3.5 py-2.5 text-right">Файлов</th>
                    <th className="px-3.5 py-2.5 text-right">Динамика (MoM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {monthlySkuDynamics.map((row, idx) => {
                    const isPositive = row.momGrowthSku > 0;
                    const isNegative = row.momGrowthSku < 0;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3.5 py-2 font-bold text-slate-800">
                          {row.monthFullLabel}
                        </td>
                        <td className="px-3.5 py-2 text-right font-mono text-sky-700 font-semibold">
                          {row.contentAdded.toLocaleString('ru-RU')}
                        </td>
                        <td className="px-3.5 py-2 text-right font-mono text-indigo-700 font-semibold">
                          {row.kamAdded.toLocaleString('ru-RU')}
                        </td>
                        <td className="px-3.5 py-2 text-right font-mono font-bold text-slate-900">
                          {row.totalAdded.toLocaleString('ru-RU')}
                        </td>
                        <td className="px-3.5 py-2 text-right font-mono font-bold text-emerald-600">
                          {row.completed.toLocaleString('ru-RU')}
                        </td>
                        <td className="px-3.5 py-2 text-right font-mono text-slate-500">
                          {row.filesCount}
                        </td>
                        <td className="px-3.5 py-2 text-right font-mono text-[11px]">
                          {idx === 0 ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <span className={`inline-flex items-center gap-0.5 font-bold ${
                              isPositive ? 'text-emerald-600' : isNegative ? 'text-rose-600' : 'text-slate-500'
                            }`}>
                              {isPositive && <ArrowUpRight className="w-3 h-3" />}
                              {isNegative && <ArrowDownRight className="w-3 h-3" />}
                              {isPositive ? `+${row.momGrowthSku}` : row.momGrowthSku}
                              {row.momGrowthPct !== null && ` (${row.momGrowthPct > 0 ? '+' : ''}${row.momGrowthPct}%)`}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 5. NEW: Groups Monthly Dynamics & Linear Trend Card */}
      <GroupsMonthlyTrendCard groups={categoryGroups} />

      {/* Modal 1: Details of Completed Files for Selected Period */}
      <Modal
        isOpen={isCompletedFilesModalOpen}
        onClose={() => setIsCompletedFilesModalOpen(false)}
        title={`📋 Выведенные файлы за ${activePeriodInfo.label}`}
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-600">
              Всего файлов: <strong className="text-slate-900">{completedFilesInPeriod.length}</strong> • Всего SKU:{' '}
              <strong className="text-emerald-700 font-mono">{kpiStats.completedInPeriod.toLocaleString('ru-RU')}</strong>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск по файлу / группе..."
                value={completedFileSearch}
                onChange={e => setCompletedFileSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50"
              />
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
            {filteredModalFiles.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                В выбранном периоде ({activePeriodInfo.label}) нет завершенных файлов или ничего не найдено
              </div>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-2.5">Файл</th>
                    <th className="px-3.5 py-2.5">Группа</th>
                    <th className="px-3.5 py-2.5">Исполнитель</th>
                    <th className="px-3.5 py-2.5">Дата завершения</th>
                    <th className="px-3.5 py-2.5 text-right">SKU</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredModalFiles.map((f, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="px-3.5 py-2 font-bold text-slate-800 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[220px]" title={f.fileName}>
                          {f.fileName}
                        </span>
                      </td>
                      <td className="px-3.5 py-2 text-slate-600">{f.group3}</td>
                      <td className="px-3.5 py-2 font-semibold text-slate-700">{f.executor}</td>
                      <td className="px-3.5 py-2 text-slate-500 font-mono">{f.completionDate}</td>
                      <td className="px-3.5 py-2 text-right font-bold font-mono text-emerald-700">
                        {f.skuCount.toLocaleString('ru-RU')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setIsCompletedFilesModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal 2: Google Sheets Access & Diagnostic Helper */}
      <Modal
        isOpen={isSheetsHelpModalOpen}
        onClose={() => setIsSheetsHelpModalOpen(false)}
        title="🔐 Ссылки и доступ к Google Таблицам"
      >
        <div className="space-y-5 text-xs">
          {/* Quick Links Section */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Прямые ссылки на таблицы:
            </h4>
            <div className="grid grid-cols-1 gap-2.5">
              {/* Content Sheet */}
              <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-sky-950">Лист «📥 Загруженные данные контента»</div>
                  <div className="text-[11px] text-sky-700 font-mono truncate max-w-[320px]">
                    {SPREADSHEET_URL}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(SPREADSHEET_URL, 'Отдел контента')}
                    className="p-2 bg-white hover:bg-sky-100 text-sky-800 rounded-lg border border-sky-200 transition-colors"
                    title="Скопировать ссылку"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={SPREADSHEET_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold flex items-center gap-1 shadow-2xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Открыть</span>
                  </a>
                </div>
              </div>

              {/* KAM Sheet */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-indigo-950">Лист «📥 Загруженные данные КАМ»</div>
                  <div className="text-[11px] text-indigo-700 font-mono truncate max-w-[320px]">
                    {KAM_SPREADSHEET_URL}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(KAM_SPREADSHEET_URL, 'КАМ')}
                    className="p-2 bg-white hover:bg-indigo-100 text-indigo-800 rounded-lg border border-indigo-200 transition-colors"
                    title="Скопировать ссылку"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={KAM_SPREADSHEET_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-1 shadow-2xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Открыть</span>
                  </a>
                </div>
              </div>

              {/* Tasks Sheet */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-amber-950">Таблица операционных Задач</div>
                  <div className="text-[11px] text-amber-700 font-mono truncate max-w-[320px]">
                    {TASKS_SPREADSHEET_URL}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(TASKS_SPREADSHEET_URL, 'Задачи')}
                    className="p-2 bg-white hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-200 transition-colors"
                    title="Скопировать ссылку"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={TASKS_SPREADSHEET_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold flex items-center gap-1 shadow-2xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Открыть</span>
                  </a>
                </div>
              </div>

              {/* Groups Output Sheet */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-emerald-950">Таблица Вывода групп (GID 0)</div>
                  <div className="text-[11px] text-emerald-700 font-mono truncate max-w-[320px]">
                    {GROUPS_SPREADSHEET_URL}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(GROUPS_SPREADSHEET_URL, 'Вывод групп')}
                    className="p-2 bg-white hover:bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-200 transition-colors"
                    title="Скопировать ссылку"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={GROUPS_SPREADSHEET_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1 shadow-2xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Открыть</span>
                  </a>
                </div>
              </div>

              {/* Site Order Sheet */}
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-purple-950">Таблица Порядок на сайте (GID 442661295)</div>
                  <div className="text-[11px] text-purple-700 font-mono truncate max-w-[320px]">
                    {SITE_ORDER_SPREADSHEET_URL}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(SITE_ORDER_SPREADSHEET_URL, 'Порядок на сайте')}
                    className="p-2 bg-white hover:bg-purple-100 text-purple-800 rounded-lg border border-purple-200 transition-colors"
                    title="Скопировать ссылку"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={SITE_ORDER_SPREADSHEET_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold flex items-center gap-1 shadow-2xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Открыть</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Diagnostic & Reasons why user cannot open sheet */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Почему не получается зайти в таблицу и как это исправить:</span>
            </div>

            <ul className="space-y-2 text-slate-600 list-disc pl-4 leading-relaxed">
              <li>
                <strong className="text-slate-800">1. Права доступа в Google Drive:</strong> Таблица доступна только разрешенным Google-аккаунтам. Если при открытии появляется сообщение <em>«Запросите доступ»</em>, вам нужно отправить запрос владельцу таблицы с рабочей почты.
              </li>
              <li>
                <strong className="text-slate-800">2. Вход под другим Google-аккаунтом:</strong> Если в браузере выполнен вход под личной почтой, Google пытается открыть файл через неё. Переключитесь в Google на рабочий аккаунт или откройте ссылку в режиме <em>Инкогнито</em>.
              </li>
              <li>
                <strong className="text-slate-800">3. Блокировщик всплывающих окон (Pop-up Blocker):</strong> Встроенный фрейм приложения может блокировать открытие новой вкладки. Используйте кнопку <strong>«Скопировать ссылку»</strong> выше и вставьте её напрямую в адресную строку браузера.
              </li>
            </ul>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setIsSheetsHelpModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Понятно, закрыть
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal 3: Added Products List with Monthly Selector */}
      <AddedProductsModal
        isOpen={isAddedProductsModalOpen}
        onClose={() => setIsAddedProductsModalOpen(false)}
        initialMonth={addedProductsModalMonth}
        initialDept={selectedDept}
      />
    </div>
  );
};
