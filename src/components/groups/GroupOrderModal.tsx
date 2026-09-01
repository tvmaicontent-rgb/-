import React, { useState, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { GroupOrderItem } from '../../types';
import { SortHeader } from '../common/SortHeader';
import { SortConfig, sortData } from '../../utils/sortUtils';
import { SITE_ORDER_SPREADSHEET_URL } from '../../constants';
import {
  ListOrdered,
  Search,
  ExternalLink,
  FolderTree,
  Table as TableIcon,
  ChevronRight,
  Sparkles,
  Layers,
  CheckCircle2,
  Filter
} from 'lucide-react';

interface GroupOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: GroupOrderItem[];
}

export const GroupOrderModal: React.FC<GroupOrderModalProps> = ({
  isOpen,
  onClose,
  orders,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup1, setSelectedGroup1] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table');
  const [sortConfig, setSortConfig] = useState<SortConfig<GroupOrderItem>>({
    key: 'position',
    direction: 'asc',
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
  };

  // Distinct Group 1 list for filter
  const group1Options = useMemo(() => {
    const set = new Set<string>();
    orders.forEach(o => {
      if (o.group1 && o.group1.trim()) {
        set.add(o.group1.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [orders]);

  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (selectedGroup1 !== 'all' && (o.group1 || '').trim() !== selectedGroup1) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (o.groupName || '').toLowerCase().includes(q) ||
        (o.section || '').toLowerCase().includes(q) ||
        (o.group1 || '').toLowerCase().includes(q) ||
        (o.group2 || '').toLowerCase().includes(q) ||
        (o.group3 || '').toLowerCase().includes(q) ||
        (o.status || '').toLowerCase().includes(q) ||
        (o.comment && o.comment.toLowerCase().includes(q)) ||
        String(o.position).includes(q)
      );
    });
  }, [orders, selectedGroup1, searchQuery]);

  const sortedOrders: GroupOrderItem[] = useMemo(() => {
    return sortData<GroupOrderItem>(filtered, sortConfig);
  }, [filtered, sortConfig]);

  // Tree data structure: Group1 -> Group2 -> items
  const treeData = useMemo(() => {
    const map = new Map<string, Map<string, GroupOrderItem[]>>();
    filtered.forEach(item => {
      const g1 = item.group1 || 'Без раздела';
      const g2 = item.group2 || 'Общая группа';
      if (!map.has(g1)) {
        map.set(g1, new Map<string, GroupOrderItem[]>());
      }
      const g2Map = map.get(g1)!;
      if (!g2Map.has(g2)) {
        g2Map.set(g2, []);
      }
      g2Map.get(g2)!.push(item);
    });
    return map;
  }, [filtered]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📌 Порядок расположения групп на сайте" maxWidth="6xl">
      <div className="space-y-4">
        {/* Top Controls & Description */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <ListOrdered className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">
                Иерархия каталога интернет-магазина (Лист GID 442661295)
              </p>
              <p className="text-[11px] text-slate-500">
                Всего позиций в структуре: <strong>{orders.length}</strong> • Найдено: <strong>{filtered.length}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Таблица</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('tree')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'tree'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FolderTree className="w-3.5 h-3.5" />
                <span>Дерево</span>
              </button>
            </div>

            {/* Direct Link to Google Sheet */}
            <a
              href={SITE_ORDER_SPREADSHEET_URL}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
              title="Открыть исходный лист в Google Таблицах"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>Лист Google</span>
            </a>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск по Группе 1, Группе 2, Группе 3 или № позиции..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>

            {/* Group 1 Filter */}
            <div className="w-48 shrink-0">
              <select
                value={selectedGroup1}
                onChange={e => setSelectedGroup1(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="all">Все Группы 1 ({group1Options.length})</option>
                {group1Options.map(g1 => (
                  <option key={g1} value={g1}>
                    {g1}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content View: Table or Tree */}
        {viewMode === 'table' ? (
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[60vh] overflow-y-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 text-slate-600 font-semibold uppercase sticky top-0 border-b border-slate-200 z-10">
                <tr>
                  <th className="px-3.5 py-2.5 w-20 text-center">
                    <SortHeader
                      label="№ Поз."
                      columnKey="position"
                      currentSortKey={sortConfig.key}
                      currentDirection={sortConfig.direction}
                      onSort={handleSort}
                      align="center"
                    />
                  </th>
                  <th className="px-3.5 py-2.5 min-w-[160px]">
                    <SortHeader
                      label="Группа 1 (Раздел)"
                      columnKey="group1"
                      currentSortKey={sortConfig.key}
                      currentDirection={sortConfig.direction}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-3.5 py-2.5 min-w-[180px]">
                    <SortHeader
                      label="Группа 2 (Подраздел)"
                      columnKey="group2"
                      currentSortKey={sortConfig.key}
                      currentDirection={sortConfig.direction}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-3.5 py-2.5 min-w-[200px]">
                    <SortHeader
                      label="Группа 3 (Категория)"
                      columnKey="group3"
                      currentSortKey={sortConfig.key}
                      currentDirection={sortConfig.direction}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-3.5 py-2.5 w-32">
                    <SortHeader
                      label="Статус"
                      columnKey="status"
                      currentSortKey={sortConfig.key}
                      currentDirection={sortConfig.direction}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-3.5 py-2.5 min-w-[140px]">
                    <SortHeader
                      label="Примечание"
                      columnKey="comment"
                      currentSortKey={sortConfig.key}
                      currentDirection={sortConfig.direction}
                      onSort={handleSort}
                    />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {sortedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Позиции не найдены. Попробуйте изменить параметры поиска.
                    </td>
                  </tr>
                ) : (
                  sortedOrders.map((o, idx) => (
                    <tr key={o.id || idx} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="px-3.5 py-2 text-center font-bold text-slate-800 bg-slate-50/50 font-mono text-[11px]">
                        {o.position}
                      </td>
                      <td className="px-3.5 py-2 text-slate-700 font-semibold">{o.group1 || '—'}</td>
                      <td className="px-3.5 py-2 text-slate-600">{o.group2 || '—'}</td>
                      <td className="px-3.5 py-2 font-bold text-slate-900">
                        {o.group3 || o.groupName || '—'}
                      </td>
                      <td className="px-3.5 py-2">
                        <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {o.status || 'В структуре'}
                        </span>
                      </td>
                      <td className="px-3.5 py-2 text-slate-500 text-[11px]">{o.comment || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Tree View */
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[60vh] overflow-y-auto p-3 bg-slate-50 space-y-3">
            {treeData.size === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Нет данных для отображения структуры
              </div>
            ) : (
              Array.from(treeData.entries()).map(([g1Name, g2Map]) => (
                <div key={g1Name} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="px-4 py-2.5 bg-indigo-50/70 border-b border-indigo-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">{g1Name}</h4>
                    </div>
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full">
                      {Array.from(g2Map.values()).reduce((sum: number, list: GroupOrderItem[]) => sum + list.length, 0)} позиций
                    </span>
                  </div>

                  <div className="p-3 space-y-3">
                    {Array.from(g2Map.entries()).map(([g2Name, items]) => (
                      <div key={g2Name} className="bg-slate-50/80 rounded-lg p-2.5 border border-slate-200">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-2">
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          <span>{g2Name}</span>
                          <span className="text-[10px] font-normal text-slate-500">({items.length})</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pl-4">
                          {items.map(item => (
                            <div
                              key={item.id}
                              className="bg-white p-2 rounded-md border border-slate-200 text-xs flex items-center justify-between gap-2 hover:border-indigo-300 transition-colors"
                            >
                              <span className="truncate text-slate-900 font-medium" title={item.group3 || item.groupName}>
                                {item.group3 || item.groupName}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-2xs font-mono font-bold bg-slate-100 text-slate-600 shrink-0">
                                № {item.position}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-500">
            Отображается: <strong>{sortedOrders.length}</strong> из <strong>{orders.length}</strong> позиций
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </Modal>
  );
};
