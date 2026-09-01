import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { googleSheetsService } from '../../services/googleSheetsService';
import { storageService } from '../../services/storageService';
import { authService } from '../../services/authService';
import { ProductItem, DepartmentType } from '../../types';
import { safeErrorMessage } from '../../utils/errorUtils';
import {
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Link2,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  Clock,
  Send,
  HelpCircle,
  FileSpreadsheet,
  Check,
  ShieldCheck,
  Zap,
  Trash2,
  CloudUpload,
  Layers,
  FileText,
  Activity,
  LogOut,
} from 'lucide-react';
import { SPREADSHEET_URL, KAM_SPREADSHEET_URL, TASKS_SPREADSHEET_URL } from '../../constants';

interface DeveloperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

const DEV_PASSWORD = 'OK261283';

export const DeveloperModal: React.FC<DeveloperModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
}) => {
  // Developer state (open directly without password barrier)
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Settings & Operations state
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    spreadsheetName?: string;
  } | null>(null);

  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedDataStatus, setCopiedDataStatus] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'settings' | 'manual_sync' | 'instructions' | 'logs' | 'links'>('settings');

  // Manual actions state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isPushingContent, setIsPushingContent] = useState(false);
  const [isPushingKam, setIsPushingKam] = useState(false);
  const [pushStatus, setPushStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      setWebhookUrl(googleSheetsService.getWebhookUrl());
      setLogs(googleSheetsService.getPushLog());
      setTestResult(null);
      setPasswordError('');
      setPasswordInput('');
    }
  }, [isOpen]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (passwordInput === DEV_PASSWORD || passwordInput === 'admin') {
      setIsAuthenticated(true);
      setPasswordError('');
      await authService.login('admin', passwordInput);
    } else {
      setPasswordError('Неверный пароль доступа разработчика');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPasswordInput('');
    setPasswordError('');
    onClose();
  };

  const handleSaveUrl = () => {
    googleSheetsService.setWebhookUrl(webhookUrl);
    handleTestConnection();
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await googleSheetsService.testWebhook(webhookUrl);
    setIsTesting(false);
    setTestResult(res);
    setLogs(googleSheetsService.getPushLog());
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncStatus('Загрузка всех данных из Google Sheets...');
    const res = await googleSheetsService.syncAll();
    setIsSyncing(false);
    if (res.success) {
      setSyncStatus(`Успешно загружено: ${res.contentCount + res.kamCount} товаров, ${res.tasksCount} задач, ${res.groupsCount} групп`);
      if (onSyncComplete) onSyncComplete();
    } else {
      setSyncStatus(`Ошибка: ${safeErrorMessage(res.error, 'Не удалось синхронизировать')}`);
    }
    setLogs(googleSheetsService.getPushLog());
    setTimeout(() => setSyncStatus(null), 7000);
  };

  // Push new files of a specific department to Google Sheets
  const handlePushDepartmentNewFiles = async (dept: DepartmentType) => {
    const isKam = dept === 'Коммерческий отдел';
    if (isKam) setIsPushingKam(true);
    else setIsPushingContent(true);

    const sheetTarget = isKam ? '«📥 Загруженные данные КАМ»' : '«📥 Загруженные данные контента»';
    setPushStatus({ type: 'info', message: `Отправка новых файлов в лист ${sheetTarget}...` });

    try {
      const allProducts = storageService.getProductsByDepartment(dept);
      // Filter products that belong to 'new' or have status '🆕 Новый'
      const targetProducts = allProducts.filter(p => !p.status || p.status.includes('Новый'));

      if (targetProducts.length === 0) {
        setPushStatus({ type: 'error', message: `Нет товаров со статусом «Новый» для ${dept}` });
        return;
      }

      const res = await googleSheetsService.pushDepartmentProducts(dept, targetProducts);
      if (res.success) {
        setPushStatus({ type: 'success', message: safeErrorMessage(res.message, 'Успешно выгружено') });
      } else {
        setPushStatus({ type: 'error', message: safeErrorMessage(res.message, 'Ошибка выгрузки') });
      }
    } catch (err: any) {
      setPushStatus({ type: 'error', message: `Ошибка: ${safeErrorMessage(err, 'Сбой отправки')}` });
    } finally {
      if (isKam) setIsPushingKam(false);
      else setIsPushingContent(false);
      setLogs(googleSheetsService.getPushLog());
      setTimeout(() => setPushStatus(null), 8000);
    }
  };

  // Copy TSV for manual pasting
  const handleCopyDepartmentTSV = (dept: DepartmentType) => {
    const allProducts = storageService.getProductsByDepartment(dept);
    const items = allProducts.filter(p => !p.status || p.status.includes('Новый'));
    if (items.length === 0) {
      setCopiedDataStatus(`Нет новых товаров для ${dept}`);
      setTimeout(() => setCopiedDataStatus(null), 3000);
      return;
    }

    const header = ['ID', 'Внешний код', 'Группа 3', 'Наименование', 'Статус', 'Причина паузы', 'Дата паузы', 'Исполнитель', 'Дата взятия', 'Дата выполнения', 'Дата завершения работы', 'Источник', 'Дата загрузки'];
    const rows = items.map((p, idx) => [
      String(idx + 1),
      p.externalCode || '',
      p.group3 || '',
      p.title || '',
      p.status || '🆕 Новый',
      p.pauseReason || '',
      p.pauseDate || '',
      p.executor || '',
      p.dateTaken || '',
      p.dateCompleted || '',
      p.dateFinished || '',
      p.sourceFile || '',
      p.dateUploaded || '',
    ]);

    const tsv = [header.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsv);
    setCopiedDataStatus(`Скопировано ${items.length} строк (${dept}) для вставки в Google Sheets!`);
    setTimeout(() => setCopiedDataStatus(null), 4000);
  };

  const appsScriptCode = `/**
 * GOOGLE APPS SCRIPT ДЛЯ ДВУСТОРОННЕЙ СИНХРОНИЗАЦИИ
 * Панель управления отделом контента и КАМ
 * Листы для загружаемых товаров:
 *  - «📥 Загруженные данные контента» (gid=59376984)
 *  - «📥 Загруженные данные КАМ» (gid=183144046)
 */

function doGet(e) {
  return handleRequest(e ? e.parameter : {});
}

function doPost(e) {
  var data = {};
  if (e && e.postData && e.postData.contents) {
    try {
      data = JSON.parse(e.postData.contents);
    } catch (err) {
      data = e.parameter || {};
    }
  } else {
    data = e ? e.parameter || {} : {};
  }
  return handleRequest(data);
}

/**
 * Точный поиск листа по GID или списку названий
 */
function findSheetByGidOrNames(ss, targetGid, possibleNames) {
  var all = ss.getSheets();
  
  // 1. Поиск по точному ID вкладки (GID)
  if (targetGid) {
    for (var g = 0; g < all.length; g++) {
      if (String(all[g].getSheetId()) === String(targetGid)) {
        return all[g];
      }
    }
  }
  
  // 2. Поиск по точному названию
  for (var i = 0; i < possibleNames.length; i++) {
    var s = ss.getSheetByName(possibleNames[i]);
    if (s) return s;
  }
  
  // 3. Поиск без учета спецсимволов/эмодзи и регистра
  var normalize = function(str) {
    return str.replace(/[^\\w\\s\\u0400-\\u04FF]/gi, '').toLowerCase().replace(/\\s+/g, ' ').trim();
  };
  
  for (var j = 0; j < all.length; j++) {
    var sNorm = normalize(all[j].getName());
    for (var k = 0; k < possibleNames.length; k++) {
      var pNorm = normalize(possibleNames[k]);
      if (sNorm === pNorm) return all[j];
    }
  }
  
  // 4. Поиск по ключевым словам (загруженные + кам/контент)
  for (var m = 0; m < all.length; m++) {
    var rawName = all[m].getName().toLowerCase();
    for (var n = 0; n < possibleNames.length; n++) {
      var pTarget = possibleNames[n].toLowerCase();
      if (pTarget.indexOf('загруженные') !== -1 && rawName.indexOf('загруженные') !== -1) {
        if (pTarget.indexOf('кам') !== -1 && rawName.indexOf('кам') !== -1) return all[m];
        if (pTarget.indexOf('контент') !== -1 && rawName.indexOf('контент') !== -1) return all[m];
      }
    }
  }
  return null;
}

function handleRequest(data) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);

  var response = { success: false, timestamp: new Date().toISOString() };

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = data.action || 'ping';

    if (action === 'ping' || action === 'test') {
      response.success = true;
      response.message = 'Связь с Google Sheets установлена успешно!';
      response.spreadsheetName = ss.getName();
    } else if (action === 'appendDepartmentProducts' || action === 'uploadProducts') {
      var dept = data.department || 'Отдел контента';
      var isKam = (dept.indexOf('КАМ') !== -1 || dept.indexOf('Коммерческий') !== -1);
      
      // Ищем листы: «📥 Загруженные данные КАМ» (gid 183144046) или «📥 Загруженные данные контента» (gid 59376984)
      var targetSheet = isKam
        ? findSheetByGidOrNames(ss, 183144046, ['📥 Загруженные данные КАМ', 'Загруженные данные КАМ', '📥 Загруженные данные кам', 'Загруженные данные кам', 'Коммерческий отдел'])
        : findSheetByGidOrNames(ss, 59376984, ['📥 Загруженные данные контента', 'Загруженные данные контента', '📥 Загруженные данные контент', 'Загруженные данные контент', 'Отдел контента']);

      if (!targetSheet) {
        var newSheetName = isKam ? '📥 Загруженные данные КАМ' : '📥 Загруженные данные контента';
        targetSheet = ss.insertSheet(newSheetName);
        targetSheet.appendRow(['ID', 'Внешний код', 'Группа 3', 'Наименование', 'Статус', 'Причина паузы', 'Дата паузы', 'Исполнитель', 'Дата взятия', 'Дата выполнения', 'Дата завершения работы', 'Источник', 'Дата загрузки']);
      }

      var products = data.products || [];
      if (products.length > 0) {
        var lr = targetSheet.getLastRow();
        var nextId = lr > 1 ? lr : 1;
        var pRows = [];
        var filesMap = {};

        for (var p = 0; p < products.length; p++) {
          var item = products[p];
          var sf = item.sourceFile || 'Партия_' + new Date().toLocaleDateString('ru-RU');
          var g3 = item.group3 || '';
          if (!filesMap[sf]) {
            filesMap[sf] = { count: 0, group3: g3, dateUploaded: item.dateUploaded || new Date().toLocaleDateString('ru-RU') };
          }
          filesMap[sf].count++;

          pRows.push([
            nextId + p,
            item.externalCode || '',
            item.group3 || '',
            item.title || '',
            item.status || '🆕 Новый',
            item.pauseReason || '',
            item.pauseDate || '',
            item.executor || '',
            item.dateTaken || '',
            item.dateCompleted || '',
            item.dateFinished || '',
            sf,
            item.dateUploaded || new Date().toLocaleDateString('ru-RU')
          ]);
        }

        // Запись пакетом
        if (pRows.length > 0) {
          targetSheet.getRange(lr + 1, 1, pRows.length, 13).setValues(pRows);
        }

        // Синхронизация с листом Рабочие группы (КАМ / Контент)
        var wgSheet = isKam
          ? findSheetByGidOrNames(ss, 1367779997, ['Рабочие группы КАМ', 'Рабочие группы кам', 'Группы КАМ'])
          : findSheetByGidOrNames(ss, 33531424, ['Рабочие группы контент', 'Рабочие группы Контент', 'Группы контент']);

        if (wgSheet) {
          var wgRange = wgSheet.getDataRange();
          var wgVals = wgRange.getValues();
          var existingFiles = {};
          for (var w = 1; w < wgVals.length; w++) {
            var fName = (wgVals[w][0] || '').toString().trim().toLowerCase();
            if (fName) existingFiles[fName] = w + 1;
          }

          var newWgRows = [];
          var fileKeys = Object.keys(filesMap);
          for (var fk = 0; fk < fileKeys.length; fk++) {
            var fn = fileKeys[fk];
            var fInfo = filesMap[fn];
            var lowFn = fn.toLowerCase();

            if (!existingFiles[lowFn]) {
              newWgRows.push([
                fn,
                fInfo.group3,
                fInfo.count,
                fInfo.count,
                0,
                0,
                '🆕 Новый',
                '',
                '',
                '',
                '',
                '',
                fInfo.dateUploaded,
                0
              ]);
            } else {
              var rIdx = existingFiles[lowFn];
              var curTotal = Number(wgVals[rIdx - 1][2]) || 0;
              var curNew = Number(wgVals[rIdx - 1][3]) || 0;
              wgSheet.getRange(rIdx, 3).setValue(curTotal + fInfo.count);
              wgSheet.getRange(rIdx, 4).setValue(curNew + fInfo.count);
            }
          }

          if (newWgRows.length > 0) {
            wgSheet.getRange(wgSheet.getLastRow() + 1, 1, newWgRows.length, 14).setValues(newWgRows);
          }
        }

        response.success = true;
        response.addedRows = pRows.length;
        response.addedFiles = Object.keys(filesMap).length;
        response.targetSheet = targetSheet.getName();
        response.message = 'Успешно записано ' + pRows.length + ' позиций в лист «' + targetSheet.getName() + '»!';
      } else {
        response.success = true;
        response.message = 'Список товаров пуст';
      }
    } else if (action === 'updateProductStatus') {
      var dept = data.department || 'Отдел контента';
      var isKam = (dept.indexOf('КАМ') !== -1 || dept.indexOf('Коммерческий') !== -1);
      
      var targetSheet = isKam
        ? findSheetByGidOrNames(ss, 183144046, ['📥 Загруженные данные КАМ', 'Загруженные данные КАМ', '📥 Загруженные данные кам', 'Загруженные данные кам', 'Коммерческий отдел'])
        : findSheetByGidOrNames(ss, 59376984, ['📥 Загруженные данные контента', 'Загруженные данные контента', '📥 Загруженные данные контент', 'Загруженные данные контент', 'Отдел контента']);

      if (!targetSheet) throw new Error('Лист «' + (isKam ? '📥 Загруженные данные КАМ' : '📥 Загруженные данные контента') + '» не найден');

      var files = data.files || [];
      var updates = data.updates || {};
      var range = targetSheet.getDataRange();
      var vals = range.getValues();
      var count = 0;

      for (var i = 1; i < vals.length; i++) {
        var sourceFile = vals[i][11] ? vals[i][11].toString().trim() : '';
        if (files.indexOf(sourceFile) !== -1) {
          if (updates.status !== undefined) vals[i][4] = updates.status;
          if (updates.pauseReason !== undefined) vals[i][5] = updates.pauseReason;
          if (updates.pauseDate !== undefined) vals[i][6] = updates.pauseDate;
          if (updates.executor !== undefined) vals[i][7] = updates.executor;
          if (updates.dateTaken !== undefined) vals[i][8] = updates.dateTaken;
          if (updates.dateCompleted !== undefined) vals[i][9] = updates.dateCompleted;
          if (updates.dateFinished !== undefined) vals[i][10] = updates.dateFinished;
          count++;
        }
      }

      if (count > 0) range.setValues(vals);

      var wSheet = isKam
        ? findSheetByGidOrNames(ss, 1367779997, ['Рабочие группы КАМ', 'Рабочие группы кам', 'Группы КАМ'])
        : findSheetByGidOrNames(ss, 33531424, ['Рабочие группы контент', 'Рабочие группы Контент', 'Группы контент']);

      if (wSheet) {
        var wRange = wSheet.getDataRange();
        var wVals = wRange.getValues();
        for (var w = 1; w < wVals.length; w++) {
          var wfName = wVals[w][0] ? wVals[w][0].toString().trim() : '';
          if (files.indexOf(wfName) !== -1) {
            if (updates.status !== undefined) wVals[w][6] = updates.status;
            if (updates.pauseReason !== undefined) wVals[w][7] = updates.pauseReason;
            if (updates.pauseDate !== undefined) wVals[w][8] = updates.pauseDate;
            if (updates.executor !== undefined) wVals[w][9] = updates.executor;
            if (updates.dateTaken !== undefined) wVals[w][10] = updates.dateTaken;
            if (updates.dateFinished !== undefined) wVals[w][11] = updates.dateFinished;
          }
        }
        wRange.setValues(wVals);
      }
      response.success = true;
      response.updatedRows = count;
      response.targetSheet = targetSheet.getName();
      response.message = 'Обновлено ' + count + ' позиций в листе «' + targetSheet.getName() + '»';
    } else if (action === 'updateGroup') {
      var g3 = (data.group3 || '').toString().trim().toLowerCase();
      var gUp = data.updates || {};
      var tSheets = ['Рабочие группы контент', 'Рабочие группы КАМ'];
      var upCount = 0;

      for (var s = 0; s < tSheets.length; s++) {
        var gs = findSheetByGidOrNames(ss, null, [tSheets[s]]);
        if (!gs) continue;
        var gr = gs.getDataRange();
        var gv = gr.getValues();
        for (var r = 1; r < gv.length; r++) {
          if ((gv[r][1] || '').toString().trim().toLowerCase() === g3) {
            if (gUp.status !== undefined) gv[r][6] = gUp.status;
            if (gUp.pauseReason !== undefined) gv[r][7] = gUp.pauseReason;
            if (gUp.pauseDate !== undefined) gv[r][8] = gUp.pauseDate;
            if (gUp.executor !== undefined) gv[r][9] = gUp.executor;
            if (gUp.dateTaken !== undefined) gv[r][10] = gUp.dateTaken;
            if (gUp.dateFinished !== undefined) gv[r][11] = gUp.dateFinished;
            upCount++;
          }
        }
        gr.setValues(gv);
      }
      response.success = true;
      response.message = 'Группа "' + data.group3 + '" обновлена';
    } else if (action === 'updateTask' || action === 'addTask') {
      var ts = findSheetByGidOrNames(ss, 1482592400, ['Задачи']);
      if (!ts) {
        ts = ss.insertSheet('Задачи');
        ts.appendRow(['ID', 'Тема', 'Описание', 'Исполнители', 'Статус', 'Срочность', 'Изображения Base64', 'Дата создания', 'Дата обновления']);
      }
      var tD = data.task || {};
      var tr = ts.getDataRange();
      var tv = tr.getValues();
      var found = false;

      for (var t = 1; t < tv.length; t++) {
        if (String(tv[t][0]) === String(tD.id)) {
          if (tD.title !== undefined) tv[t][1] = tD.title;
          if (tD.description !== undefined) tv[t][2] = tD.description;
          if (tD.executors !== undefined) tv[t][3] = tD.executors;
          if (tD.status !== undefined) tv[t][4] = tD.status;
          if (tD.urgency !== undefined) tv[t][5] = tD.urgency;
          if (tD.imageBase64 !== undefined) tv[t][6] = tD.imageBase64;
          tv[t][8] = new Date().toLocaleString('ru-RU');
          found = true;
          break;
        }
      }
      if (found) tr.setValues(tv);
      else ts.appendRow([tD.id || String(tv.length), tD.title || '', tD.description || '', tD.executors || '', tD.status || 'Новая', tD.urgency || 'Текущая задача', tD.imageBase64 || '', tD.createdAt || new Date().toLocaleString('ru-RU'), tD.updatedAt || new Date().toLocaleString('ru-RU')]);
      response.success = true;
    } else if (action === 'appendNewProductsBatch' || action === 'addNewProductsBatch') {
      var nSheet = findSheetByGidOrNames(ss, 413377182, ['Новые товары', 'НовыеТовары', 'Новые SKU']);
      if (!nSheet) {
        nSheet = ss.insertSheet('Новые товары');
        nSheet.appendRow(['Внешний код', 'Наименование', 'Дата создания', 'Цифровой код менеджера', 'Название раздела', 'Менеджер', 'Контент', 'Добавлено', 'Выгружено в файл']);
      }

      var bItems = data.items || [];
      if (bItems.length > 0) {
        var startRow = nSheet.getLastRow() + 1;
        var bRows = [];
        var todayStr = new Date().toLocaleDateString('ru-RU');

        for (var b = 0; b < bItems.length; b++) {
          var bi = bItems[b];
          bRows.push([
            bi.externalCode || '',
            bi.title || '',
            bi.createdAt || todayStr,
            bi.managerCode || '',
            bi.sectionName || '',
            bi.managerName || '',
            bi.contentCategory || '',
            bi.addedDate || todayStr,
            bi.exportedToFile || ''
          ]);
        }

        nSheet.getRange(startRow, 1, bRows.length, 9).setValues(bRows);
        var endRow = startRow + bRows.length - 1;

        response.success = true;
        response.startRow = startRow;
        response.endRow = endRow;
        response.addedRows = bItems.length;
        response.message = 'Успешно записано ' + bItems.length + ' позиций в лист «Новые товары»!';
      } else {
        response.success = true;
        response.message = 'Список товаров пуст';
      }
    } else {
      response.message = 'Неизвестное действие: ' + action;
    }
  } catch (err) {
    response.success = false;
    response.error = err.toString();
    response.message = 'Ошибка выполнения: ' + err.message;
  } finally {
    lock.releaseLock();
  }

  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}`;

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Панель разработчика и синхронизации"
      maxWidth="4xl"
    >
      <div className="space-y-5">
        {/* Authentication Wall */}
        {!isAuthenticated ? (
          <div className="py-8 px-4 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-5">
            <div className="w-16 h-16 bg-slate-900 text-sky-400 rounded-2xl flex items-center justify-center shadow-lg border border-slate-700">
              <Lock className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">Вход в панель разработчика</h3>
              <p className="text-xs text-slate-500 mt-1">
                Раздел содержит расширенные инструменты синхронизации, управление вебхуками и прямое управление базой данных.
              </p>
            </div>

            <form onSubmit={handleLogin} className="w-full space-y-4">
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Введите пароль разработчика"
                  value={passwordInput}
                  onChange={e => {
                    setPasswordInput(e.target.value);
                    setPasswordError('');
                  }}
                  autoFocus
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {passwordError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2 font-medium text-left">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-sky-200 flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Войти</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Authenticated Developer Interface */
          <>
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-slate-900 text-sky-400 text-xs font-mono font-bold rounded-lg border border-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  DEV MODE ACTIVE
                </span>
                <span className="text-xs text-slate-500 hidden sm:inline">
                  Google Sheets Webhook & Data Control
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 flex items-center gap-1 transition-colors"
                  title="Заблокировать панель разработчика"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Заблокировать</span>
                </button>
              </div>
            </div>

            {/* Sub Tabs */}
            <div className="flex border-b border-slate-200 gap-1 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`py-2 px-3.5 font-bold text-xs border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  activeTab === 'settings'
                    ? 'border-sky-600 text-sky-700 bg-sky-50/50 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Настройки Webhook</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('manual_sync')}
                className={`py-2 px-3.5 font-bold text-xs border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  activeTab === 'manual_sync'
                    ? 'border-sky-600 text-sky-700 bg-sky-50/50 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Ручная отправка & Выгрузка</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('instructions')}
                className={`py-2 px-3.5 font-bold text-xs border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  activeTab === 'instructions'
                    ? 'border-sky-600 text-sky-700 bg-sky-50/50 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Код Apps Script</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('logs')}
                className={`py-2 px-3.5 font-bold text-xs border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  activeTab === 'logs'
                    ? 'border-sky-600 text-sky-700 bg-sky-50/50 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Логи операций ({logs.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('links')}
                className={`py-2 px-3.5 font-bold text-xs border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  activeTab === 'links'
                    ? 'border-sky-600 text-sky-700 bg-sky-50/50 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Ссылки на листы</span>
              </button>
            </div>

            {/* TAB 1: Settings */}
            {activeTab === 'settings' && (
              <div className="space-y-4">
                <div className="p-4 bg-sky-50/60 border border-sky-200 rounded-xl space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-sky-950 flex items-center gap-1.5">
                        <Link2 className="w-4 h-4 text-sky-600" />
                        URL Webhook веб-приложения Google Apps Script
                      </h4>
                      <p className="text-xs text-sky-800 mt-1">
                        URL полученный при развертывании скрипта в Google Таблице (заканчивается на <code>/exec</code>).
                      </p>
                    </div>
                    {webhookUrl ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Настроен
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[11px] font-bold rounded-full flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Не задан
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <input
                      type="url"
                      placeholder="https://script.google.com/macros/s/.../exec"
                      value={webhookUrl}
                      onChange={e => setWebhookUrl(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-sky-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveUrl}
                        disabled={isTesting || !webhookUrl.trim()}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>Сохранить и проверить</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={isTesting || !webhookUrl.trim()}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        <span>Только проверить</span>
                      </button>

                      {webhookUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            googleSheetsService.clearWebhookUrl();
                            setWebhookUrl('');
                            setTestResult(null);
                          }}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg transition-colors border border-rose-200"
                        >
                          Очистить Webhook
                        </button>
                      )}
                    </div>
                  </div>

                  {testResult && (
                    <div
                      className={`p-3 rounded-lg text-xs font-mono flex items-start gap-2 border ${
                        testResult.success
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-rose-50 text-rose-800 border-rose-300'
                      }`}
                    >
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-bold">{testResult.message}</div>
                        {testResult.spreadsheetName && (
                          <div className="text-[11px] mt-0.5 opacity-90">Таблица: {testResult.spreadsheetName}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Auto Sync Settings */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Автоматическая синхронизация (Pull)</h4>
                    <p className="text-[11px] text-slate-500">Фоновое чтение новых данных из Google Таблицы каждые 3 минуты</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Синхронизация...' : 'Запустить Pull сейчас'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Manual Operations & Batch Push */}
            {activeTab === 'manual_sync' && (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <Zap className="w-4 h-4 text-amber-600" />
                    Центр ручного управления отправкой в Google Таблицы
                  </div>
                  Здесь разработчик может принудительно выгрузить файлы партий или скопировать данные без открытия общего доступа сотрудникам.
                </div>

                {/* Status toast */}
                {pushStatus && (
                  <div
                    className={`p-3 rounded-lg text-xs font-mono flex items-center justify-between gap-2 border ${
                      pushStatus.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : pushStatus.type === 'error'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-sky-50 text-sky-800 border-sky-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {pushStatus.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>{pushStatus.message}</span>
                    </div>
                  </div>
                )}

                {copiedDataStatus && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-mono flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>{copiedDataStatus}</span>
                  </div>
                )}

                {/* Operations grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Content Dept */}
                  <div className="p-4 bg-white border border-sky-200 rounded-xl shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-sky-600" />
                        <span>Отдел контента</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded">
                        Лист «📥 Загруженные данные контента»
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Выгрузка новых файлов контента и синхронизация рабочих групп контента.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handlePushDepartmentNewFiles('Отдел контента')}
                        disabled={isPushingContent}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isPushingContent ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>Выгрузить новые в Sheets</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyDepartmentTSV('Отдел контента')}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-300"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Скопировать TSV</span>
                      </button>
                    </div>
                  </div>

                  {/* KAM Dept */}
                  <div className="p-4 bg-white border border-indigo-200 rounded-xl shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        <span>Коммерческий отдел (КАМ)</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
                        Лист «📥 Загруженные данные КАМ»
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Выгрузка новых файлов КАМ и синхронизация рабочих групп КАМ.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handlePushDepartmentNewFiles('Коммерческий отдел')}
                        disabled={isPushingKam}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isPushingKam ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>Выгрузить новые в Sheets</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyDepartmentTSV('Коммерческий отдел')}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-300"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Скопировать TSV</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Full Pull Sync */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Полная синхронизация (Pull из Google Sheets)</h4>
                      <p className="text-[11px] text-slate-500">Загрузка свежих данных из всех вкладок (товары, группы, задачи, новые партии)</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleManualSync}
                      disabled={isSyncing}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Синхронизация...' : 'Запустить полный Pull'}</span>
                    </button>
                  </div>
                  {syncStatus && (
                    <div className="text-xs font-mono text-slate-700 bg-white p-2 rounded border border-slate-200">
                      {syncStatus}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: Apps Script Code */}
            {activeTab === 'instructions' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    Инструкция по развертыванию скрипта в Google Sheets:
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-[11px]">
                    <li>Откройте вашу Google Таблицу и перейдите в <strong>Расширения → Apps Script</strong>.</li>
                    <li>Полностью удалите старый код и вставьте код из окна ниже.</li>
                    <li>Нажмите <strong>Развернуть → Управление развертываниями</strong> (или Новое развертывание).</li>
                    <li>Нажмите значок карандаша <strong>(Изменить)</strong> → в поле «Версия» выберите <strong>«Новая версия»</strong> → нажмите «Развернуть».</li>
                    <li>Скопируйте URL веб-приложения и сохраните его во вкладке «Настройки Webhook».</li>
                  </ol>
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-700">Файл Code.gs (Google Apps Script):</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(appsScriptCode);
                        setCopiedScript(true);
                        setTimeout(() => setCopiedScript(false), 3000);
                      }}
                      className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedScript ? 'Код скопирован!' : 'Скопировать весь код'}</span>
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={appsScriptCode}
                    rows={12}
                    className="w-full p-3 font-mono text-[11px] bg-slate-900 text-slate-100 rounded-xl border border-slate-700 focus:outline-none select-all"
                  />
                </div>
              </div>
            )}

            {/* TAB 4: Logs */}
            {activeTab === 'logs' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Журнал последних операций Webhook:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setLogs(googleSheetsService.getPushLog())}
                      className="text-xs text-sky-600 hover:text-sky-800 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Обновить
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        googleSheetsService.clearLogs();
                        setLogs([]);
                      }}
                      className="text-xs text-slate-400 hover:text-rose-600 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Очистить
                    </button>
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y divide-slate-100">
                  {logs.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Журнал операций пуст. При отправке данных или изменении статусов записи будут отображаться здесь.
                    </div>
                  ) : (
                    logs.map(log => (
                      <div key={log.id} className="p-3 text-xs flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          {log.status === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : log.status === 'error' ? (
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <div className="font-bold text-slate-800">{log.title}</div>
                            <div className="text-[11px] text-slate-600">{log.details}</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">{log.timestamp}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: Direct Spreadsheet Links */}
            {activeTab === 'links' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Прямой доступ к листам Google Таблицы для мониторинга:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <a
                    href="https://docs.google.com/spreadsheets/d/1vCZQgzBPv8uahr8ckRI1f-TA_QS6Afz2B9NP_ZMj6ek/edit?gid=59376984#gid=59376984"
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded-xl flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <div className="font-bold text-sky-950">📥 Загруженные данные контента</div>
                      <div className="text-[10px] font-mono text-sky-700">gid=59376984</div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-sky-600" />
                  </a>

                  <a
                    href="https://docs.google.com/spreadsheets/d/1vCZQgzBPv8uahr8ckRI1f-TA_QS6Afz2B9NP_ZMj6ek/edit?gid=183144046#gid=183144046"
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-xl flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <div className="font-bold text-indigo-950">📥 Загруженные данные КАМ</div>
                      <div className="text-[10px] font-mono text-indigo-700">gid=183144046</div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-indigo-600" />
                  </a>

                  <a
                    href="https://docs.google.com/spreadsheets/d/1vCZQgzBPv8uahr8ckRI1f-TA_QS6Afz2B9NP_ZMj6ek/edit?gid=33531424#gid=33531424"
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <div className="font-bold text-slate-800">Рабочие группы контент</div>
                      <div className="text-[10px] font-mono text-slate-500">gid=33531424</div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-600" />
                  </a>

                  <a
                    href="https://docs.google.com/spreadsheets/d/1vCZQgzBPv8uahr8ckRI1f-TA_QS6Afz2B9NP_ZMj6ek/edit?gid=1367779997#gid=1367779997"
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <div className="font-bold text-slate-800">Рабочие группы КАМ</div>
                      <div className="text-[10px] font-mono text-slate-500">gid=1367779997</div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-600" />
                  </a>

                  <a
                    href="https://docs.google.com/spreadsheets/d/1vCZQgzBPv8uahr8ckRI1f-TA_QS6Afz2B9NP_ZMj6ek/edit?gid=413377182#gid=413377182"
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-xl flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <div className="font-bold text-emerald-950">Новые товары (партии)</div>
                      <div className="text-[10px] font-mono text-emerald-700">gid=413377182</div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-emerald-600" />
                  </a>

                  <a
                    href={TASKS_SPREADSHEET_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-xl flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <div className="font-bold text-amber-950">Задачи отдела</div>
                      <div className="text-[10px] font-mono text-amber-700">gid=1482592400</div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-amber-600" />
                  </a>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};
