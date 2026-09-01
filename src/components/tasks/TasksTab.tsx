import React, { useState, useEffect, useMemo } from 'react';
import { TaskItem } from '../../types';
import { storageService } from '../../services/storageService';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';
import { Plus, Search, CheckSquare, Layers } from 'lucide-react';

interface ColumnConfig {
  id: string;
  title: string;
  headerBg: string;
  filterFn: (t: TaskItem) => boolean;
  defaultTitlePrefix: string;
  defaultStatus: string;
}

export const TasksTab: React.FC = () => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [defaultColumnContext, setDefaultColumnContext] = useState<{ titlePrefix: string; status: string } | null>(null);

  const loadData = () => {
    setTasks(storageService.getTasks());
  };

  useEffect(() => {
    loadData();
    const unsub = storageService.subscribe(loadData);
    return () => unsub();
  }, []);

  const handleOpenNew = (context?: { titlePrefix: string; status: string }) => {
    setEditingTask(null);
    setDefaultColumnContext(context || null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (task: TaskItem) => {
    setEditingTask(task);
    setDefaultColumnContext(null);
    setIsModalOpen(true);
  };

  const handleSaveNew = (taskData: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    storageService.addTask(taskData);
    loadData();
  };

  const handleUpdate = (id: string, updates: Partial<TaskItem>) => {
    storageService.updateTask(id, updates);
    loadData();
  };

  const handleDelete = (id: string) => {
    storageService.deleteTask(id);
    loadData();
  };

  // Filter tasks by search
  const searchedTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    const q = searchQuery.toLowerCase();
    return tasks.filter(
      t =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.executors.toLowerCase().includes(q)
    );
  }, [tasks, searchQuery]);

  // Define Columns matching Planfix reference board
  const columns: ColumnConfig[] = [
    {
      id: 'new-materik',
      title: 'Новые задачи_Материк',
      headerBg: 'bg-[#a32e2e]', // Planfix crimson red
      defaultTitlePrefix: 'Материк: ',
      defaultStatus: 'Новая',
      filterFn: t => {
        const s = t.status.toLowerCase();
        const isNotActive = !s.includes('работ') && !s.includes('заверш') && !s.includes('выполн');
        return isNotActive && (t.title.toLowerCase().includes('материк') || !t.title.toLowerCase().includes('палас'));
      },
    },
    {
      id: 'new-palas',
      title: 'Новые задачи_Палас',
      headerBg: 'bg-[#215f9e]', // Planfix royal blue
      defaultTitlePrefix: 'Палас: ',
      defaultStatus: 'Новая',
      filterFn: t => {
        const s = t.status.toLowerCase();
        const isNotActive = !s.includes('работ') && !s.includes('заверш') && !s.includes('выполн');
        return isNotActive && t.title.toLowerCase().includes('палас');
      },
    },
    {
      id: 'in-work',
      title: 'В работе',
      headerBg: 'bg-[#3b8bc2]', // Planfix sky blue
      defaultTitlePrefix: '',
      defaultStatus: 'В работе',
      filterFn: t => {
        const s = t.status.toLowerCase();
        return s.includes('работ') || s.includes('progress');
      },
    },
    {
      id: 'done',
      title: 'Выполненные',
      headerBg: 'bg-[#298751]', // Planfix emerald green
      defaultTitlePrefix: '',
      defaultStatus: 'Выполнено',
      filterFn: t => {
        const s = t.status.toLowerCase();
        return s.includes('заверш') || s.includes('выполн') || s.includes('done');
      },
    },
  ];

  return (
    <div className="space-y-5">
      {/* Top Header & Search Toolbar */}
      <div className="bg-white/95 backdrop-blur-xs rounded-2xl p-5 border border-sky-100/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-sky-500 to-indigo-600 text-white rounded-xl shadow-xs">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              Задачи
              <span className="text-xs font-semibold px-2.5 py-0.5 bg-sky-100 text-sky-800 rounded-full">
                {tasks.length} задач
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Управление задачами контент-менеджеров, чек-листами и статусами выполнения в стиле Planfix
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск задач или исполнителей..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 font-medium"
            />
          </div>

          <button
            type="button"
            onClick={() => handleOpenNew()}
            className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer hover:shadow-sky-200"
          >
            <Plus className="w-4 h-4" />
            <span>Новая задача</span>
          </button>
        </div>
      </div>

      {/* Planfix Styled Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {columns.map(col => {
          const colTasks = searchedTasks.filter(col.filterFn);

          return (
            <div
              key={col.id}
              className="bg-slate-200/50 rounded-2xl p-2.5 border border-slate-200/90 shadow-2xs space-y-2.5 flex flex-col"
            >
              {/* Colored Column Header */}
              <div
                className={`${col.headerBg} text-white px-3.5 py-2.5 rounded-xl shadow-xs flex flex-col justify-between gap-1`}
              >
                <div className="font-bold text-xs leading-tight tracking-wide">{col.title}</div>
                <div className="text-[11px] font-medium opacity-90">
                  Количество задач: {colTasks.length}
                </div>
              </div>

              {/* Quick + Create button under column header */}
              <button
                type="button"
                onClick={() =>
                  handleOpenNew({
                    titlePrefix: col.defaultTitlePrefix,
                    status: col.defaultStatus,
                  })
                }
                className="w-full py-1.5 px-3 bg-white hover:bg-slate-50 text-slate-700 hover:text-sky-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Создать</span>
              </button>

              {/* Tasks List */}
              <div className="space-y-2.5 min-h-[220px]">
                {colTasks.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-white/60 border border-dashed border-slate-300/80 rounded-xl">
                    Нет задач в этой колонке
                  </div>
                ) : (
                  colTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onOpen={handleOpenEdit}
                      onStatusChange={(id, newStatus) => handleUpdate(id, { status: newStatus as any })}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Modal (Create & Edit) */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        taskToEdit={
          editingTask ||
          (defaultColumnContext
            ? ({
                title: defaultColumnContext.titlePrefix,
                status: defaultColumnContext.status,
                urgency: 'Обычная',
                executors: 'Татьяна Мельник',
                description: '',
              } as any)
            : null)
        }
        onSave={handleSaveNew}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  );
};
