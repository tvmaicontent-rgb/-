import React from 'react';
import { Play, PauseCircle, CheckCircle2, RotateCcw, BarChart3, Contact, Package } from 'lucide-react';

interface StatusActionsBarProps {
  onOpenTakeInWork: () => void;
  onOpenPause: () => void;
  onOpenUnpause: () => void;
  onOpenComplete: () => void;
  onOpenAnalytics: () => void;
  onOpenContacts: () => void;
  onOpenNewProducts: () => void;
}

export const StatusActionsBar: React.FC<StatusActionsBarProps> = ({
  onOpenTakeInWork,
  onOpenPause,
  onOpenUnpause,
  onOpenComplete,
  onOpenAnalytics,
  onOpenContacts,
  onOpenNewProducts,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
      {/* 2. Управление статусами */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
              2. Управление статусами
            </h3>
          </div>
          <p className="text-xs text-slate-500 mb-3.5">
            Смена состояния партии товаров:
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={onOpenTakeInWork}
            className="p-3 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-200/80 flex flex-col items-center justify-center gap-1.5 transition-colors group shadow-2xs cursor-pointer"
          >
            <Play className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
            <span className="font-mono text-[11px]">В работу</span>
          </button>

          <button
            type="button"
            onClick={onOpenPause}
            className="p-3 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50/70 hover:bg-amber-100 border border-amber-200/80 flex flex-col items-center justify-center gap-1.5 transition-colors group shadow-2xs cursor-pointer"
          >
            <PauseCircle className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
            <span className="font-mono text-[11px]">На паузу</span>
          </button>

          <button
            type="button"
            onClick={onOpenUnpause}
            className="p-3 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50/70 hover:bg-blue-100 border border-blue-200/80 flex flex-col items-center justify-center gap-1.5 transition-colors group shadow-2xs cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
            <span className="font-mono text-[11px]">Снять паузу</span>
          </button>

          <button
            type="button"
            onClick={onOpenComplete}
            className="p-3 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200/80 flex flex-col items-center justify-center gap-1.5 transition-colors group shadow-2xs cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
            <span className="font-mono text-[11px]">Завершить</span>
          </button>
        </div>
      </div>

      {/* 3. Дополнительная информация */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
              3. Отчеты и справочники
            </h3>
          </div>
          <p className="text-xs text-slate-500 mb-3.5">
            Аналитика, реестр поставщиков и новые SKU:
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={onOpenAnalytics}
            className="p-3 rounded-lg text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 flex flex-col items-center justify-center gap-1.5 transition-colors group shadow-2xs"
          >
            <BarChart3 className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
            <span className="font-mono text-[11px]">Аналитика</span>
          </button>

          <button
            type="button"
            onClick={onOpenContacts}
            className="p-3 rounded-lg text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 flex flex-col items-center justify-center gap-1.5 transition-colors group shadow-2xs"
          >
            <Contact className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
            <span className="font-mono text-[11px]">Контакты</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewProducts}
            className="p-3 rounded-lg text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 flex flex-col items-center justify-center gap-1.5 transition-colors group shadow-2xs"
          >
            <Package className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
            <span className="font-mono text-[11px]">Новые SKU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
