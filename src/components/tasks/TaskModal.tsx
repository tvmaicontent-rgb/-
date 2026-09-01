import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { TaskItem, TaskStatus, TaskUrgency } from '../../types';
import { Save, Trash2, Image as ImageIcon, X, AlertCircle } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit: TaskItem | null;
  onSave: (taskData: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (id: string, updates: Partial<TaskItem>) => void;
  onDelete: (id: string) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  taskToEdit,
  onSave,
  onUpdate,
  onDelete,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [executors, setExecutors] = useState('');
  const [status, setStatus] = useState<TaskStatus>('Новая');
  const [urgency, setUrgency] = useState<TaskUrgency>('Текущая задача');
  const [imageBase64, setImageBase64] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title || '');
      setDescription(taskToEdit.description || '');
      setExecutors(taskToEdit.executors || '');
      setStatus(taskToEdit.status || 'Новая');
      setUrgency(taskToEdit.urgency || 'Текущая задача');
      setImageBase64(taskToEdit.imageBase64 || '');
      setError('');
    } else {
      setTitle('');
      setDescription('');
      setExecutors('');
      setStatus('Новая');
      setUrgency('Текущая задача');
      setImageBase64('');
      setError('');
    }
  }, [taskToEdit, isOpen]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageBase64('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Заполните поле "Тема задачи"!');
      return;
    }
    if (!executors.trim()) {
      setError('Укажите хотя бы одного исполнителя!');
      return;
    }

    const cleanExecs = executors
      .split(',')
      .map(e => e.trim())
      .filter(Boolean)
      .join(', ');

    if (taskToEdit) {
      onUpdate(taskToEdit.id, {
        title: title.trim(),
        description: description.trim(),
        executors: cleanExecs,
        status,
        urgency,
        imageBase64,
      });
    } else {
      onSave({
        title: title.trim(),
        description: description.trim(),
        executors: cleanExecs,
        status,
        urgency,
        imageBase64,
      });
    }

    onClose();
  };

  const handleDelete = () => {
    if (taskToEdit && confirm('Вы действительно хотите удалить эту задачу?')) {
      onDelete(taskToEdit.id);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={taskToEdit ? `Карточка задачи (KB-${taskToEdit.id})` : 'Создать новую задачу'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Тема задачи *</label>
          <input
            type="text"
            placeholder="Введите краткое название задачи"
            value={title}
            onChange={e => {
              setTitle(e.target.value);
              setError('');
            }}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 font-medium"
            required
          />
        </div>

        {/* Urgency and Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Срочность:</label>
            <select
              value={urgency}
              onChange={e => setUrgency(e.target.value as TaskUrgency)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="Текущая задача">Текущая задача</option>
              <option value="Срочно">Срочно</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Статус:</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as TaskStatus)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="Новая">Новая (TO DO)</option>
              <option value="В работе">В работе (IN PROGRESS)</option>
              <option value="Завершена">Завершена (DONE)</option>
            </select>
          </div>
        </div>

        {/* Executors */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Исполнитель(и) * <span className="font-normal text-slate-400 font-mono text-[11px]">(через запятую)</span>
          </label>
          <input
            type="text"
            placeholder="Например: Анна Ковалева, Иван Сергеев"
            value={executors}
            onChange={e => {
              setExecutors(e.target.value);
              setError('');
            }}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        {/* Description with Markdown checklist instructions */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-xs font-semibold text-slate-700">Описание задачи</label>
            <span className="text-[11px] font-mono text-slate-400">Поддерживает чекбоксы: - [ ] пункт</span>
          </div>
          <textarea
            rows={4}
            placeholder={`- [ ] Проверить фото\n- [ ] Заполнить характеристики\nПодробности...`}
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full p-3 text-xs font-mono border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Image upload / preview */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-slate-500" />
            Прикрепить изображение
          </label>

          {imageBase64 ? (
            <div className="relative inline-block border border-slate-200 rounded-lg overflow-hidden p-1 bg-slate-50">
              <img src={imageBase64} alt="Предпросмотр" className="h-32 object-contain rounded" />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 p-1 bg-slate-900/70 hover:bg-rose-600 text-white rounded-full transition-colors"
                title="Удалить фото"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center p-3 border border-dashed border-slate-300 hover:border-indigo-400 rounded-lg cursor-pointer text-xs text-slate-600 hover:bg-slate-50 transition-colors">
              <span className="flex items-center gap-2 font-mono text-[11px]">
                <ImageIcon className="w-4 h-4 text-indigo-500" />
                Выберите изображение (PNG, JPG, WebP)
              </span>
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          )}
        </div>

        {error && (
          <div className="p-2.5 rounded-md text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          {taskToEdit ? (
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-md border border-rose-200 flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Удалить задачу
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Save className="w-4 h-4" />
              {taskToEdit ? 'Сохранить изменения' : 'Создать задачу'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
