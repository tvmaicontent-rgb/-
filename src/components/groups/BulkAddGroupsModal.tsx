import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { storageService } from '../../services/storageService';
import { MANAGERS_LIST } from '../../constants';
import { PlusCircle, Sparkles, User } from 'lucide-react';

interface BulkAddGroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkAddGroupsModal: React.FC<BulkAddGroupsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedManager, setSelectedManager] = useState<string>('auto');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) {
      setStatusMsg({ type: 'error', text: 'Поле ввода пустое!' });
      return;
    }

    // Split by newlines, commas, semicolons
    const rawList = inputText
      .replace(/;/g, '\n')
      .replace(/,/g, '\n')
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    // Unique preservation
    const uniqueGroups: string[] = Array.from(new Set(rawList));

    if (uniqueGroups.length === 0) {
      setStatusMsg({ type: 'error', text: 'Не удалось распознать ни одной группы.' });
      return;
    }

    const addedCount = storageService.bulkAddCategoryGroups(uniqueGroups, selectedManager);
    setStatusMsg({ type: 'success', text: `Успешно добавлено групп: ${addedCount}` });
    setInputText('');
    onSuccess();

    setTimeout(() => {
      setStatusMsg(null);
      onClose();
    }, 1200);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📦 Массовое добавление групп на открытие" maxWidth="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Категорийный менеджер (из списка):
          </label>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedManager}
              onChange={e => setSelectedManager(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-800"
            >
              <option value="auto">✨ Автоопределение по разделу каталога</option>
              {MANAGERS_LIST.map(m => (
                <option key={m.code} value={m.name}>
                  {m.name} (код {m.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Список групп (вводите каждую с новой строки или через запятую):
          </label>
          <textarea
            rows={7}
            placeholder={`Интерьерный свет\nУличные светильники\nТрековые системы, Светодиодные ленты`}
            value={inputText}
            onChange={e => {
              setInputText(e.target.value);
              setStatusMsg(null);
            }}
            className="w-full p-3 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Дубликаты и пустые строки фильтруются автоматически. Статус установится в &quot;На открытие&quot;.</span>
        </div>

        {statusMsg && (
          <div
            className={`p-2.5 rounded-lg text-xs font-medium ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {statusMsg.text}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Отмена
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Добавить все группы
          </button>
        </div>
      </form>
    </Modal>
  );
};
