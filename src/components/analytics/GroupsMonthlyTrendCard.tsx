import React, { useState, useMemo } from 'react';
import { CategoryGroup } from '../../types';
import { MANAGERS_LIST, GROUPS_SPREADSHEET_URL } from '../../constants';
import { Modal } from '../common/Modal';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Search,
  CheckCircle2,
  Users,
  LineChart as LineChartIcon,
  Table as TableIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface GroupsMonthlyTrendCardProps {
  groups: CategoryGroup[];
}

export interface MonthlyGroupDynamicsPoint {
  monthKey: string;
  monthLabel: string;
  monthFullLabel: string;
  year: number;
  month: number;
  releasedCount: number;
  skuTotal: number;
  cumulativeCount: number;
  cumulativeSku: number;
  trendValue: number;
  movingAverage: number;
  momGrowth: number;
  momGrowthPct: number | null;
  groupsList: CategoryGroup[];
  managerCounts: Record<string, number>;
  // Recharts field helpers
  'Выведено групп': number;
  'Линия тренда': number;
  'Скользящее среднее (3 мес)': number;
  'Накопительно групп': number;
  [key: string]: any;
}

function parseDateParts(dateStr?: string): { day: number; month: number; year: number } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const s = dateStr.trim();
  if (!s) return null;

  const dotMatch = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dotMatch) {
    return {
      day: parseInt(dotMatch[1], 10),
      month: parseInt(dotMatch[2], 10),
      year: parseInt(dotMatch[3], 10),
    };
  }

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

const MANAGER_COLORS: string[] = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899',
  '#8b5cf6', '#14b8a6', '#f97316', '#3b82f6', '#84cc16',
  '#a855f7', '#06b6d4', '#e11d48', '#64748b'
];

export const GroupsMonthlyTrendCard: React.FC<GroupsMonthlyTrendCardProps> = ({ groups }) => {
  const [selectedManager, setSelectedManager] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [chartMode, setChartMode] = useState<'composed' | 'bars' | 'cumulative' | 'managers'>('composed');
  const [showTable, setShowTable] = useState(false);

  // Modal to inspect groups of a specific month
  const [selectedMonthModal, setSelectedMonthModal] = useState<MonthlyGroupDynamicsPoint | null>(null);
  const [modalSearch, setModalSearch] = useState('');

  // Extract distinct managers from groups
  const managerList = useMemo(() => {
    const set = new Set<string>();
    groups.forEach(g => {
      if (g.manager && g.manager.trim() && g.manager.trim() !== '—') {
        set.add(g.manager.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [groups]);

  // Extract available years
  const availableYears = useMemo(() => {
    const set = new Set<number>();
    groups.forEach(g => {
      const d = parseDateParts(g.releaseDate);
      if (d && d.year >= 2020) {
        set.add(d.year);
      }
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [groups]);

  // Filter groups
  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      if (selectedManager !== 'all' && (g.manager || '').toLowerCase() !== selectedManager.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [groups, selectedManager]);

  // Compute monthly dynamics & linear regression trendline
  const { dynamicsData, summary } = useMemo(() => {
    const monthMap = new Map<string, {
      year: number;
      month: number;
      count: number;
      sku: number;
      groupsList: CategoryGroup[];
      managerCounts: Record<string, number>;
    }>();

    filteredGroups.forEach(g => {
      const isReleased = (g.kamFile || '').toLowerCase().includes('добавлен') || (g.releaseDate && g.releaseDate.trim());
      if (!isReleased || !g.releaseDate || !g.releaseDate.trim()) return;

      const d = parseDateParts(g.releaseDate);
      if (!d || d.year < 2020) return;

      if (selectedYear !== 'all' && String(d.year) !== selectedYear) {
        return;
      }

      const key = `${d.year}-${String(d.month).padStart(2, '0')}`;
      if (!monthMap.has(key)) {
        monthMap.set(key, {
          year: d.year,
          month: d.month,
          count: 0,
          sku: 0,
          groupsList: [],
          managerCounts: {},
        });
      }

      const entry = monthMap.get(key)!;
      entry.count++;
      entry.sku += parseInt(g.skuCount, 10) || 0;
      entry.groupsList.push(g);

      const mgr = (g.manager || 'Не указан').trim();
      entry.managerCounts[mgr] = (entry.managerCounts[mgr] || 0) + 1;
    });

    const sortedKeys = Array.from(monthMap.keys()).sort();
    const n = sortedKeys.length;

    // Linear regression: y = m*x + c
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    sortedKeys.forEach((k, i) => {
      const y = monthMap.get(k)!.count;
      sumX += i;
      sumY += y;
      sumXY += i * y;
      sumX2 += i * i;
    });

    const denominator = n * sumX2 - sumX * sumX;
    const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
    const intercept = n > 0 ? (sumY - slope * sumX) / n : 0;

    let cumulativeCount = 0;
    let cumulativeSku = 0;
    let prevCount = 0;

    const points: MonthlyGroupDynamicsPoint[] = sortedKeys.map((key, index) => {
      const entry = monthMap.get(key)!;
      cumulativeCount += entry.count;
      cumulativeSku += entry.sku;

      const shortLabel = `${SHORT_MONTH_NAMES_RU[entry.month] || entry.month} '${String(entry.year).slice(2)}`;
      const fullLabel = `${MONTH_NAMES_RU[entry.month] || entry.month} ${entry.year}`;

      // Linear regression trend
      const trendValue = Math.max(0, Math.round((slope * index + intercept) * 10) / 10);

      // 3-Month Moving Average
      let windowSum = 0;
      let windowCount = 0;
      for (let w = Math.max(0, index - 2); w <= index; w++) {
        windowSum += monthMap.get(sortedKeys[w])!.count;
        windowCount++;
      }
      const movingAverage = windowCount > 0 ? Math.round((windowSum / windowCount) * 10) / 10 : entry.count;

      // MoM growth
      const momDiff = index === 0 ? 0 : entry.count - prevCount;
      const momPct = index === 0 || prevCount === 0 ? null : Number(((momDiff / prevCount) * 100).toFixed(1));
      prevCount = entry.count;

      const point: MonthlyGroupDynamicsPoint = {
        monthKey: key,
        monthLabel: shortLabel,
        monthFullLabel: fullLabel,
        year: entry.year,
        month: entry.month,
        releasedCount: entry.count,
        skuTotal: entry.sku,
        cumulativeCount,
        cumulativeSku,
        trendValue,
        movingAverage,
        momGrowth: momDiff,
        momGrowthPct: momPct,
        groupsList: entry.groupsList,
        managerCounts: entry.managerCounts,
        'Выведено групп': entry.count,
        'Линия тренда': trendValue,
        'Скользящее среднее (3 мес)': movingAverage,
        'Накопительно групп': cumulativeCount,
      };

      // Add manager-specific counts for stacked charts
      managerList.forEach(m => {
        point[m] = entry.managerCounts[m] || 0;
      });

      return point;
    });

    // Summary calculations
    const totalGroups = points.reduce((acc, p) => acc + p.releasedCount, 0);
    const totalSku = points.reduce((acc, p) => acc + p.skuTotal, 0);
    const avgMonthly = points.length > 0 ? Math.round((totalGroups / points.length) * 10) / 10 : 0;

    let peakPoint = points[0] || null;
    points.forEach(p => {
      if (!peakPoint || p.releasedCount > peakPoint.releasedCount) {
        peakPoint = p;
      }
    });

    const isTrendPositive = slope > 0.05;
    const isTrendNegative = slope < -0.05;

    return {
      dynamicsData: points,
      summary: {
        totalGroups,
        totalSku,
        avgMonthly,
        peakPoint,
        slope,
        isTrendPositive,
        isTrendNegative,
      },
    };
  }, [filteredGroups, selectedYear, managerList]);

  const filteredModalGroups = useMemo(() => {
    if (!selectedMonthModal) return [];
    if (!modalSearch.trim()) return selectedMonthModal.groupsList;
    const q = modalSearch.toLowerCase();
    return selectedMonthModal.groupsList.filter(g =>
      (g.group3 || '').toLowerCase().includes(q) ||
      (g.group2 || '').toLowerCase().includes(q) ||
      (g.group1 || '').toLowerCase().includes(q) ||
      (g.manager || '').toLowerCase().includes(q)
    );
  }, [selectedMonthModal, modalSearch]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Динамика вывода групп по месяцам и тренд
                <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {summary.totalGroups} групп
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Количество выведенных товарных групп по дате вывода на Материк с линией тренда (метод наименьших квадратов)
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-stretch lg:self-auto">
          {/* Year Filter */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <span className="text-2xs font-bold text-slate-500 px-1.5 uppercase">Год:</span>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Все годы</option>
              {availableYears.map(y => (
                <option key={y} value={String(y)}>
                  {y} год
                </option>
              ))}
            </select>
          </div>

          {/* Manager Filter */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <span className="text-2xs font-bold text-slate-500 px-1.5 uppercase">Менеджер:</span>
            <select
              value={selectedManager}
              onChange={e => setSelectedManager(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Все ({managerList.length})</option>
              {managerList.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Chart Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setChartMode('composed')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
                chartMode === 'composed'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Диаграмма с линией тренда"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Тренд</span>
            </button>

            <button
              type="button"
              onClick={() => setChartMode('bars')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
                chartMode === 'bars'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Столбчатая диаграмма"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Столбцы</span>
            </button>

            <button
              type="button"
              onClick={() => setChartMode('cumulative')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
                chartMode === 'cumulative'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Накопительный итог (Кумулятивно)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Накопительно</span>
            </button>

            <button
              type="button"
              onClick={() => setChartMode('managers')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
                chartMode === 'managers'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Вклад менеджеров"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Менеджеры</span>
            </button>
          </div>

          {/* Direct Link to Groups Spreadsheet */}
          <a
            href={GROUPS_SPREADSHEET_URL}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-lg border border-slate-200 transition-colors"
            title="Открыть таблицу Вывод групп в Google Таблицах"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
            Всего выведено групп
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-indigo-950 font-mono">
              {summary.totalGroups}
            </span>
            <span className="text-[11px] font-semibold text-indigo-600">
              {summary.totalSku > 0 ? `${summary.totalSku.toLocaleString('ru-RU')} SKU` : 'категорий'}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-100 flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
            Средний темп вывода
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-sky-950 font-mono">
              {summary.avgMonthly}
            </span>
            <span className="text-[11px] font-semibold text-sky-600">групп / мес</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-100 flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
            Пиковый месяц
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-sm font-black text-amber-950 truncate max-w-[110px]" title={summary.peakPoint?.monthFullLabel}>
              {summary.peakPoint?.monthLabel || '—'}
            </span>
            <span className="text-xs font-black text-amber-800 font-mono">
              {summary.peakPoint?.releasedCount || 0} групп
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            Динамика тренда
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className={`text-sm font-black flex items-center gap-1 ${
              summary.isTrendPositive ? 'text-emerald-700' : summary.isTrendNegative ? 'text-rose-700' : 'text-slate-700'
            }`}>
              {summary.isTrendPositive && <ArrowUpRight className="w-4 h-4" />}
              {summary.isTrendNegative && <ArrowDownRight className="w-4 h-4" />}
              {summary.isTrendPositive ? 'Растущий темп' : summary.isTrendNegative ? 'Снижение темпа' : 'Стабильный темп'}
            </span>
            <span className="text-2xs font-bold text-slate-500 font-mono">
              k = {summary.slope.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="h-80 w-full pt-2">
        {dynamicsData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
            Нет данных по выведенным группам в выбранном диапазоне
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartMode === 'composed' ? (
              /* Composed Chart: Bar + Linear Trend Line + Moving Average */
              <ComposedChart
                data={dynamicsData}
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
                  formatter={(val: any, name: string | undefined) => [
                    `${Number(val || 0)} групп`,
                    name || '',
                  ]}
                  labelFormatter={label => {
                    const item = dynamicsData.find(m => m.monthLabel === label);
                    return item ? `📅 ${item.monthFullLabel} (Всего: ${item.releasedCount} групп, ${item.skuTotal} SKU)` : label;
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
                  dataKey="Выведено групп"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                  name="📊 Выведено групп"
                />
                <Line
                  type="monotone"
                  dataKey="Линия тренда"
                  stroke="#ec4899"
                  strokeWidth={2.5}
                  dot={false}
                  name="📈 Линия тренда (МНК)"
                />
                <Line
                  type="monotone"
                  dataKey="Скользящее среднее (3 мес)"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#0ea5e9' }}
                  name="🌊 Скользящее среднее"
                />
              </ComposedChart>
            ) : chartMode === 'bars' ? (
              /* Bar Chart Only */
              <BarChart
                data={dynamicsData}
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
                  formatter={(val: any) => [`${Number(val || 0)} групп`, 'Выведено']}
                  labelFormatter={label => {
                    const item = dynamicsData.find(m => m.monthLabel === label);
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
                  dataKey="Выведено групп"
                  fill="#6366f1"
                  radius={[5, 5, 0, 0]}
                  name="📊 Количество выведенных групп"
                />
              </BarChart>
            ) : chartMode === 'cumulative' ? (
              /* Cumulative Total Area Chart */
              <AreaChart
                data={dynamicsData}
                margin={{ top: 15, right: 15, left: -5, bottom: 15 }}
              >
                <defs>
                  <linearGradient id="colorCumulativeGroups" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
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
                  formatter={(val: any) => [`${Number(val || 0)} групп`, 'Накопительно']}
                  labelFormatter={label => {
                    const item = dynamicsData.find(m => m.monthLabel === label);
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
                  dataKey="Накопительно групп"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorCumulativeGroups)"
                  name="📈 Накопительный итог выведенных групп"
                />
              </AreaChart>
            ) : (
              /* Stacked Bar by Manager */
              <BarChart
                data={dynamicsData}
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
                {managerList.map((m, idx) => (
                  <Bar
                    key={m}
                    dataKey={m}
                    stackId="mgr"
                    fill={MANAGER_COLORS[idx % MANAGER_COLORS.length]}
                    name={`👤 ${m}`}
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Collapsible Detailed Monthly Table Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-indigo-600" />
            <span>Детальная таблица вывода групп по месяцам ({dynamicsData.length} периодов)</span>
          </div>
          <div className="flex items-center gap-1 text-slate-500">
            <span>{showTable ? 'Скрыть таблицу' : 'Показать таблицу'}</span>
            {showTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showTable && (
          <div className="mt-3 overflow-x-auto border border-slate-200 rounded-xl animate-fadeIn">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 text-slate-600 uppercase font-mono text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2.5">Месяц</th>
                  <th className="px-3.5 py-2.5 text-center font-bold text-indigo-900">Выведено групп</th>
                  <th className="px-3.5 py-2.5 text-right font-mono">Общее кол-во SKU</th>
                  <th className="px-3.5 py-2.5 text-right font-mono">Накопительно</th>
                  <th className="px-3.5 py-2.5 text-right font-mono">Тренд (МНК)</th>
                  <th className="px-3.5 py-2.5 text-right">Динамика MoM</th>
                  <th className="px-3.5 py-2.5 text-right">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {dynamicsData.map((row, idx) => {
                  const isPositive = row.momGrowth > 0;
                  const isNegative = row.momGrowth < 0;

                  return (
                    <tr key={row.monthKey} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="px-3.5 py-2 font-bold text-slate-800 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{row.monthFullLabel}</span>
                      </td>
                      <td className="px-3.5 py-2 text-center font-bold text-indigo-700 font-mono text-sm bg-indigo-50/30">
                        {row.releasedCount}
                      </td>
                      <td className="px-3.5 py-2 text-right font-mono text-slate-700">
                        {row.skuTotal > 0 ? row.skuTotal.toLocaleString('ru-RU') : '—'}
                      </td>
                      <td className="px-3.5 py-2 text-right font-mono font-bold text-slate-900">
                        {row.cumulativeCount}
                      </td>
                      <td className="px-3.5 py-2 text-right font-mono text-pink-600 font-semibold">
                        {row.trendValue}
                      </td>
                      <td className="px-3.5 py-2 text-right font-mono text-[11px]">
                        {idx === 0 ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-0.5 font-bold ${
                              isPositive ? 'text-emerald-600' : isNegative ? 'text-rose-600' : 'text-slate-500'
                            }`}
                          >
                            {isPositive && <ArrowUpRight className="w-3 h-3" />}
                            {isNegative && <ArrowDownRight className="w-3 h-3" />}
                            {isPositive ? `+${row.momGrowth}` : row.momGrowth}
                            {row.momGrowthPct !== null && ` (${row.momGrowthPct > 0 ? '+' : ''}${row.momGrowthPct}%)`}
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMonthModal(row);
                            setModalSearch('');
                          }}
                          className="px-2.5 py-1 text-2xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200 transition-colors cursor-pointer"
                        >
                          Список групп ({row.releasedCount})
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Group Details for Selected Month */}
      {selectedMonthModal && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedMonthModal(null)}
          title={`📋 Выведенные группы за ${selectedMonthModal.monthFullLabel}`}
          maxWidth="4xl"
        >
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-700">
                Всего выведено групп: <strong className="text-indigo-900">{selectedMonthModal.releasedCount}</strong> • SKU:{' '}
                <strong className="text-emerald-700 font-mono">
                  {selectedMonthModal.skuTotal > 0 ? selectedMonthModal.skuTotal.toLocaleString('ru-RU') : '—'}
                </strong>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Поиск по группе / разделу..."
                  value={modalSearch}
                  onChange={e => setModalSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-2.5">Группа 3 (Категория)</th>
                    <th className="px-3.5 py-2.5">Группа 1 / Группа 2</th>
                    <th className="px-3.5 py-2.5">Менеджер</th>
                    <th className="px-3.5 py-2.5 text-right">SKU</th>
                    <th className="px-3.5 py-2.5">Дата вывода</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredModalGroups.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">
                        Группы не найдены
                      </td>
                    </tr>
                  ) : (
                    filteredModalGroups.map((g, idx) => (
                      <tr key={g.id || idx} className="hover:bg-slate-50">
                        <td className="px-3.5 py-2 font-bold text-slate-900">{g.group3}</td>
                        <td className="px-3.5 py-2 text-slate-600">
                          {g.group1} <span className="text-slate-300">/</span> {g.group2}
                        </td>
                        <td className="px-3.5 py-2 font-semibold text-indigo-700">{g.manager || '—'}</td>
                        <td className="px-3.5 py-2 text-right font-mono font-bold text-emerald-700">
                          {g.skuCount || '—'}
                        </td>
                        <td className="px-3.5 py-2 font-mono text-slate-500">{g.releaseDate || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedMonthModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
