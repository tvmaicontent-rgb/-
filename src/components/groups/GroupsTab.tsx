import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CategoryGroup, GroupOrderItem } from '../../types';
import { storageService } from '../../services/storageService';
import { googleSheetsService } from '../../services/googleSheetsService';
import { MANAGERS_LIST } from '../../constants';
import { GroupEditorModal } from './GroupEditorModal';
import { BulkAddGroupsModal } from './BulkAddGroupsModal';
import { GroupOrderModal } from './GroupOrderModal';
import { SortHeader } from '../common/SortHeader';
import { SortConfig, sortData } from '../../utils/sortUtils';
import {
  Plus,
  ListOrdered,
  Search,
  Edit,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  User,
  Filter,
  CheckSquare,
  Square,
  CheckCircle2,
  Trash2,
  Check,
  X,
  Layers,
  Sparkles
} from 'lucide-react';

const ITEMS_PER_PAGE = 30;

const KAM_STATUS_OPTIONS = [
  'Добавлено',
  'Не добавлено',
  'Только группа',
  'Нет товаров',
  'В работе',
  '—',
];

export const GroupsTab: React.FC = () => {
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [groupOrders, setGroupOrders] = useState<GroupOrderItem[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'inWork' | 'released' | 'addFile'>('inWork');
  const [searchQuery, setSearchQuery] = useState('');
  const [managerFilter, setManagerFilter] = useState<string>('all');
  const [group1Filter, setGroup1Filter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig<CategoryGroup>>({
    key: '',
    direction: null,
  });

  // Selected IDs for mass operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Inline editing cell tracker: { id: string, field: keyof CategoryGroup }
  const [editingCell, setEditingCell] = useState<{ id: string; field: keyof CategoryGroup } | null>(null);
  const [tempCellValue, setTempCellValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CategoryGroup | null>(null);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = () => {
    setGroups(storageService.getCategoryGroups());
    setGroupOrders(storageService.getGroupOrders());
  };

  useEffect(() => {
    loadData();
    const unsub = storageService.subscribe(loadData);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  // Helper to count unique Group 3 values
  const countUniqueGroup3 = (list: CategoryGroup[]): number => {
    const set = new Set(list.map(g => (g.group3 || '').trim()).filter(Boolean));
    return set.size;
  };

  // 1. Released: KAM file is "Добавлено" (или "да")
  const releasedGroups = useMemo(() => {
    return groups.filter(g => {
      const kam = (g.kamFile || '').toLowerCase().trim();
      return kam === 'добавлено' || kam === 'да';
    });
  }, [groups]);

  // 2. Add to file: "Не добавлено" (только если заполнена дата "Вывод на материк"), "нет товаров" и "только группа"
  const addFileGroups = useMemo(() => {
    return groups.filter(g => {
      const kam = (g.kamFile || '').toLowerCase().trim();
      const relDate = (g.releaseDate || '').trim();

      if (kam === 'нет товаров' || kam === 'только группа') {
        return true;
      }
      if (kam === 'не добавлено' && relDate !== '') {
        return true;
      }
      return false;
    });
  }, [groups]);

  // 3. In work: Groups that are not yet released to KAM
  const inWorkGroups = useMemo(() => {
    return groups.filter(g => {
      const kam = (g.kamFile || '').toLowerCase().trim();
      return kam !== 'добавлено' && kam !== 'да';
    });
  }, [groups]);

  // Unique Group 1 list for filtering
  const group1Options: string[] = useMemo(() => {
    return Array.from(
      new Set<string>(groups.map(g => (g.group1 || '').trim()).filter((v): v is string => Boolean(v)))
    ).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [groups]);

  const filterList = (list: CategoryGroup[]) => {
    let res = list;
    if (managerFilter !== 'all') {
      res = res.filter(g => (g.manager || '').toLowerCase().includes(managerFilter.toLowerCase()));
    }
    if (group1Filter !== 'all') {
      res = res.filter(g => (g.group1 || '').toLowerCase() === group1Filter.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      res = res.filter(
        g =>
          g.group1.toLowerCase().includes(q) ||
          g.group2.toLowerCase().includes(q) ||
          g.group3.toLowerCase().includes(q) ||
          g.manager.toLowerCase().includes(q) ||
          g.kamFile.toLowerCase().includes(q) ||
          g.skuCount.toLowerCase().includes(q)
      );
    }
    return res;
  };

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

  const rawFilteredList = useMemo(() => {
    return activeSubTab === 'inWork'
      ? filterList(inWorkGroups)
      : activeSubTab === 'released'
      ? filterList(releasedGroups)
      : filterList(addFileGroups);
  }, [activeSubTab, inWorkGroups, releasedGroups, addFileGroups, managerFilter, group1Filter, searchQuery]);

  const currentList = useMemo(() => {
    return sortData(rawFilteredList, sortConfig);
  }, [rawFilteredList, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(currentList.length / ITEMS_PER_PAGE));
  const validPage = Math.min(currentPage, totalPages);
  const pagedItems = useMemo(() => {
    return currentList.slice((validPage - 1) * ITEMS_PER_PAGE, validPage * ITEMS_PER_PAGE);
  }, [currentList, validPage]);

  const handleTabChange = (tab: 'inWork' | 'released' | 'addFile') => {
    setActiveSubTab(tab);
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  // Save single group updates immediately to state and persistence
  const updateSingleGroup = (id: string, updates: Partial<CategoryGroup>) => {
    const target = groups.find(g => g.id === id);
    const updated = groups.map(g => (g.id === id ? { ...g, ...updates } : g));
    setGroups(updated);
    storageService.saveCategoryGroups(updated);
    showToast('Изменения сохранены');

    if (target) {
      googleSheetsService.pushGroupUpdate(target.group3, updates).catch(console.error);
    }
  };

  // Mass update selected groups
  const handleMassUpdate = (updates: Partial<CategoryGroup>) => {
    if (selectedIds.size === 0) return;
    const selectedGroups = groups.filter(g => selectedIds.has(g.id));
    const updated = groups.map(g => (selectedIds.has(g.id) ? { ...g, ...updates } : g));
    setGroups(updated);
    storageService.saveCategoryGroups(updated);
    showToast(`Обновлено ${selectedIds.size} групп`);

    selectedGroups.forEach(g => {
      googleSheetsService.pushGroupUpdate(g.group3, updates).catch(console.error);
    });
  };

  // Mass delete selected groups
  const handleMassDelete = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Удалить выбранные ${selectedIds.size} групп из списка?`)) {
      const updated = groups.filter(g => !selectedIds.has(g.id));
      setGroups(updated);
      storageService.saveCategoryGroups(updated);
      setSelectedIds(new Set());
      showToast('Группы удалены');
    }
  };

  // Inline Cell Edit handlers
  const startEditingCell = (id: string, field: keyof CategoryGroup, currentValue: string) => {
    setEditingCell({ id, field });
    setTempCellValue(currentValue || '');
  };

  const commitCellEdit = () => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    updateSingleGroup(id, { [field]: tempCellValue } as Partial<CategoryGroup>);
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commitCellEdit();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  // Selection helpers
  const isAllPageSelected = pagedItems.length > 0 && pagedItems.every(g => selectedIds.has(g.id));

  const toggleSelectAllPage = () => {
    const next = new Set(selectedIds);
    if (isAllPageSelected) {
      pagedItems.forEach(g => next.delete(g.id));
    } else {
      pagedItems.forEach(g => next.add(g.id));
    }
    setSelectedIds(next);
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectedGroupsList = useMemo(() => {
    return groups.filter(g => selectedIds.has(g.id));
  }, [groups, selectedIds]);

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/90 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 backdrop-blur-sm border border-slate-700 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top action header with Planfix-styled accents */}
      <div className="bg-white/95 backdrop-blur-xs rounded-2xl p-5 border border-sky-100/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-sky-500 to-indigo-600 text-white rounded-xl shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              Вывод групп каталога
              <span className="text-xs font-semibold px-2.5 py-0.5 bg-sky-100 text-sky-800 rounded-full">
                {countUniqueGroup3(groups)} групп 3
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Управление открытием категорий, статусами согласования и выводом на сайты Материк и Палас
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setEditingGroup(null);
              setIsEditorOpen(true);
            }}
            className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer hover:shadow-sky-200"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить группу</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBulkAddOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Массовое добавление</span>
          </button>

          <button
            type="button"
            onClick={() => setIsOrderModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            <ListOrdered className="w-4 h-4 text-indigo-600" />
            <span>Порядок на сайте</span>
          </button>
        </div>
      </div>

      {/* Floating Mass Edit Toolbar if rows are selected */}
      {selectedIds.size > 0 && (
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-4 shadow-xl border border-indigo-800/50 flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="bg-sky-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              Выбрано: {selectedIds.size} строк ({countUniqueGroup3(selectedGroupsList)} групп 3)
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-slate-300 hover:text-white underline cursor-pointer"
            >
              Снять выделение
            </button>
          </div>

          {/* Mass Actions */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Change Manager */}
            <select
              onChange={e => {
                if (e.target.value) {
                  handleMassUpdate({ manager: e.target.value });
                  e.target.value = '';
                }
              }}
              defaultValue=""
              className="px-3 py-1.5 bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-sky-400"
            >
              <option value="" disabled>
                👤 Назначить менеджера...
              </option>
              {MANAGERS_LIST.map(m => (
                <option key={m.code} value={m.name}>
                  {m.name} ({m.code})
                </option>
              ))}
            </select>

            {/* Set KAM Status */}
            <button
              type="button"
              onClick={() => handleMassUpdate({ kamFile: 'Добавлено' })}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors cursor-pointer"
            >
              В файл КАМ: Добавлено
            </button>

            <button
              type="button"
              onClick={() => handleMassUpdate({ kamFile: 'В работе' })}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg transition-colors cursor-pointer"
            >
              В файл КАМ: В работе
            </button>

            {/* Materik / Palas Toggle */}
            <button
              type="button"
              onClick={() => handleMassUpdate({ includedMaterik: '1' })}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer border border-slate-700"
              title="Включить на Материк (1)"
            >
              Материк = 1
            </button>

            <button
              type="button"
              onClick={() => handleMassUpdate({ includedPalas: '1' })}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer border border-slate-700"
              title="Включить на Палас (1)"
            >
              Палас = 1
            </button>

            <button
              type="button"
              onClick={handleMassDelete}
              className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Удалить</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-sky-100/90 shadow-xs space-y-4">
        {/* Subtabs + Filters Bar */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          {/* Sub Tabs with accurate Group 3 counting - aligned in a single row */}
          <div className="flex flex-row items-center gap-2 overflow-x-auto no-scrollbar flex-nowrap shrink-0">
            {/* Tab: In Work */}
            <button
              type="button"
              onClick={() => handleTabChange('inWork')}
              className={`flex items-center whitespace-nowrap gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'inWork'
                  ? 'bg-sky-600 text-white shadow-xs shadow-sky-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>В работе</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  activeSubTab === 'inWork' ? 'bg-sky-800/80 text-white' : 'bg-slate-200 text-slate-700'
                }`}
                title="Количество уникальных Групп 3 в работе"
              >
                {countUniqueGroup3(inWorkGroups)} групп 3
              </span>
            </button>

            {/* Tab: Released */}
            <button
              type="button"
              onClick={() => handleTabChange('released')}
              className={`flex items-center whitespace-nowrap gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'released'
                  ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Выведены</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  activeSubTab === 'released' ? 'bg-emerald-800/80 text-white' : 'bg-slate-200 text-slate-700'
                }`}
                title="Количество выведенных уникальных Групп 3"
              >
                {countUniqueGroup3(releasedGroups)} групп 3
              </span>
            </button>

            {/* Tab: Add to File */}
            <button
              type="button"
              onClick={() => handleTabChange('addFile')}
              className={`flex items-center whitespace-nowrap gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'addFile'
                  ? 'bg-amber-600 text-white shadow-xs shadow-amber-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Добавить в файл</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  activeSubTab === 'addFile' ? 'bg-amber-800/80 text-white' : 'bg-slate-200 text-slate-700'
                }`}
                title="Группы со статусами: Не добавлено (с заполненной датой вывода на Материк), Нет товаров, Только группа"
              >
                {countUniqueGroup3(addFileGroups)} групп 3
              </span>
            </button>
          </div>

          {/* Quick Filters and Search - Pushed to the right */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 ml-auto">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={group1Filter}
                onChange={e => {
                  setGroup1Filter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 max-w-[170px] truncate cursor-pointer"
                title="Фильтр по Группе 1"
              >
                <option value="all">Все группы 1 ({group1Options.length})</option>
                {group1Options.map(g1 => (
                  <option key={g1} value={g1}>
                    {g1}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={managerFilter}
                onChange={e => {
                  setManagerFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value="all">Все менеджеры</option>
                {MANAGERS_LIST.map(m => (
                  <option key={m.code} value={m.name}>
                    {m.name} ({m.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск группы 1, 2, 3, КМ..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Quick Helper notice for inline editing */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 bg-sky-50/60 px-3.5 py-1.5 rounded-lg border border-sky-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span>
              💡 <b>Быстрое редактирование:</b> кликните по любой ячейке таблицы для моментального изменения значения или выберите несколько строк чекбоксами для массового обновления.
            </span>
          </div>
          <span className="font-semibold text-slate-600 hidden sm:inline">
            Уникальных групп 3 в списке: {countUniqueGroup3(rawFilteredList)} (строк: {rawFilteredList.length})
          </span>
        </div>

        {/* Scrollable table with sticky columns & inline editing */}
        <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-[65vh] overflow-y-auto shadow-2xs">
          <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
            <thead className="bg-slate-100/90 text-slate-700 font-bold text-[11px] uppercase tracking-wider sticky top-0 z-20 border-b border-slate-300">
              <tr>
                {/* Select All Checkbox */}
                <th className="px-3 py-3 text-center sticky left-0 bg-slate-100 z-30 w-10">
                  <button
                    type="button"
                    onClick={toggleSelectAllPage}
                    className="cursor-pointer text-slate-600 hover:text-sky-600"
                    title={isAllPageSelected ? 'Снять выделение со страницы' : 'Выбрать всю страницу'}
                  >
                    {isAllPageSelected ? (
                      <CheckSquare className="w-4 h-4 text-sky-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>

                <th className="px-2 py-3 text-center sticky left-10 bg-slate-100 z-30 w-14">
                  Действие
                </th>

                <th className="px-3 py-3 sticky left-24 bg-slate-100 z-30 min-w-[130px]">
                  <SortHeader
                    label="Группа 1"
                    columnKey="group1"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>

                <th className="px-3 py-3 sticky left-[226px] bg-slate-100 z-30 min-w-[140px]">
                  <SortHeader
                    label="Группа 2"
                    columnKey="group2"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>

                <th className="px-3 py-3 sticky left-[366px] bg-slate-100 z-30 min-w-[170px] border-r-2 border-slate-300">
                  <SortHeader
                    label="Группа 3"
                    columnKey="group3"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>

                <th className="px-3 py-3 min-w-[140px]">
                  <SortHeader
                    label="Менеджер"
                    columnKey="manager"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>

                <th className="px-3 py-3 text-center min-w-[120px]">
                  <SortHeader
                    label="Вкл. Материк"
                    columnKey="includedMaterik"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                    align="center"
                  />
                </th>

                <th className="px-3 py-3 text-center min-w-[120px]">
                  <SortHeader
                    label="Вкл. Палас"
                    columnKey="includedPalas"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                    align="center"
                  />
                </th>

                <th className="px-3 py-3 text-center min-w-[100px]">
                  <SortHeader
                    label="Кол-во SKU"
                    columnKey="skuCount"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                    align="center"
                  />
                </th>

                <th className="px-3 py-3 min-w-[120px]">
                  <SortHeader
                    label="В файл КАМ"
                    columnKey="kamFile"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>

                <th className="px-3 py-3 min-w-[120px]">
                  <SortHeader
                    label="Старт работ"
                    columnKey="startDate"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>

                <th className="px-3 py-3 min-w-[130px]">
                  <SortHeader
                    label="Запрос доноров"
                    columnKey="donorRequestDate"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>

                <th className="px-3 py-3 min-w-[130px]">
                  <SortHeader
                    label="Получение доноров"
                    columnKey="donorReceivedDate"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>

                <th className="px-3 py-3 min-w-[130px]">
                  <SortHeader
                    label="Отправка согласов."
                    columnKey="approvalSentDate"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>

                <th className="px-3 py-3 min-w-[120px]">
                  <SortHeader
                    label="Дата согласов."
                    columnKey="approvalDate"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>

                <th className="px-3 py-3 min-w-[130px]">
                  <SortHeader
                    label="Вывод на Материк"
                    columnKey="releaseDate"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>

                <th className="px-3 py-3 min-w-[120px]">
                  <SortHeader
                    label="Сайт Палас"
                    columnKey="palasAllocated"
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
                  <td colSpan={17} className="px-4 py-12 text-center text-slate-400">
                    Нет групп в выбранном разделе.
                  </td>
                </tr>
              ) : (
                pagedItems.map(g => {
                  const isSelected = selectedIds.has(g.id);

                  return (
                    <tr
                      key={g.id}
                      className={`hover:bg-sky-50/40 transition-colors group ${
                        isSelected ? 'bg-sky-50/70' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-2 text-center sticky left-0 bg-white group-hover:bg-sky-50/50 z-10">
                        <button
                          type="button"
                          onClick={() => toggleSelectRow(g.id)}
                          className="cursor-pointer text-slate-400 hover:text-sky-600"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-sky-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Action Modal Edit */}
                      <td className="px-2 py-2 text-center sticky left-10 bg-white group-hover:bg-sky-50/50 z-10">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingGroup(g);
                            setIsEditorOpen(true);
                          }}
                          className="p-1 text-slate-500 hover:text-sky-700 hover:bg-sky-100 rounded transition-colors cursor-pointer"
                          title="Редактировать группу в модальном окне"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </td>

                      {/* Group 1 (Inline Edit) */}
                      <td
                        onClick={() => startEditingCell(g.id, 'group1', g.group1)}
                        className="px-3 py-2 text-slate-700 sticky left-24 bg-slate-50/90 group-hover:bg-slate-100/90 z-10 font-medium cursor-pointer hover:bg-amber-50"
                        title="Нажмите для редактирования"
                      >
                        {editingCell?.id === g.id && editingCell?.field === 'group1' ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={tempCellValue}
                            onChange={e => setTempCellValue(e.target.value)}
                            onBlur={commitCellEdit}
                            onKeyDown={handleKeyDown}
                            className="w-full px-1.5 py-0.5 text-xs border border-sky-500 rounded bg-white font-medium focus:outline-none"
                          />
                        ) : (
                          <span>{g.group1 || '—'}</span>
                        )}
                      </td>

                      {/* Group 2 (Inline Edit) */}
                      <td
                        onClick={() => startEditingCell(g.id, 'group2', g.group2)}
                        className="px-3 py-2 text-slate-700 sticky left-[226px] bg-slate-50/90 group-hover:bg-slate-100/90 z-10 font-medium cursor-pointer hover:bg-amber-50"
                        title="Нажмите для редактирования"
                      >
                        {editingCell?.id === g.id && editingCell?.field === 'group2' ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={tempCellValue}
                            onChange={e => setTempCellValue(e.target.value)}
                            onBlur={commitCellEdit}
                            onKeyDown={handleKeyDown}
                            className="w-full px-1.5 py-0.5 text-xs border border-sky-500 rounded bg-white font-medium focus:outline-none"
                          />
                        ) : (
                          <span>{g.group2 || '—'}</span>
                        )}
                      </td>

                      {/* Group 3 (Inline Edit) */}
                      <td
                        onClick={() => startEditingCell(g.id, 'group3', g.group3)}
                        className="px-3 py-2 font-bold text-slate-900 sticky left-[366px] bg-slate-50/90 group-hover:bg-slate-100/90 z-10 border-r-2 border-slate-300 cursor-pointer hover:bg-amber-50"
                        title="Нажмите для редактирования"
                      >
                        {editingCell?.id === g.id && editingCell?.field === 'group3' ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={tempCellValue}
                            onChange={e => setTempCellValue(e.target.value)}
                            onBlur={commitCellEdit}
                            onKeyDown={handleKeyDown}
                            className="w-full px-1.5 py-0.5 text-xs border border-sky-500 rounded bg-white font-bold focus:outline-none"
                          />
                        ) : (
                          <span>{g.group3 || '—'}</span>
                        )}
                      </td>

                      {/* Manager (Inline Select Dropdown) */}
                      <td className="px-3 py-1.5">
                        <select
                          value={g.manager || ''}
                          onChange={e => updateSingleGroup(g.id, { manager: e.target.value })}
                          className="px-2 py-1 text-xs font-semibold bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer w-full max-w-[130px]"
                        >
                          <option value="—">—</option>
                          {MANAGERS_LIST.map(m => (
                            <option key={m.code} value={m.name}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Materik Toggle 0/1 */}
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            updateSingleGroup(g.id, {
                              includedMaterik: g.includedMaterik === '1' ? '0' : '1',
                            })
                          }
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-transform active:scale-95 cursor-pointer ${
                            g.includedMaterik === '1'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                          title="Кликните для переключения 0 / 1"
                        >
                          {g.includedMaterik === '1' ? '1 (Вкл)' : '0 (Выкл)'}
                        </button>
                      </td>

                      {/* Palas Toggle 0/1 */}
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            updateSingleGroup(g.id, {
                              includedPalas: g.includedPalas === '1' ? '0' : '1',
                            })
                          }
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-transform active:scale-95 cursor-pointer ${
                            g.includedPalas === '1'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                          title="Кликните для переключения 0 / 1"
                        >
                          {g.includedPalas === '1' ? '1 (Вкл)' : '0 (Выкл)'}
                        </button>
                      </td>

                      {/* SKU Count */}
                      <td
                        onClick={() => startEditingCell(g.id, 'skuCount', g.skuCount)}
                        className="px-3 py-2 text-center font-bold text-slate-800 cursor-pointer hover:bg-amber-50"
                        title="Нажмите для редактирования"
                      >
                        {editingCell?.id === g.id && editingCell?.field === 'skuCount' ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={tempCellValue}
                            onChange={e => setTempCellValue(e.target.value)}
                            onBlur={commitCellEdit}
                            onKeyDown={handleKeyDown}
                            className="w-16 text-center px-1 py-0.5 text-xs border border-sky-500 rounded bg-white font-bold focus:outline-none"
                          />
                        ) : (
                          <span>{g.skuCount || '0'}</span>
                        )}
                      </td>

                      {/* KAM File Status (Quick Selector / Input) */}
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-1">
                          <select
                            value={
                              KAM_STATUS_OPTIONS.includes(g.kamFile)
                                ? g.kamFile
                                : g.kamFile
                                ? 'custom'
                                : '—'
                            }
                            onChange={e => {
                              if (e.target.value === 'custom') {
                                startEditingCell(g.id, 'kamFile', g.kamFile);
                              } else {
                                updateSingleGroup(g.id, {
                                  kamFile: e.target.value === '—' ? '' : e.target.value,
                                });
                              }
                            }}
                            className={`px-2 py-1 text-[11px] font-bold rounded-lg border cursor-pointer focus:outline-none ${
                              g.kamFile === 'Добавлено' || g.kamFile === 'да'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : g.kamFile === 'В работе'
                                ? 'bg-sky-50 text-sky-800 border-sky-300'
                                : g.kamFile === 'Не добавлено'
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : g.kamFile === 'Только группа'
                                ? 'bg-purple-50 text-purple-800 border-purple-300'
                                : g.kamFile === 'Нет товаров'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            <option value="—">— Пусто</option>
                            <option value="Добавлено">Добавлено</option>
                            <option value="Не добавлено">Не добавлено</option>
                            <option value="Только группа">Только группа</option>
                            <option value="Нет товаров">Нет товаров</option>
                            <option value="В работе">В работе</option>
                            <option value="custom">Свой текст...</option>
                          </select>
                        </div>
                      </td>

                      {/* Dates (Start, Donors, Approvals, Release) */}
                      <td
                        onClick={() => startEditingCell(g.id, 'startDate', g.startDate)}
                        className="px-3 py-2 text-slate-500 cursor-pointer hover:bg-amber-50"
                        title="Нажмите для редактирования"
                      >
                        {editingCell?.id === g.id && editingCell?.field === 'startDate' ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={tempCellValue}
                            onChange={e => setTempCellValue(e.target.value)}
                            onBlur={commitCellEdit}
                            onKeyDown={handleKeyDown}
                            className="w-24 px-1 py-0.5 text-xs border border-sky-500 rounded bg-white focus:outline-none"
                          />
                        ) : (
                          <span>{g.startDate || '—'}</span>
                        )}
                      </td>

                      <td
                        onClick={() => startEditingCell(g.id, 'donorRequestDate', g.donorRequestDate)}
                        className="px-3 py-2 text-slate-500 cursor-pointer hover:bg-amber-50"
                      >
                        {editingCell?.id === g.id && editingCell?.field === 'donorRequestDate' ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={tempCellValue}
                            onChange={e => setTempCellValue(e.target.value)}
                            onBlur={commitCellEdit}
                            onKeyDown={handleKeyDown}
                            className="w-24 px-1 py-0.5 text-xs border border-sky-500 rounded bg-white focus:outline-none"
                          />
                        ) : (
                          <span>{g.donorRequestDate || '—'}</span>
                        )}
                      </td>

                      <td
                        onClick={() => startEditingCell(g.id, 'donorReceivedDate', g.donorReceivedDate)}
                        className="px-3 py-2 text-slate-500 cursor-pointer hover:bg-amber-50"
                      >
                        {editingCell?.id === g.id && editingCell?.field === 'donorReceivedDate' ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={tempCellValue}
                            onChange={e => setTempCellValue(e.target.value)}
                            onBlur={commitCellEdit}
                            onKeyDown={handleKeyDown}
                            className="w-24 px-1 py-0.5 text-xs border border-sky-500 rounded bg-white focus:outline-none"
                          />
                        ) : (
                          <span>{g.donorReceivedDate || '—'}</span>
                        )}
                      </td>

                      <td
                        onClick={() => startEditingCell(g.id, 'approvalSentDate', g.approvalSentDate)}
                        className="px-3 py-2 text-slate-500 cursor-pointer hover:bg-amber-50"
                      >
                        {editingCell?.id === g.id && editingCell?.field === 'approvalSentDate' ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={tempCellValue}
                            onChange={e => setTempCellValue(e.target.value)}
                            onBlur={commitCellEdit}
                            onKeyDown={handleKeyDown}
                            className="w-24 px-1 py-0.5 text-xs border border-sky-500 rounded bg-white focus:outline-none"
                          />
                        ) : (
                          <span>{g.approvalSentDate || '—'}</span>
                        )}
                      </td>

                      <td
                        onClick={() => startEditingCell(g.id, 'approvalDate', g.approvalDate)}
                        className="px-3 py-2 text-slate-500 cursor-pointer hover:bg-amber-50"
                      >
                        {editingCell?.id === g.id && editingCell?.field === 'approvalDate' ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={tempCellValue}
                            onChange={e => setTempCellValue(e.target.value)}
                            onBlur={commitCellEdit}
                            onKeyDown={handleKeyDown}
                            className="w-24 px-1 py-0.5 text-xs border border-sky-500 rounded bg-white focus:outline-none"
                          />
                        ) : (
                          <span>{g.approvalDate || '—'}</span>
                        )}
                      </td>

                      <td
                        onClick={() => startEditingCell(g.id, 'releaseDate', g.releaseDate)}
                        className="px-3 py-2 text-emerald-700 font-bold cursor-pointer hover:bg-amber-50"
                      >
                        {editingCell?.id === g.id && editingCell?.field === 'releaseDate' ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={tempCellValue}
                            onChange={e => setTempCellValue(e.target.value)}
                            onBlur={commitCellEdit}
                            onKeyDown={handleKeyDown}
                            className="w-24 px-1 py-0.5 text-xs border border-sky-500 rounded bg-white font-bold focus:outline-none"
                          />
                        ) : (
                          <span>{g.releaseDate || '—'}</span>
                        )}
                      </td>

                      <td
                        onClick={() => startEditingCell(g.id, 'palasAllocated', g.palasAllocated)}
                        className="px-3 py-2 text-slate-500 cursor-pointer hover:bg-amber-50"
                      >
                        {editingCell?.id === g.id && editingCell?.field === 'palasAllocated' ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={tempCellValue}
                            onChange={e => setTempCellValue(e.target.value)}
                            onBlur={commitCellEdit}
                            onKeyDown={handleKeyDown}
                            className="w-24 px-1 py-0.5 text-xs border border-sky-500 rounded bg-white focus:outline-none"
                          />
                        ) : (
                          <span>{g.palasAllocated || '—'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between pt-2 px-1 text-xs text-slate-600 gap-2">
            <div className="font-semibold">
              Показано {(validPage - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(validPage * ITEMS_PER_PAGE, currentList.length)} из {currentList.length} строк ({countUniqueGroup3(rawFilteredList)} групп 3)
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={validPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold px-3 py-1 bg-slate-100 rounded-lg">
                Страница {validPage} из {totalPages}
              </span>
              <button
                type="button"
                disabled={validPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <GroupEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        groupToEdit={editingGroup}
        onSave={groupData => {
          if (editingGroup) {
            updateSingleGroup(editingGroup.id, groupData);
          } else {
            storageService.addCategoryGroup(groupData as Omit<CategoryGroup, 'id'>);
            loadData();
          }
        }}
      />
      <BulkAddGroupsModal
        isOpen={isBulkAddOpen}
        onClose={() => setIsBulkAddOpen(false)}
        onSuccess={loadData}
      />
      <GroupOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        orders={groupOrders}
      />
    </div>
  );
};
