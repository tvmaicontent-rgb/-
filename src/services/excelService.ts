import * as XLSX from 'xlsx';
import { MANAGERS_DICT, MANAGERS_LIST, getManagerForCategory } from '../constants';
import { ProductItem, DepartmentType, NewProductItem } from '../types';

export interface ParsedProductRow {
  externalCode: string;
  group3: string;
  title: string;
  managerCode?: string;
  manager?: string;
}

/**
 * Searches column keys by matching keywords
 */
function findColumnKey(headers: string[], keywords: string[]): string | undefined {
  return headers.find(h => {
    const lower = h.toLowerCase().trim();
    return keywords.some(k => lower.includes(k));
  });
}

/**
 * Cleans string codes and removes .0 suffix
 */
export function cleanCodeString(val: any): string {
  if (val === null || val === undefined) return '';
  let s = String(val).trim();
  if (s.toLowerCase() === 'nan' || s.toLowerCase() === 'none' || s.toLowerCase() === 'null') return '';
  if (s.endsWith('.0')) {
    s = s.slice(0, -2);
  }
  return s;
}

/**
 * Parses an uploaded Excel file (.xlsx, .xls) for product data
 */
export async function parseExcelProductFile(
  file: File,
  dept: DepartmentType,
  uploadTimestamp: string
): Promise<ProductItem[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (jsonData.length === 0) {
    return [];
  }

  const firstRow = (jsonData[0] as any[]).map(h => String(h || '').trim());
  const rawHeaders = firstRow;

  const hasHeaderKeywords = firstRow.some(cell => {
    const l = cell.toLowerCase();
    return (
      l.includes('внешний') ||
      l.includes('код') ||
      l.includes('артикул') ||
      l.includes('наименование') ||
      l.includes('название') ||
      l.includes('группа') ||
      l.includes('раздел')
    );
  });

  let rows = jsonData.slice(1);
  let extCodeIdx = 0;
  let group3Idx = -1;
  let titleIdx = 1;

  if (hasHeaderKeywords) {
    const extCodeCol = findColumnKey(rawHeaders, ['внешний', 'артикул', 'код товара', 'идентификатор', 'код']);
    const group3Col = findColumnKey(rawHeaders, ['группа 3', 'раздел', 'категория', 'группа']);
    const titleCol = findColumnKey(rawHeaders, ['наименование', 'название', 'номенклатура', 'товар', 'описание']);

    extCodeIdx = extCodeCol ? rawHeaders.indexOf(extCodeCol) : 0;
    group3Idx = group3Col ? rawHeaders.indexOf(group3Col) : -1;
    titleIdx = titleCol ? rawHeaders.indexOf(titleCol) : (extCodeIdx === 0 ? 1 : 0);
  } else {
    // Treat first row as data
    rows = jsonData;
    extCodeIdx = 0;
    titleIdx = jsonData[0].length > 1 ? 1 : 0;
    group3Idx = jsonData[0].length > 2 ? 2 : -1;
  }

  const parsedItems: ProductItem[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row) || row.length === 0) continue;

    const rawExt = extCodeIdx >= 0 && row.length > extCodeIdx ? row[extCodeIdx] : '';
    const cleanExt = cleanCodeString(rawExt);

    // Skip empty or header
    if (!cleanExt || cleanExt.toLowerCase() === 'внешний код' || cleanExt.toLowerCase() === 'код') continue;

    const group3 = group3Idx >= 0 && row.length > group3Idx ? String(row[group3Idx] || '').trim() : '';
    const title = titleIdx >= 0 && row.length > titleIdx ? String(row[titleIdx] || '').trim() : '';

    parsedItems.push({
      id: `${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      externalCode: cleanExt,
      group3: group3 || 'Без категории',
      title: title || `Товар ${cleanExt}`,
      status: '🆕 Новый',
      pauseReason: '',
      pauseDate: '',
      executor: '',
      dateTaken: '',
      dateCompleted: '',
      dateFinished: '',
      sourceFile: file.name,
      dateUploaded: uploadTimestamp,
      department: dept,
    });
  }

  return parsedItems;
}

/**
 * Parses an uploaded Excel file for New Products batch (with manager codes)
 */
export async function parseNewProductsBatchFile(
  file: File,
  batchDateStr: string
): Promise<NewProductItem[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (jsonData.length < 2) return [];

  const rawHeaders = (jsonData[0] as any[]).map(h => String(h || '').trim());
  const rows = jsonData.slice(1);

  const extCodeCol = findColumnKey(rawHeaders, ['внешний', 'артикул', 'код товара', 'идентификатор', 'код']) || rawHeaders[0];
  const group3Col = findColumnKey(rawHeaders, ['группа 3', 'раздел', 'категория', 'группа']);
  const titleCol = findColumnKey(rawHeaders, ['наименование', 'название', 'номенклатура', 'товар']) || rawHeaders[1];
  const mngCodeCol = findColumnKey(rawHeaders, [
    'main_mng_code',
    'цифровой код менеджера',
    'код менеджера',
    'код руководителя',
    'менеджер',
    'руководитель',
    'ответственный',
  ]);

  const extCodeIdx = rawHeaders.indexOf(extCodeCol);
  const group3Idx = group3Col ? rawHeaders.indexOf(group3Col) : -1;
  const titleIdx = rawHeaders.indexOf(titleCol);
  const mngCodeIdx = mngCodeCol ? rawHeaders.indexOf(mngCodeCol) : -1;

  const items: NewProductItem[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row) || row.length === 0) continue;

    const rawExt = extCodeIdx >= 0 ? row[extCodeIdx] : '';
    const cleanExt = cleanCodeString(rawExt);
    if (!cleanExt) continue;

    const title = titleIdx >= 0 ? String(row[titleIdx] || '').trim() : '';
    const group3 = group3Idx >= 0 ? String(row[group3Idx] || '').trim() : '';
    const mngValRaw = mngCodeIdx >= 0 ? String(row[mngCodeIdx] || '').trim() : '';
    const mngCode = cleanCodeString(mngValRaw);

    // Resolve manager name from code or name string or group3
    let managerName = '';
    let resolvedCode = mngCode;

    if (mngCode && MANAGERS_DICT[mngCode]) {
      managerName = MANAGERS_DICT[mngCode];
    } else if (mngValRaw) {
      // Check if text already matches a known manager surname
      const matchManager = MANAGERS_LIST.find(
        m => m.name.toLowerCase() === mngValRaw.toLowerCase() || mngValRaw.toLowerCase().includes(m.name.toLowerCase())
      );
      if (matchManager) {
        managerName = matchManager.name;
        resolvedCode = matchManager.code;
      }
    }

    // If still not resolved, resolve from category group (group3)
    if (!managerName && group3) {
      managerName = getManagerForCategory(group3);
      const matchManager = MANAGERS_LIST.find(m => m.name === managerName);
      if (matchManager) {
        resolvedCode = matchManager.code;
      }
    }

    if (!managerName) {
      managerName = mngCode ? `Менеджер (${mngCode})` : 'Волчек';
    }

    items.push({
      id: `${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      externalCode: cleanExt,
      title: title || 'Без названия',
      createdDate: batchDateStr,
      managerCode: resolvedCode,
      sectionName: group3 || 'Без группы',
      manager: managerName,
      content: '',
      batchDate: batchDateStr,
      batchFile: file.name,
    });
  }

  return items;
}

/**
 * Generates and triggers download of a multi-sheet Analytics report in Excel
 */
export function exportAnalyticsReportToExcel(reportData: {
  kpi: Record<string, any>[];
  filesCompleted?: Record<string, any>[];
  filesInWorkAndPause?: Record<string, any>[];
  filesInQueue?: Record<string, any>[];
  executors?: Record<string, any>[];
  categories?: Record<string, any>[];
  pauseReasons: Record<string, any>[];
  monthlyStats?: Record<string, any>[];
}, fileName: string = 'Аналитический_отчет_Отдел_контента'): void {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: KPI Summary
  const kpiWs = XLSX.utils.json_to_sheet(reportData.kpi);
  XLSX.utils.book_append_sheet(workbook, kpiWs, 'Сводка KPI');

  // Sheet 2: Monthly stats (if provided)
  if (reportData.monthlyStats && reportData.monthlyStats.length > 0) {
    const monthWs = XLSX.utils.json_to_sheet(reportData.monthlyStats);
    XLSX.utils.book_append_sheet(workbook, monthWs, 'Помесячная динамика');
  }

  // Sheet 3: Completed Files
  if (reportData.filesCompleted && reportData.filesCompleted.length > 0) {
    const doneWs = XLSX.utils.json_to_sheet(reportData.filesCompleted);
    XLSX.utils.book_append_sheet(workbook, doneWs, 'Готовые файлы');
  }

  // Sheet 4: Files In Work & On Pause
  if (reportData.filesInWorkAndPause && reportData.filesInWorkAndPause.length > 0) {
    const inWorkWs = XLSX.utils.json_to_sheet(reportData.filesInWorkAndPause);
    XLSX.utils.book_append_sheet(workbook, inWorkWs, 'В работе и на паузе');
  }

  // Sheet 5: Files In Queue
  if (reportData.filesInQueue && reportData.filesInQueue.length > 0) {
    const queueWs = XLSX.utils.json_to_sheet(reportData.filesInQueue);
    XLSX.utils.book_append_sheet(workbook, queueWs, 'В очереди');
  }

  // Sheet 6: Executors (if provided)
  if (reportData.executors && reportData.executors.length > 0) {
    const execWs = XLSX.utils.json_to_sheet(reportData.executors);
    XLSX.utils.book_append_sheet(workbook, execWs, 'Исполнители');
  }

  // Sheet 7: Categories (Group 3) - optional
  if (reportData.categories && reportData.categories.length > 0) {
    const catWs = XLSX.utils.json_to_sheet(reportData.categories);
    XLSX.utils.book_append_sheet(workbook, catWs, 'Группы 3');
  }

  // Sheet 8: Pause Reasons
  const pauseWs = XLSX.utils.json_to_sheet(reportData.pauseReasons);
  XLSX.utils.book_append_sheet(workbook, pauseWs, 'Причины пауз');

  const fullName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(workbook, fullName);
}

/**
 * Generates and triggers download of an Excel file from data array
 */
export function exportToExcel(data: Record<string, any>[], fileName: string, sheetName: string = 'Сводная'): void {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
}
