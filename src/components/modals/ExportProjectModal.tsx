import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Download, Github, Terminal, Globe, Check, Copy, FolderArchive, ArrowRight } from 'lucide-react';

interface ExportProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportProjectModal: React.FC<ExportProjectModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState<string | null>(null);

  const handleDownloadZip = () => {
    window.location.href = '/api/download-project-zip';
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const gitCommands = `git init
git add .
git commit -m "Initial project commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main --force`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📦 Экспорт и перенос проекта" maxWidth="2xl">
      <div className="space-y-6 text-slate-700 text-xs sm:text-sm">
        {/* Step 1: Download ZIP button */}
        <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-lg shadow-xs">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                Шаг 1. Скачать весь исходный код (ZIP-архив)
              </h4>
              <p className="text-xs text-slate-600">
                Полный комплект файлов: React 19, TypeScript, стили Tailwind, скрипты сборки и парсеры.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadZip}
            className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Скачать content-ops-project.zip</span>
          </button>
        </div>

        {/* Step 2: Upload to GitHub */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center gap-2.5">
            <Github className="w-5 h-5 text-slate-800" />
            <h4 className="font-bold text-slate-900 text-sm">
              Шаг 2. Загрузка в ваш репозиторий GitHub
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Way A: Web upload */}
            <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5">
              <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                Вариант А: Через браузер (без консоли)
              </div>
              <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1 leading-relaxed">
                <li>Распакуйте скачанный ZIP в папку на компьютере.</li>
                <li>Откройте ваш репозиторий на GitHub.</li>
                <li>Нажмите <b>Add file</b> → <b>Upload files</b>.</li>
                <li>Перетащите все файлы и папки из архива.</li>
                <li>Нажмите <b>Commit changes</b>.</li>
              </ol>
            </div>

            {/* Way B: Git CLI */}
            <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-emerald-600" />
                  Вариант Б: Через терминал Git
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(gitCommands, 'git')}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
                >
                  {copied === 'git' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied === 'git' ? 'Скопировано' : 'Копировать'}</span>
                </button>
              </div>
              <pre className="p-2 bg-slate-900 text-slate-100 rounded text-[10px] font-mono overflow-x-auto leading-tight">
                {gitCommands}
              </pre>
            </div>
          </div>
        </div>

        {/* Step 3: Run & Deploy */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-600" />
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
              Шаг 3. Запуск или публикация в интернете
            </h4>
          </div>
          <div className="text-xs text-slate-600 space-y-1 leading-relaxed">
            <p>
              • <b>Локальный запуск на ПК:</b> откройте папку проекта и выполните в терминале <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">npm install</code>, затем <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">npm run dev</code>.
            </p>
            <p>
              • <b>Бесплатная публикация по ссылке:</b> зайдите на <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-medium">Vercel.com</a>, нажмите <b>Add New Project</b> и выберите ваш GitHub репозиторий.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Понятно, закрыть
          </button>
        </div>
      </div>
    </Modal>
  );
};
