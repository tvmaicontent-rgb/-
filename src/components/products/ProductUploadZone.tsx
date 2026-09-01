import React, { useState } from 'react';
import { DepartmentType } from '../../types';
import { parseExcelProductFile } from '../../services/excelService';
import { storageService } from '../../services/storageService';
import { googleSheetsService } from '../../services/googleSheetsService';
import { formatCurrentDate } from '../../constants';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface ProductUploadZoneProps {
  department: DepartmentType;
  onUploadSuccess: () => void;
}

export const ProductUploadZone: React.FC<ProductUploadZoneProps> = ({
  department,
  onUploadSuccess,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null);

  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
      setStatusMessage(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = (Array.from(e.dataTransfer.files) as File[]).filter(
        f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
      );
      if (droppedFiles.length > 0) {
        setSelectedFiles(droppedFiles);
        setStatusMessage(null);
      } else {
        setStatusMessage({
          type: 'error',
          text: 'Пожалуйста, перетащите файлы формата .xlsx или .xls',
        });
      }
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setProgress(10);
    setStatusMessage({ type: 'info', text: `Чтение файлов (0/${selectedFiles.length})...` });

    try {
      const nowStr = formatCurrentDate(true);
      const allNewProducts = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setStatusMessage({
          type: 'info',
          text: `Обработка: ${file.name} (${i + 1}/${selectedFiles.length})`,
        });

        const parsed = await parseExcelProductFile(file, department, nowStr);
        allNewProducts.push(...parsed);

        setProgress(10 + Math.floor(((i + 1) / selectedFiles.length) * 60));
      }

      if (allNewProducts.length > 0) {
        // Save to local storage (IndexedDB)
        storageService.addProducts(allNewProducts);
        setProgress(75);

        // If Webhook is set up, sync to Google Sheets immediately
        const hasWebhook = Boolean(googleSheetsService.getWebhookUrl());
        if (hasWebhook) {
          setStatusMessage({
            type: 'info',
            text: `Запись ${allNewProducts.length} SKU в Google Таблицу (лист «${department}»)...`,
          });
          setProgress(85);

          const pushRes = await googleSheetsService.pushDepartmentProducts(department, allNewProducts);
          setProgress(100);

          if (pushRes.success) {
            setStatusMessage({
              type: 'success',
              text: `Успешно загружено ${selectedFiles.length} файлов (${allNewProducts.length} SKU) и записано в Google Таблицу!`,
            });
          } else {
            setStatusMessage({
              type: 'info',
              text: `Сохранено в базе: ${selectedFiles.length} файлов (${allNewProducts.length} SKU). Google Sheets Webhook: ${pushRes.message}. Вы можете повторить отправку из Реестра файлов.`,
            });
          }
        } else {
          setProgress(100);
          setStatusMessage({
            type: 'success',
            text: `Успешно загружено: ${selectedFiles.length} файлов (${allNewProducts.length} SKU) в локальную базу. Настройте Webhook для автоматической записи в Google Таблицу.`,
          });
        }

        setSelectedFiles([]);
        onUploadSuccess();
      } else {
        setStatusMessage({
          type: 'error',
          text: 'Не найдено подходящих строк с кодами товаров в файлах.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Ошибка при обработке файлов: ${err.message || err}`,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
            1. Загрузка файлов ({department})
          </h3>
        </div>

        <div className="space-y-3">
          <label
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors text-center ${
              isDragOver
                ? 'border-indigo-600 bg-indigo-50/50'
                : 'border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-indigo-50/20'
            }`}
          >
            <FileSpreadsheet className="w-8 h-8 text-indigo-500 mb-1.5" />
            <span className="text-xs font-semibold text-slate-800">
              {selectedFiles.length > 0
                ? `Выбрано файлов: ${selectedFiles.length}`
                : `Выберите .xlsx / .xls файлы`}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5">или перетащите их в эту область</span>
            <input
              type="file"
              multiple
              accept=".xlsx, .xls"
              onChange={handleFileSelection}
              disabled={isUploading}
              className="hidden"
            />
          </label>

          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <div className="max-h-24 overflow-y-auto text-[11px] font-mono text-slate-600 bg-slate-50 p-2.5 rounded-lg divide-y divide-slate-100 border border-slate-200">
                {selectedFiles.map((f, i) => (
                  <div key={i} className="py-1 truncate flex items-center justify-between">
                    <span>📄 {f.name}</span>
                    <span className="text-slate-400">{(f.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full py-2 px-3 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                {isUploading ? 'Загрузка...' : `Загрузить файлы (${selectedFiles.length})`}
              </button>
            </div>
          )}

          {isUploading && (
            <div className="space-y-1 pt-1">
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {statusMessage && (
            <div
              className={`p-2.5 rounded-lg text-xs font-mono flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : statusMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              ) : null}
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
