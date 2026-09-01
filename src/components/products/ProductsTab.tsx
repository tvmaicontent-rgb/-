import React, { useState, useEffect } from 'react';
import { DepartmentType, FileGroupSummary, ProductItem } from '../../types';
import { storageService } from '../../services/storageService';
import { googleSheetsService } from '../../services/googleSheetsService';
import { SPREADSHEET_URL, KAM_SPREADSHEET_URL } from '../../constants';
import { ProductUploadZone } from './ProductUploadZone';
import { StatusActionsBar } from './StatusActionsBar';
import { GroupsRegistry } from './GroupsRegistry';
import { TakeInWorkModal } from '../modals/TakeInWorkModal';
import { PauseModal } from '../modals/PauseModal';
import { UnpauseModal } from '../modals/UnpauseModal';
import { CompleteModal } from '../modals/CompleteModal';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { ContactsModal } from '../modals/ContactsModal';
import { NewProductsModal } from '../modals/NewProductsModal';
import { ExternalLink, Layers, RefreshCw } from 'lucide-react';

export const ProductsTab: React.FC = () => {
  const [department, setDepartment] = useState<DepartmentType>('Отдел контента');
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [summaries, setSummaries] = useState<FileGroupSummary[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals state
  const [isTakeInWorkOpen, setIsTakeInWorkOpen] = useState(false);
  const [isPauseOpen, setIsPauseOpen] = useState(false);
  const [isUnpauseOpen, setIsUnpauseOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [isNewProductsOpen, setIsNewProductsOpen] = useState(false);

  const loadData = () => {
    const allProducts = storageService.getProducts();
    setProducts(allProducts);
    const calculatedSummaries = storageService.buildFileSummaries(allProducts, department);
    setSummaries(calculatedSummaries);
  };

  const handleSyncFromSheets = async () => {
    setIsSyncing(true);
    try {
      await googleSheetsService.syncAll();
      loadData();
    } catch (e) {
      console.error('Manual sync error in ProductsTab:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = storageService.subscribe(loadData);
    return () => unsub();
  }, [department]);

  return (
    <div className="space-y-6">
      {/* Department Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Рабочий отдел
            </h2>
            <p className="text-xs font-semibold text-slate-900">
              {department}
            </p>
          </div>
        </div>

        <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200/80">
          <button
            type="button"
            onClick={() => setDepartment('Отдел контента')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              department === 'Отдел контента'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🎨 Отдел контента
          </button>
          <button
            type="button"
            onClick={() => setDepartment('Коммерческий отдел')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              department === 'Коммерческий отдел'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            💼 Коммерческий отдел (КАМ)
          </button>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleSyncFromSheets}
            disabled={isSyncing}
            className={`px-3 py-1.5 border rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isSyncing
                ? 'bg-sky-50 text-sky-700 border-sky-200 cursor-not-allowed'
                : 'bg-sky-600 hover:bg-sky-700 text-white border-sky-700 shadow-xs'
            }`}
            title="Выгрузить данные из Google Таблицы в приложение"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Синхронизация...' : 'Выгрузить из таблицы'}</span>
          </button>

          <button
            type="button"
            onClick={loadData}
            className="px-3 py-1.5 text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Обновить локальные данные"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Обновить</span>
          </button>
        </div>
      </div>

      {/* Top 3 Control Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-1">
          <ProductUploadZone department={department} onUploadSuccess={loadData} />
        </div>
        <div className="md:col-span-2">
          <StatusActionsBar
            onOpenTakeInWork={() => setIsTakeInWorkOpen(true)}
            onOpenPause={() => setIsPauseOpen(true)}
            onOpenUnpause={() => setIsUnpauseOpen(true)}
            onOpenComplete={() => setIsCompleteOpen(true)}
            onOpenAnalytics={() => setIsAnalyticsOpen(true)}
            onOpenContacts={() => setIsContactsOpen(true)}
            onOpenNewProducts={() => setIsNewProductsOpen(true)}
          />
        </div>
      </div>

      {/* Groups Registry with Subtabs */}
      <GroupsRegistry department={department} summaries={summaries} />

      {/* Google Sheets external links */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <a
          href={SPREADSHEET_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition-colors"
        >
          <span>Google Таблица: Контент</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
        </a>
        <a
          href={KAM_SPREADSHEET_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition-colors"
        >
          <span>Google Таблица: КАМ</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
        </a>
      </div>

      {/* Modals */}
      <TakeInWorkModal
        isOpen={isTakeInWorkOpen}
        onClose={() => setIsTakeInWorkOpen(false)}
        department={department}
        summaries={summaries}
        onSuccess={loadData}
      />
      <PauseModal
        isOpen={isPauseOpen}
        onClose={() => setIsPauseOpen(false)}
        department={department}
        summaries={summaries}
        onSuccess={loadData}
      />
      <UnpauseModal
        isOpen={isUnpauseOpen}
        onClose={() => setIsUnpauseOpen(false)}
        department={department}
        summaries={summaries}
        onSuccess={loadData}
      />
      <CompleteModal
        isOpen={isCompleteOpen}
        onClose={() => setIsCompleteOpen(false)}
        department={department}
        summaries={summaries}
        onSuccess={loadData}
      />
      <AnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
      />
      <ContactsModal
        isOpen={isContactsOpen}
        onClose={() => setIsContactsOpen(false)}
      />
      <NewProductsModal
        isOpen={isNewProductsOpen}
        onClose={() => setIsNewProductsOpen(false)}
      />
    </div>
  );
};
