import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { FileGroupSummary, DepartmentType } from '../../types';
import { storageService } from '../../services/storageService';
import { Play, CheckSquare, Square } from 'lucide-react';

interface UnpauseModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: DepartmentType;
  summaries: FileGroupSummary[];
  onSuccess: () => void;
}

export const UnpauseModal: React.FC<UnpauseModalProps> = ({
  isOpen,
  onClose,
  department,
  summaries,
  onSuccess,
}) => {
  const pausedFiles = summaries.filter(s => s.groupStatus === '⏸️ На паузе');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [error, setError] = useState('');

  const toggleFile = (fileName: string) => {
    setSelectedFiles(prev =>
      prev.includes(fileName) ? prev.filter(f => f !== fileName) : [...prev, fileName]
    );
  };

  const selectAll = () => {
    if (selectedFiles.length === pausedFiles.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(pausedFiles.map(f => f.fileName));
    }
  };

  const handleSave = () => {
    if (selectedFiles.length === 0) {
      setError('Отметьте хотя бы один файл!');
      return;
    }

    storageService.updateProductsStatus(selectedFiles, department, {
      status: 'В работе',
      pauseReason: '',
      pauseDate: '',
    });

    onSuccess();
    onClose();
    setSelectedFiles([]);
    setError('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="▶️ Снять файлы с паузы">
      {pausedFiles.length === 0 ? (
        <div className="py-8 text-center text-slate-500">
          <p>Нет файлов на паузе.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              Выберите файлы для возобновления работы ({selectedFiles.length} из {pausedFiles.length}):
            </span>
            <button
              type="button"
              onClick={selectAll}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              {selectedFiles.length === pausedFiles.length ? (
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
            {pausedFiles.map(item => {
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
                      <div className="text-xs text-amber-700">
                        Причина: {item.pauseReason || 'не указана'}
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
              <Play className="w-4 h-4" /> Вернуть в работу
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
