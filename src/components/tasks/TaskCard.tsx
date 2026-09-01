import React from 'react';
import { TaskItem } from '../../types';
import { Paperclip, Star, CheckSquare, Clock, ArrowRight, User } from 'lucide-react';

interface TaskCardProps {
  task: TaskItem;
  onOpen: (task: TaskItem) => void;
  onStatusChange?: (id: string, newStatus: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onOpen, onStatusChange }) => {
  const descLines = (task.description || '').split('\n');
  const checklistItems = descLines.filter(line => /^\s*-\s*\[[ xX]\]/.test(line));
  const checkedCount = descLines.filter(line => /^\s*-\s*\[[xX]\]/.test(line)).length;

  // Determine section tag from task title or text
  const titleLower = task.title.toLowerCase();
  const tag = titleLower.includes('палас')
    ? 'Палас'
    : 'Материк';

  const isAccepted = task.status.toLowerCase().includes('работ') || task.status.toLowerCase().includes('progress');
  const isDone = task.status.toLowerCase().includes('заверш') || task.status.toLowerCase().includes('выполн') || task.status.toLowerCase().includes('done');

  return (
    <div
      id={`task-card-${task.id}`}
      className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group hover:border-sky-300"
    >
      <div>
        {/* Top line: Tag & Star */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
          <span className="font-semibold text-slate-500 hover:text-slate-700 cursor-pointer">
            {tag}
          </span>
          <button
            type="button"
            className="text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
            title="Добавить в избранное"
          >
            <Star className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Task Title in Planfix turquoise/blue */}
        <h4
          onClick={() => onOpen(task)}
          className="text-xs sm:text-[13px] font-bold text-[#0d7ea6] hover:text-[#095b77] hover:underline transition-colors leading-snug cursor-pointer mb-2"
        >
          {task.title}
        </h4>

        {/* Thumbnail preview if any */}
        {task.imageBase64 && (
          <div className="mb-2 rounded-lg overflow-hidden border border-slate-200 max-h-28 bg-slate-50 flex items-center justify-center">
            <img
              src={task.imageBase64}
              alt="Вложение"
              className="w-full h-24 object-cover rounded"
            />
          </div>
        )}

        {/* Short description preview */}
        {task.description && (
          <p className="text-[11px] text-slate-600 line-clamp-2 mb-2 leading-relaxed whitespace-pre-line">
            {task.description}
          </p>
        )}

        {/* Checklist snippet */}
        {checklistItems.length > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-700 mb-2 bg-slate-50 px-2 py-1 rounded border border-slate-200">
            <CheckSquare className="w-3 h-3 text-emerald-600" />
            <span>
              Чек-лист: {checkedCount}/{checklistItems.length}
            </span>
          </div>
        )}

        {/* Executors */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mb-2">
          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">
            <span className="text-slate-400">Исполнители: </span>
            <span className="font-semibold text-slate-700">{task.executors || 'Не назначен'}</span>
          </span>
        </div>
      </div>

      {/* Footer bar: Files count & Action Link */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors">
          <Paperclip className="w-3.5 h-3.5" />
          <span>Файлы ({task.imageBase64 ? '1' : '0'})</span>
        </div>

        {onStatusChange && (
          <div>
            {!isAccepted && !isDone && (
              <button
                type="button"
                onClick={() => onStatusChange(task.id, 'В работе')}
                className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>Принять</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            {isAccepted && !isDone && (
              <button
                type="button"
                onClick={() => onStatusChange(task.id, 'Выполнено')}
                className="text-sky-700 hover:text-sky-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>Завершить</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            {isDone && (
              <span className="text-emerald-600 font-bold">Выполнено ✓</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
