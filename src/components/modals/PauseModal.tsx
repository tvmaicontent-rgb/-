import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { FileGroupSummary, DepartmentType } from '../../types';
import { formatCurrentDate } from '../../constants';
import { storageService } from '../../services/storageService';
import { PauseCircle, CheckSquare, Square } from 'lucide-react';

interface PauseModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: DepartmentType;
  summaries: FileGroupSummary[];
  onSuccess: () => void;
}

const PAUSE_REASONS = [
  'информация уточняется',
  'запрошено у поставщика',
  'ожидаются недостающие характеристики',
  'ошибка в артикулах / кодах',
  'другое',
];

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  onClose,
  department,
  summaries,
  onSuccess,
}) => {
  const inWorkFiles = summaries.filter(s => s.groupStatus === '🔄 В работе');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [reason, setReason] = useState(PAUSE_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [error, setError] = useState('');

  const toggleFile = (fileName: string) => {
    setSelectedFiles(prev =>
      prev.includes(fileName) ? prev.filter(f => f !== fileName) : [...prev, fileName]
    );
  };

  const selectAll = () => {
    if (selectedFiles.length === inWorkFiles.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(inWorkFiles.map(f => f.fileName));
    }
  };

  const handleSave = () => {
    if (selectedFiles.length === 0) {
      setError('Отметьте хотя бы один файл!');
      return;
    }

    const finalReason = reason === 'другое' ? customReason.trim() || 'Причина не указана' : reason;
    const nowStr = formatCurrentDate(true);

    storageService.updateProductsStatus(selectedFiles, department, {
      status: 'Пауза',
      pauseReason: finalReason,
      pauseDate: nowStr,
    });

    onSuccess();
    onClose();
    setSelectedFiles([]);
    setError('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="⏸️ Поставить файлы на паузу">
      {inWorkFiles.length === 0 ? (
        <div className="py-8 text-center text-slate-500">
          <p>Нет файлов в работе для отправки на паузу.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              Выберите файлы в работе ({selectedFiles.length} из {inWorkFiles.length}):
            </span>
            <button
              type="button"
              onClick={selectAll}
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              {selectedFiles.length === inWorkFiles.length ? (
                <>
                  <Square className="w-3.5 h-3.5" /> Снять все
                </>
              ) : (
                <>
                  <CheckSquare className="w-3.5 h-3.5" /> Выбрать все
                </>
              )}
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-slate-50/50">
            {inWorkFiles.map(item => {
              const isChecked = selectedFiles.includes(item.fileName);
              return (
                <label
                  key={item.fileName}
                  className="flex items-center justify-between p-3 hover:bg-slate-100/80 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleFile(item.fileName)}
                      className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <div className="text-sm font-medium text-slate-800">{item.fileName}</div>
                      <div className="text-xs text-slate-500">
                        {item.group3} • Исполнитель: {item.executor || 'Не указан'}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    {item.totalProducts} SKU
                  </span>
                </label>
              );
            })}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Укажите причину паузы:
            </label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            >
              {PAUSE_REASONS.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            {reason === 'другое' && (
              <input
                type="text"
                placeholder="Введите свою причину"
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                className="mt-2 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            )}
          </div>

          {error && <div className="p-3 text-xs text-rose-700 bg-rose-50 rounded-lg">{error}</div>}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <PauseCircle className="w-4 h-4" /> Поставить на паузу
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
