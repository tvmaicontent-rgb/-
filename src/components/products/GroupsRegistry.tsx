import React, { useState } from 'react';
import { FileGroupSummary, DepartmentType } from '../../types';
import { SortHeader } from '../common/SortHeader';
import { SortConfig, sortData } from '../../utils/sortUtils';
import { Search, FolderCheck, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';

interface GroupsRegistryProps {
  department: DepartmentType;
  summaries: FileGroupSummary[];
}

const ITEMS_PER_PAGE = 25;

export const GroupsRegistry: React.FC<GroupsRegistryProps> = ({
  department,
  summaries,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'new' | 'paused' | 'inWork'>('new');
  const [showCompleted, setShowCompleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [sortConfig, setSortConfig] = useState<SortConfig<FileGroupSummary>>({
    key: '',
    direction: null,
  });
  const [completedSortConfig, setCompletedSortConfig] = useState<SortConfig<FileGroupSummary>>({
    key: '',
    direction: null,
  });

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key: '', direction: null };
        return { key, direction: 'asc' };
      }
      return { key, direction: 'asc' };
    });
    setCurrentPage(1);
  };

  const handleCompletedSort = (key: string) => {
    setCompletedSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key: '', direction: null };
        return { key, direction: 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const newFiles = summaries.filter(s => s.groupStatus === '🆕 Новый');
  const pausedFiles = summaries.filter(s => s.groupStatus === '⏸️ На паузе');
  const inWorkFiles = summaries.filter(s => s.groupStatus === '🔄 В работе');
  const completedFiles = summaries.filter(s => s.groupStatus === '✅ Выполнен');

  const filterList = (list: FileGroupSummary[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      item =>
        item.fileName.toLowerCase().includes(q) ||
        item.group3.toLowerCase().includes(q) ||
        item.executor.toLowerCase().includes(q) ||
        item.pauseReason.toLowerCase().includes(q)
    );
  };

  const filteredNew = filterList(newFiles);
  const filteredPaused = filterList(pausedFiles);
  const filteredInWork = filterList(inWorkFiles);
  const filteredCompleted = sortData(filterList(completedFiles), completedSortConfig);

  const getCurrentList = () => {
    switch (activeSubTab) {
      case 'new':
        return sortData(filteredNew, sortConfig);
      case 'paused':
        return sortData(filteredPaused, sortConfig);
      case 'inWork':
        return sortData(filteredInWork, sortConfig);
    }
  };

  const currentList = getCurrentList();
  const totalPages = Math.max(1, Math.ceil(currentList.length / ITEMS_PER_PAGE));
  const validPage = Math.min(currentPage, totalPages);
  const pagedItems = currentList.slice((validPage - 1) * ITEMS_PER_PAGE, validPage * ITEMS_PER_PAGE);

  const handleTabChange = (tab: 'new' | 'paused' | 'inWork') => {
    setActiveSubTab(tab);
    setCurrentPage(1);
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-5">
      {/* Header & Quick Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Реестр файлов и партий — {department.toUpperCase()}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Всего файлов: {summaries.length} • Товаров в отделе: {summaries.reduce((acc, s) => acc + s.totalProducts, 0).toLocaleString('ru-RU')} SKU
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по файлу, группе..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => handleTabChange('new')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeSubTab === 'new'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>🆕 Новые</span>
          <span className="px-1.5 py-0.2 rounded font-mono bg-emerald-100 text-emerald-800 text-[10px]">
            {newFiles.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('paused')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeSubTab === 'paused'
              ? 'border-amber-600 text-amber-700 bg-amber-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>⏸️ На паузе</span>
          <span className="px-1.5 py-0.2 rounded font-mono bg-amber-100 text-amber-800 text-[10px]">
            {pausedFiles.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('inWork')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeSubTab === 'inWork'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>🔄 В работе</span>
          <span className="px-1.5 py-0.2 rounded font-mono bg-indigo-100 text-indigo-800 text-[10px]">
            {inWorkFiles.length}
          </span>
        </button>
      </div>

      {/* Subtab Tables */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        {activeSubTab === 'new' && (
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-mono text-[11px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 min-w-[200px]">
                  <SortHeader
                    label="Имя файла"
                    columnKey="fileName"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 min-w-[160px]">
                  <SortHeader
                    label="Группа 3"
                    columnKey="group3"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 text-center min-w-[140px]">
                  <SortHeader
                    label="Количество товаров"
                    columnKey="totalProducts"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                    align="center"
                  />
                </th>
                <th className="px-4 py-3 min-w-[140px]">
                  <SortHeader
                    label="Дата добавления"
                    columnKey="addedDate"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 text-center min-w-[130px]">
                  <SortHeader
                    label="Дней с добавления"
                    columnKey="daysPassed"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                    align="center"
                  />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {pagedItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    Нет новых групп.
                  </td>
                </tr>
              ) : (
                pagedItems.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-slate-900 font-medium">{row.fileName}</td>
                    <td className="px-4 py-2.5 text-slate-600">{row.group3}</td>
                    <td className="px-4 py-2.5 text-center font-mono font-semibold text-slate-800">
                      {row.totalProducts} SKU
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-500">{row.addedDate || '—'}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                          row.daysPassed > 3
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {row.daysPassed} дн.
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {activeSubTab === 'paused' && (
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-mono text-[11px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 min-w-[180px]">
                  <SortHeader
                    label="Имя файла"
                    columnKey="fileName"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 min-w-[150px]">
                  <SortHeader
                    label="Группа 3"
                    columnKey="group3"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 text-center min-w-[130px]">
                  <SortHeader
                    label="Количество товаров"
                    columnKey="totalProducts"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                    align="center"
                  />
                </th>
                <th className="px-4 py-3 min-w-[130px]">
                  <SortHeader
                    label="Исполнитель"
                    columnKey="executor"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 min-w-[120px]">
                  <SortHeader
                    label="Дата паузы"
                    columnKey="pauseDate"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 min-w-[160px]">
                  <SortHeader
                    label="Причина паузы"
                    columnKey="pauseReason"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {pagedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    Нет групп на паузе.
                  </td>
                </tr>
              ) : (
                pagedItems.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-slate-900 font-medium">{row.fileName}</td>
                    <td className="px-4 py-2.5 text-slate-600">{row.group3}</td>
                    <td className="px-4 py-2.5 text-center font-mono font-semibold text-slate-800">
                      {row.totalProducts} SKU
                    </td>
                    <td className="px-4 py-2.5 text-slate-800 font-medium">{row.executor || '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-500">{row.pauseDate || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-block px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[11px]">
                        {row.pauseReason || 'Причина не указана'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {activeSubTab === 'inWork' && (
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-mono text-[11px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 min-w-[180px]">
                  <SortHeader
                    label="Имя файла"
                    columnKey="fileName"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 min-w-[150px]">
                  <SortHeader
                    label="Группа 3"
                    columnKey="group3"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 text-center min-w-[130px]">
                  <SortHeader
                    label="Количество товаров"
                    columnKey="totalProducts"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                    align="center"
                  />
                </th>
                <th className="px-4 py-3 min-w-[130px]">
                  <SortHeader
                    label="Исполнитель"
                    columnKey="executor"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 min-w-[130px]">
                  <SortHeader
                    label="Дата начала работы"
                    columnKey="startDate"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {pagedItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    Нет групп в работе.
                  </td>
                </tr>
              ) : (
                pagedItems.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-slate-900 font-medium">{row.fileName}</td>
                    <td className="px-4 py-2.5 text-slate-600">{row.group3}</td>
                    <td className="px-4 py-2.5 text-center font-mono font-semibold text-slate-800">
                      {row.totalProducts} SKU
                    </td>
                    <td className="px-4 py-2.5 text-indigo-700 font-medium">{row.executor || '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-500">{row.startDate || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 px-1 text-xs text-slate-600">
          <div className="font-mono">
            Показано {(validPage - 1) * ITEMS_PER_PAGE + 1}–
            {Math.min(validPage * ITEMS_PER_PAGE, currentList.length)} из {currentList.length} файлов
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={validPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs font-semibold px-2">
              {validPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={validPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-1 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Collapsible Completed Groups */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowCompleted(!showCompleted)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-200 transition-colors"
        >
          <FolderCheck className="w-4 h-4 text-emerald-600" />
          {showCompleted
            ? '🙈 Скрыть завершенные группы'
            : `📂 Посмотреть завершенные группы (${completedFiles.length})`}
          {showCompleted ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showCompleted && (
          <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden animate-in fade-in duration-200">
            <div className="px-4 py-2.5 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <FolderCheck className="w-4 h-4 text-emerald-600" />
                ✅ Завершенные группы ({completedFiles.length})
              </span>
            </div>

            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-mono text-[11px] uppercase tracking-wider sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 min-w-[180px]">
                      <SortHeader
                        label="Имя файла"
                        columnKey="fileName"
                        currentSortKey={completedSortConfig.key}
                        currentDirection={completedSortConfig.direction}
                        onSort={handleCompletedSort}
                      />
                    </th>
                    <th className="px-4 py-2.5 min-w-[150px]">
                      <SortHeader
                        label="Группа 3"
                        columnKey="group3"
                        currentSortKey={completedSortConfig.key}
                        currentDirection={completedSortConfig.direction}
                        onSort={handleCompletedSort}
                      />
                    </th>
                    <th className="px-4 py-2.5 text-center min-w-[130px]">
                      <SortHeader
                        label="Количество товаров"
                        columnKey="totalProducts"
                        currentSortKey={completedSortConfig.key}
                        currentDirection={completedSortConfig.direction}
                        onSort={handleCompletedSort}
                        align="center"
                      />
                    </th>
                    <th className="px-4 py-2.5 min-w-[130px]">
                      <SortHeader
                        label="Исполнитель"
                        columnKey="executor"
                        currentSortKey={completedSortConfig.key}
                        currentDirection={completedSortConfig.direction}
                        onSort={handleCompletedSort}
                      />
                    </th>
                    <th className="px-4 py-2.5 min-w-[120px]">
                      <SortHeader
                        label="Дата начала"
                        columnKey="startDate"
                        currentSortKey={completedSortConfig.key}
                        currentDirection={completedSortConfig.direction}
                        onSort={handleCompletedSort}
                      />
                    </th>
                    <th className="px-4 py-2.5 min-w-[130px]">
                      <SortHeader
                        label="Дата завершения"
                        columnKey="endDate"
                        currentSortKey={completedSortConfig.key}
                        currentDirection={completedSortConfig.direction}
                        onSort={handleCompletedSort}
                      />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredCompleted.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                        Завершенных групп пока нет.
                      </td>
                    </tr>
                  ) : (
                    filteredCompleted.slice(0, 100).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-2 font-mono text-slate-900 font-medium">{row.fileName}</td>
                        <td className="px-4 py-2 text-slate-600">{row.group3}</td>
                        <td className="px-4 py-2 text-center font-mono font-semibold text-slate-800">
                          {row.totalProducts} SKU
                        </td>
                        <td className="px-4 py-2 text-slate-700">{row.executor || '—'}</td>
                        <td className="px-4 py-2 font-mono text-slate-500">{row.startDate || '—'}</td>
                        <td className="px-4 py-2 font-mono text-emerald-700 font-medium">
                          {row.endDate || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
