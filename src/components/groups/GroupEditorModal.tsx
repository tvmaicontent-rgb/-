import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { CategoryGroup } from '../../types';
import { INITIAL_MATERIK_STATUS, INITIAL_PALAS_STATUS, MANAGERS_LIST, getManagerForCategory, getCategoryHierarchy } from '../../constants';
import { Save, User } from 'lucide-react';

interface GroupEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupToEdit: CategoryGroup | null;
  onSave: (group: Partial<CategoryGroup>) => void;
}

export const GroupEditorModal: React.FC<GroupEditorModalProps> = ({
  isOpen,
  onClose,
  groupToEdit,
  onSave,
}) => {
  const [group1, setGroup1] = useState('');
  const [group2, setGroup2] = useState('');
  const [group3, setGroup3] = useState('');
  const [manager, setManager] = useState('');
  const [includedMaterik, setIncludedMaterik] = useState('0');
  const [includedPalas, setIncludedPalas] = useState('0');
  const [skuCount, setSkuCount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [donorRequestDate, setDonorRequestDate] = useState('');
  const [donorReceivedDate, setDonorReceivedDate] = useState('');
  const [approvalSentDate, setApprovalSentDate] = useState('');
  const [approvalDate, setApprovalDate] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [palasAllocated, setPalasAllocated] = useState('');
  const [kamFile, setKamFile] = useState('');

  useEffect(() => {
    if (groupToEdit) {
      setGroup1(groupToEdit.group1 || '');
      setGroup2(groupToEdit.group2 || '');
      setGroup3(groupToEdit.group3 || '');
      setManager(groupToEdit.manager || '');
      setIncludedMaterik(groupToEdit.includedMaterik || '0');
      setIncludedPalas(groupToEdit.includedPalas || '0');
      setSkuCount(groupToEdit.skuCount || '');
      setStartDate(groupToEdit.startDate || '');
      setDonorRequestDate(groupToEdit.donorRequestDate || '');
      setDonorReceivedDate(groupToEdit.donorReceivedDate || '');
      setApprovalSentDate(groupToEdit.approvalSentDate || '');
      setApprovalDate(groupToEdit.approvalDate || '');
      setReleaseDate(groupToEdit.releaseDate || '');
      setPalasAllocated(groupToEdit.palasAllocated || '');
      setKamFile(groupToEdit.kamFile || '');
    } else {
      setGroup1('');
      setGroup2('');
      setGroup3('');
      setManager('');
      setIncludedMaterik('0');
      setIncludedPalas('0');
      setSkuCount('');
      setStartDate('');
      setDonorRequestDate('');
      setDonorReceivedDate('');
      setApprovalSentDate('');
      setApprovalDate('');
      setReleaseDate('');
      setPalasAllocated('');
      setKamFile('');
    }
  }, [groupToEdit, isOpen]);

  // Dynamic vlookup when typing group 3
  const handleGroup3Change = (val: string) => {
    setGroup3(val);
    const key = val.trim().toLowerCase();
    if (INITIAL_MATERIK_STATUS[key] !== undefined) {
      setIncludedMaterik(INITIAL_MATERIK_STATUS[key]);
    }
    if (INITIAL_PALAS_STATUS[key] !== undefined) {
      setIncludedPalas(INITIAL_PALAS_STATUS[key]);
    }
    if (val.trim()) {
      const hierarchy = getCategoryHierarchy(val);
      if (!group1 || group1 === 'Каталог' || group1 === 'На открытие') {
        setGroup1(hierarchy.group1);
      }
      if (!group2) {
        setGroup2(hierarchy.group2);
      }
    }
    if (!manager || manager === '—') {
      const autoMng = getManagerForCategory(val);
      if (autoMng) {
        setManager(autoMng);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      group1: group1.trim(),
      group2: group2.trim(),
      group3: group3.trim(),
      manager: manager.trim(),
      includedMaterik,
      includedPalas,
      skuCount: skuCount.trim(),
      startDate: startDate.trim(),
      donorRequestDate: donorRequestDate.trim(),
      donorReceivedDate: donorReceivedDate.trim(),
      approvalSentDate: approvalSentDate.trim(),
      approvalDate: approvalDate.trim(),
      releaseDate: releaseDate.trim(),
      palasAllocated: palasAllocated.trim(),
      kamFile: kamFile.trim(),
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={groupToEdit ? '✏️ Редактирование группы' : '➕ Добавление новой группы'}
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Group Hierarchy */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Группа 1</label>
            <input
              type="text"
              placeholder="Например: Освещение"
              value={group1}
              onChange={e => setGroup1(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Группа 2</label>
            <input
              type="text"
              placeholder="Например: Интерьерный свет"
              value={group2}
              onChange={e => setGroup2(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Группа 3 (ключевая) *</label>
            <input
              type="text"
              placeholder="Например: Люстры и подвесы"
              value={group3}
              onChange={e => handleGroup3Change(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
              required
            />
          </div>
        </div>

        {/* Row 2: Manager & Auto Statuses */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Менеджер (из списка)</label>
            <div className="flex gap-1.5">
              <select
                value={MANAGERS_LIST.some(m => m.name === manager) ? manager : (manager ? 'custom' : '')}
                onChange={e => {
                  if (e.target.value !== 'custom') {
                    setManager(e.target.value);
                  }
                }}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-800"
              >
                <option value="">— Выберите менеджера —</option>
                {MANAGERS_LIST.map(m => (
                  <option key={m.code} value={m.name}>
                    {m.name} (код {m.code})
                  </option>
                ))}
                {manager && !MANAGERS_LIST.some(m => m.name === manager) && (
                  <option value="custom">Другой: {manager}</option>
                )}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Включено Материк (авто)</label>
            <input
              type="text"
              value={includedMaterik}
              onChange={e => setIncludedMaterik(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 bg-slate-100 rounded-lg text-slate-700 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Включено Палас (авто)</label>
            <input
              type="text"
              value={includedPalas}
              onChange={e => setIncludedPalas(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 bg-slate-100 rounded-lg text-slate-700 font-mono"
            />
          </div>
        </div>

        {/* Row 3: SKU & Workflow Dates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Количество скю</label>
            <input
              type="text"
              placeholder="0"
              value={skuCount}
              onChange={e => setSkuCount(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Дата начала работ</label>
            <input
              type="text"
              placeholder="ДД.ММ.ГГГГ"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Отправка КМ запроса на сайты-доноры</label>
            <input
              type="text"
              placeholder="ДД.ММ.ГГГГ"
              value={donorRequestDate}
              onChange={e => setDonorRequestDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Row 4: Approval Dates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Дата получения сайтов доноров</label>
            <input
              type="text"
              placeholder="ДД.ММ.ГГГГ"
              value={donorReceivedDate}
              onChange={e => setDonorReceivedDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Дата отправки на согласование</label>
            <input
              type="text"
              placeholder="ДД.ММ.ГГГГ"
              value={approvalSentDate}
              onChange={e => setApprovalSentDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Дата согласования</label>
            <input
              type="text"
              placeholder="ДД.ММ.ГГГГ"
              value={approvalDate}
              onChange={e => setApprovalDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Row 5: Release, Palas and KAM */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Дата вывода на Материк (с товарами)</label>
            <input
              type="text"
              placeholder="ДД.ММ.ГГГГ"
              value={releaseDate}
              onChange={e => setReleaseDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Выделено на сайт Палас</label>
            <input
              type="text"
              placeholder="Да / Нет / В процессе"
              value={palasAllocated}
              onChange={e => setPalasAllocated(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Добавлено в файл КАМ</label>
            <input
              type="text"
              list="kamFileOptions"
              placeholder="Добавлено / Не добавлено / Только группа / Нет товаров"
              value={kamFile}
              onChange={e => setKamFile(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <datalist id="kamFileOptions">
              <option value="Добавлено" />
              <option value="Не добавлено" />
              <option value="Только группа" />
              <option value="Нет товаров" />
              <option value="В работе" />
            </datalist>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
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
            <Save className="w-3.5 h-3.5" />
            Сохранить
          </button>
        </div>
      </form>
    </Modal>
  );
};
