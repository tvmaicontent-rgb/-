import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { FileGroupSummary, DepartmentType } from '../../types';
import { formatCurrentDate } from '../../constants';
import { storageService } from '../../services/storageService';
import { CheckCircle2, CheckSquare, Square } from 'lucide-react';

interface CompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: DepartmentType;
  summaries: FileGroupSummary[];
  onSuccess: () => void;
}

export const CompleteModal: React.FC<CompleteModalProps> = ({
  isOpen,
  onClose,
  department,
  summaries,
  onSuccess,
}) => {
  const inWorkFiles = summaries.filter(s => s.groupStatus === '🔄 В работе');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
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

    const nowStr = formatCurrentDate(true);
    storageService.updateProductsStatus(selectedFiles, department, {
      status: 'Выполнено',
      dateCompleted: nowStr,
      dateFinished: nowStr,
    });

    onSuccess();
    onClose();
    setSelectedFiles([]);
    setError('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="✅ Завершить работу по файлам">
      {inWorkFiles.length === 0 ? (
        <div className="py-8 text-center text-slate-500">
          <p>Нет файлов в работе для завершения.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              Выберите файлы в работе для завершения ({selectedFiles.length} из {inWorkFiles.length}):
            </span>
            <button
              type="button"
              onClick={selectAll}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
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
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
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
              className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" /> Завершить
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
