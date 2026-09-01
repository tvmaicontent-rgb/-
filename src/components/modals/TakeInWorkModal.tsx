import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { FileGroupSummary, DepartmentType } from '../../types';
import { formatCurrentDate } from '../../constants';
import { storageService } from '../../services/storageService';
import { Play, CheckSquare, Square, User } from 'lucide-react';

interface TakeInWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: DepartmentType;
  summaries: FileGroupSummary[];
  onSuccess: () => void;
}

export const TakeInWorkModal: React.FC<TakeInWorkModalProps> = ({
  isOpen,
  onClose,
  department,
  summaries,
  onSuccess,
}) => {
  const newFiles = summaries.filter(s => s.groupStatus === '🆕 Новый');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [executorName, setExecutorName] = useState('');
  const [error, setError] = useState('');

  const toggleFile = (fileName: string) => {
    setSelectedFiles(prev =>
      prev.includes(fileName) ? prev.filter(f => f !== fileName) : [...prev, fileName]
    );
  };

  const selectAll = () => {
    if (selectedFiles.length === newFiles.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(newFiles.map(f => f.fileName));
    }
  };

  const handleSave = () => {
    if (selectedFiles.length === 0) {
      setError('Отметьте хотя бы один файл!');
      return;
    }
    if (!executorName.trim()) {
      setError('Укажите имя исполнителя!');
      return;
    }

    const nowStr = formatCurrentDate(true);
    storageService.updateProductsStatus(selectedFiles, department, {
      status: 'В работе',
      executor: executorName.trim(),
      dateTaken: nowStr,
      dateCompleted: '',
      dateFinished: '',
      pauseReason: '',
      pauseDate: '',
    });

    onSuccess();
    onClose();
    setSelectedFiles([]);
    setExecutorName('');
    setError('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="▶️ Взять файлы в работу">
      {newFiles.length === 0 ? (
        <div className="py-8 text-center text-slate-500">
          <p>Нет новых файлов для взятия в работу.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              Выберите новые файлы ({selectedFiles.length} из {newFiles.length}):
            </span>
            <button
              type="button"
              onClick={selectAll}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              {selectedFiles.length === newFiles.length ? (
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
            {newFiles.map(item => {
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
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-sm font-medium text-slate-800">{item.fileName}</div>
                      <div className="text-xs text-slate-500">{item.group3}</div>
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
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-400" />
              Имя исполнителя *
            </label>
            <input
              type="text"
              placeholder="Например: Анна Ковалева"
              value={executorName}
              onChange={e => {
                setExecutorName(e.target.value);
                setError('');
              }}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Play className="w-4 h-4" /> В работу
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
