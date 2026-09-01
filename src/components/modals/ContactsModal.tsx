import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { SupplierContact } from '../../types';
import { storageService } from '../../services/storageService';
import { googleSheetsService } from '../../services/googleSheetsService';
import { CONTACTS_SPREADSHEET_URL } from '../../constants';
import { exportToExcel } from '../../services/excelService';
import { SortHeader } from '../common/SortHeader';
import { SortConfig, sortData } from '../../utils/sortUtils';
import { safeErrorMessage } from '../../utils/errorUtils';
import { Search, Plus, Save, Trash2, Download, ExternalLink, RefreshCw, CheckCircle2 } from 'lucide-react';

interface ContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactsModal: React.FC<ContactsModalProps> = ({ isOpen, onClose }) => {
  const [contacts, setContacts] = useState<SupplierContact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig<SupplierContact>>({
    key: '',
    direction: null,
  });

  // Form states
  const [producer, setProducer] = useState('');
  const [site, setSite] = useState('');
  const [contact, setContact] = useState('');
  const [name, setName] = useState('');
  const [productGroups, setProductGroups] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const loadData = () => {
    setContacts(storageService.getContacts());
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setSaveSuccessMsg('');
      const unsub = storageService.subscribe(loadData);
      return () => unsub();
    }
  }, [isOpen]);

  const handleSyncFromSheets = async () => {
    setIsSyncing(true);
    setSyncStatus('Загрузка контактов из Google Sheets...');
    const res = await googleSheetsService.syncAll();
    setIsSyncing(false);
    if (res.success) {
      loadData();
      setSyncStatus(`Синхронизировано ${res.contactsCount || storageService.getContacts().length} контактов!`);
      setTimeout(() => setSyncStatus(null), 4000);
    } else {
      setSyncStatus(`Ошибка: ${safeErrorMessage(res.error, 'не удалось синхронизировать')}`);
      setTimeout(() => setSyncStatus(null), 5000);
    }
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key: '', direction: null };
        return { key, direction: 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!producer.trim() && !name.trim()) {
      setFormError("Укажите хотя бы 'Производитель' или 'Имя'!");
      return;
    }

    storageService.addContact({
      producer: producer.trim(),
      site: site.trim(),
      contact: contact.trim(),
      name: name.trim(),
      productGroups: productGroups.trim(),
      note: note.trim(),
    });

    setProducer('');
    setSite('');
    setContact('');
    setName('');
    setProductGroups('');
    setNote('');
    setFormError('');
    setShowAddForm(false);
    setSaveSuccessMsg('Контакт успешно добавлен!');
    loadData();
  };

  const handleCellChange = (id: string, field: keyof SupplierContact, value: string) => {
    setContacts(prev =>
      prev.map(c => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleSaveAll = () => {
    storageService.saveContacts(contacts);
    setSaveSuccessMsg('Все изменения сохранены!');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleDelete = (id: string) => {
    const updated = contacts.filter(c => c.id !== id);
    setContacts(updated);
    storageService.saveContacts(updated);
  };

  const handleExport = () => {
    const exportData = contacts.map(c => ({
      'Производитель': c.producer,
      'Оф.сайт': c.site,
      'Контакт': c.contact,
      'Имя': c.name,
      'Группы товаров': c.productGroups,
      'Примечание': c.note,
    }));
    exportToExcel(exportData, 'Контакты_поставщиков.xlsx', 'Контакты');
  };

  const filteredContacts = contacts.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.producer.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.contact.toLowerCase().includes(q) ||
      c.productGroups.toLowerCase().includes(q) ||
      c.note.toLowerCase().includes(q) ||
      c.site.toLowerCase().includes(q)
    );
  });

  const sortedContacts: SupplierContact[] = sortData<SupplierContact>(filteredContacts, sortConfig);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📇 Контакты поставщиков" maxWidth="6xl">
      <div className="space-y-4">
        {/* Top toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Быстрый поиск по поставщикам, именам, группам..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={handleSyncFromSheets}
              disabled={isSyncing}
              className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border ${
                isSyncing
                  ? 'bg-sky-50 text-sky-500 border-sky-200 cursor-not-allowed'
                  : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-200'
              }`}
              title="Загрузить контакты напрямую из Google Таблицы"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Загрузка...' : 'Синхронизация'}</span>
            </button>
            <a
              href={CONTACTS_SPREADSHEET_URL}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1 transition-colors"
              title="Открыть лист контактов в Google Таблице"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>Google Sheet</span>
            </a>
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              {showAddForm ? 'Скрыть форму' : 'Добавить контакт'}
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
              title="Экспорт в Excel"
            >
              <Download className="w-3.5 h-3.5" />
              Экспорт
            </button>
          </div>
        </div>

        {/* Sync Status Banner */}
        {syncStatus && (
          <div className="p-2.5 text-xs font-medium text-sky-900 bg-sky-50 border border-sky-200 rounded-lg flex items-center gap-2 animate-fadeIn">
            {syncStatus.startsWith('Ошибка') ? (
              <span className="text-rose-600 font-bold">⚠️</span>
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{syncStatus}</span>
          </div>
        )}

        {/* Add Contact Accordion/Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddSubmit}
            className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
          >
            <div className="text-sm font-semibold text-slate-800">➕ Новый контакт поставщика</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Производитель</label>
                <input
                  type="text"
                  placeholder="Название компании"
                  value={producer}
                  onChange={e => setProducer(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Оф. сайт</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={site}
                  onChange={e => setSite(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Контакт (Тел/Email)</label>
                <input
                  type="text"
                  placeholder="+7 / mail@..."
                  value={contact}
                  onChange={e => setContact(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Контактное лицо</label>
                <input
                  type="text"
                  placeholder="Имя представителя"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Группы товаров</label>
                <input
                  type="text"
                  placeholder="Категории"
                  value={productGroups}
                  onChange={e => setProductGroups(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Примечание</label>
                <input
                  type="text"
                  placeholder="Доп. детали"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>

            {formError && <div className="text-xs text-rose-600 font-medium">{formError}</div>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs"
              >
                Сохранить контакт
              </button>
            </div>
          </form>
        )}

        {saveSuccessMsg && (
          <div className="p-2.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
            {saveSuccessMsg}
          </div>
        )}

        {/* Contacts Editable Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[55vh] overflow-y-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-600 font-semibold uppercase sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5 min-w-[150px]">
                  <SortHeader
                    label="Производитель"
                    columnKey="producer"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-3 py-2.5 min-w-[150px]">
                  <SortHeader
                    label="Оф. сайт"
                    columnKey="site"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-3 py-2.5 min-w-[140px]">
                  <SortHeader
                    label="Контакт"
                    columnKey="contact"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-3 py-2.5 min-w-[140px]">
                  <SortHeader
                    label="Имя"
                    columnKey="name"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-3 py-2.5 min-w-[160px]">
                  <SortHeader
                    label="Группы товаров"
                    columnKey="productGroups"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-3 py-2.5 min-w-[160px]">
                  <SortHeader
                    label="Примечание"
                    columnKey="note"
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-2 py-2.5 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {sortedContacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Контакты не найдены.
                  </td>
                </tr>
              ) : (
                sortedContacts.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/70 group">
                    <td className="p-1.5">
                      <input
                        type="text"
                        value={item.producer}
                        onChange={e => handleCellChange(item.id, 'producer', e.target.value)}
                        className="w-full px-2 py-1 border border-transparent hover:border-slate-200 focus:border-blue-400 focus:bg-white rounded text-xs font-medium text-slate-900"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="text"
                        value={item.site}
                        onChange={e => handleCellChange(item.id, 'site', e.target.value)}
                        className="w-full px-2 py-1 border border-transparent hover:border-slate-200 focus:border-blue-400 focus:bg-white rounded text-xs text-blue-600"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="text"
                        value={item.contact}
                        onChange={e => handleCellChange(item.id, 'contact', e.target.value)}
                        className="w-full px-2 py-1 border border-transparent hover:border-slate-200 focus:border-blue-400 focus:bg-white rounded text-xs text-slate-700"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="text"
                        value={item.name}
                        onChange={e => handleCellChange(item.id, 'name', e.target.value)}
                        className="w-full px-2 py-1 border border-transparent hover:border-slate-200 focus:border-blue-400 focus:bg-white rounded text-xs text-slate-800 font-medium"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="text"
                        value={item.productGroups}
                        onChange={e => handleCellChange(item.id, 'productGroups', e.target.value)}
                        className="w-full px-2 py-1 border border-transparent hover:border-slate-200 focus:border-blue-400 focus:bg-white rounded text-xs text-slate-700"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="text"
                        value={item.note}
                        onChange={e => handleCellChange(item.id, 'note', e.target.value)}
                        className="w-full px-2 py-1 border border-transparent hover:border-slate-200 focus:border-blue-400 focus:bg-white rounded text-xs text-slate-500"
                      />
                    </td>
                    <td className="p-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1 text-slate-300 hover:text-rose-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Удалить строку"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-500">
            Всего контактов: {sortedContacts.length} (значения можно редактировать прямо в ячейках)
          </span>
          <button
            type="button"
            onClick={handleSaveAll}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Save className="w-4 h-4" />
            Сохранить изменения
          </button>
        </div>
      </div>
    </Modal>
  );
};
