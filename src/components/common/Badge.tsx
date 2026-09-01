import React from 'react';
import { User, AlertCircle, Clock, CheckCircle2, PauseCircle, Sparkles } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const s = status.toLowerCase();

  if (s.includes('нов')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <Sparkles className="w-3 h-3 text-emerald-600" />
        {status}
      </span>
    );
  }

  if (s.includes('работ') || s.includes('progress')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
        <Clock className="w-3 h-3 text-indigo-600" />
        {status}
      </span>
    );
  }

  if (s.includes('пауз') || s.includes('pause')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <PauseCircle className="w-3 h-3 text-amber-600" />
        {status}
      </span>
    );
  }

  if (s.includes('выполн') || s.includes('заверш') || s.includes('done')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-300">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        {status}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
      {status}
    </span>
  );
};

interface UrgencyBadgeProps {
  urgency: string;
}

export const UrgencyBadge: React.FC<UrgencyBadgeProps> = ({ urgency }) => {
  if (urgency === 'Срочно') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
        <AlertCircle className="w-3 h-3 text-rose-600" />
        🔥 Срочно
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
      📋 Обычная
    </span>
  );
};

interface ExecutorBubblesProps {
  executorsStr: string;
}

export const ExecutorBubbles: React.FC<ExecutorBubblesProps> = ({ executorsStr }) => {
  if (!executorsStr || !executorsStr.trim()) {
    return <span className="text-xs text-slate-400 italic">Не назначены</span>;
  }

  const names = executorsStr.split(',').map(n => n.trim()).filter(Boolean);

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {names.map((name, idx) => (
        <span
          key={idx}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200"
        >
          <User className="w-3 h-3 text-indigo-600" />
          {name}
        </span>
      ))}
    </div>
  );
};
