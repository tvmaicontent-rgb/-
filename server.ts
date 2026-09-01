import express from 'express';
import path from 'path';
import fs from 'fs';
import * as archiverPkg from 'archiver';
const archiver = ((archiverPkg as any).default || archiverPkg) as any;
import { createServer as createViteServer } from 'vite';

const rootDir = process.cwd();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// Google Sheets URLs
const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1vCZQgzBPv8uahr8ckRI1f-TA_QS6Afz2B9NP_ZMj6ek/export?format=csv&gid=59376984';
const KAM_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1vCZQgzBPv8uahr8ckRI1f-TA_QS6Afz2B9NP_ZMj6ek/export?format=csv&gid=183144046';
const TASKS_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1vCZQgzBPv8uahr8ckRI1f-TA_QS6Afz2B9NP_ZMj6ek/export?format=csv&gid=1482592400';

function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let field = '';

  let cleanText = text;
  if (cleanText.charCodeAt(0) === 0xFEFF) {
    cleanText = cleanText.slice(1);
  }

  for (let i = 0; i < cleanText.length; i++) {
    const c = cleanText[i];
    if (inQuotes) {
      if (c === '"') {
        if (i + 1 < cleanText.length && cleanText[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && i + 1 < cleanText.length && cleanText[i + 1] === '\n') {
          i++;
        }
        row.push(field);
        field = '';
        if (row.some(f => f.trim().length > 0)) {
          lines.push(row);
        }
        row = [];
      } else {
        field += c;
      }
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some(f => f.trim().length > 0)) {
      lines.push(row);
    }
  }

  return lines;
}

// In-memory cache
let cachedData: any = null;
let lastSyncTime = '';

async function fetchFromSheets() {
  const [contentCsv, kamCsv, tasksCsv] = await Promise.all([
    fetch(SPREADSHEET_URL).then(r => r.text()),
    fetch(KAM_SPREADSHEET_URL).then(r => r.text()),
    fetch(TASKS_SPREADSHEET_URL).then(r => r.text()),
  ]);

  const contentRows = parseCSV(contentCsv).slice(1);
  const kamRows = parseCSV(kamCsv).slice(1);
  const taskRows = parseCSV(tasksCsv).slice(1);

  const contentProducts = contentRows.map((r, idx) => ({
    id: `cnt-${r[0] || idx + 1}`,
    externalCode: (r[1] || '').trim(),
    group3: (r[2] || '').trim(),
    title: (r[3] || '').trim(),
    status: (r[4] || '🆕 Новый').trim(),
    pauseReason: (r[5] || '').trim(),
    pauseDate: (r[6] || '').trim(),
    executor: (r[7] || '').trim(),
    dateTaken: (r[8] || '').trim(),
    dateCompleted: (r[9] || '').trim(),
    dateFinished: (r[10] || '').trim(),
    sourceFile: (r[11] || '').trim(),
    dateUploaded: (r[12] || '').trim(),
    department: 'Отдел контента',
  }));

  const kamProducts = kamRows.map((r, idx) => ({
    id: `kam-${r[0] || idx + 1}`,
    externalCode: (r[1] || '').trim(),
    group3: (r[2] || '').trim(),
    title: (r[3] || '').trim(),
    status: (r[4] || '🆕 Новый').trim(),
    pauseReason: (r[5] || '').trim(),
    pauseDate: (r[6] || '').trim(),
    executor: (r[7] || '').trim(),
    dateTaken: (r[8] || '').trim(),
    dateCompleted: (r[9] || '').trim(),
    dateFinished: (r[10] || '').trim(),
    sourceFile: (r[11] || '').trim(),
    dateUploaded: (r[12] || '').trim(),
    department: 'Коммерческий отдел',
  }));

  const tasks = taskRows.map((r, idx) => ({
    id: (r[0] || String(idx + 1)).trim(),
    title: (r[1] || '').trim(),
    description: (r[2] || '').trim(),
    executors: (r[3] || '').trim(),
    status: (r[4] || 'Новая').trim(),
    urgency: (r[5] || 'Текущая задача').trim(),
    imageBase64: (r[6] || '').trim(),
    createdAt: (r[7] || '').trim(),
    updatedAt: (r[8] || '').trim(),
  }));

  const allProducts = [...contentProducts, ...kamProducts];

  // Dynamic Category Groups
  const groupMap = new Map<string, any>();
  for (const p of allProducts) {
    const g3 = p.group3;
    if (!g3) continue;
    if (!groupMap.has(g3)) {
      groupMap.set(g3, {
        group1: 'Каталог',
        group2: '',
        group3: g3,
        skuCount: 0,
        executors: new Set(),
        startDate: '',
        releaseDate: '',
        doneCount: 0,
        inWorkCount: 0,
      });
    }
    const item = groupMap.get(g3);
    item.skuCount++;
    if (p.executor) item.executors.add(p.executor);
    if (!item.startDate && (p.dateTaken || p.dateUploaded)) item.startDate = p.dateTaken || p.dateUploaded;
    if (!item.releaseDate && (p.dateCompleted || p.dateFinished)) item.releaseDate = p.dateCompleted || p.dateFinished;
    if (p.status.includes('Выполнен') || p.status.includes('Выполнено')) item.doneCount++;
    if (p.status.includes('В работе') || p.status.includes('работе')) item.inWorkCount++;
  }

  const categoryGroups = Array.from(groupMap.values()).map((g, idx) => ({
    id: `grp-${idx + 1}`,
    group1: 'Каталог',
    group2: '',
    group3: g.group3,
    manager: Array.from(g.executors).join(', ') || '—',
    includedMaterik: g.doneCount > 0 ? '1' : '0',
    includedPalas: g.doneCount > 10 ? '1' : '0',
    skuCount: String(g.skuCount),
    startDate: g.startDate || '',
    donorRequestDate: '',
    donorReceivedDate: '',
    approvalSentDate: '',
    approvalDate: '',
    releaseDate: g.releaseDate || '',
    palasAllocated: g.doneCount > 0 ? 'Да' : '',
    kamFile: g.skuCount > 50 ? 'Добавлено' : '',
  }));

  const now = new Date();
  lastSyncTime = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  cachedData = {
    products: allProducts,
    tasks,
    groups: categoryGroups,
    lastSyncTime,
    counts: {
      content: contentProducts.length,
      kam: kamProducts.length,
      tasks: tasks.length,
      groups: categoryGroups.length,
    },
  };

  return cachedData;
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/sync-sheets', async (req, res) => {
  try {
    const data = await fetchFromSheets();
    res.json({ success: true, ...data });
  } catch (err: any) {
    console.error('API sync error:', err);
    // If cached exists, return cached
    if (cachedData) {
      return res.json({ success: true, ...cachedData, fromCache: true });
    }
    // Try reading local snapshot file
    try {
      const pFile = path.join(rootDir, 'src/data/initialProducts.json');
      const tFile = path.join(rootDir, 'src/data/initialTasks.json');
      const gFile = path.join(rootDir, 'src/data/initialGroups.json');
      if (fs.existsSync(pFile)) {
        const products = JSON.parse(fs.readFileSync(pFile, 'utf8'));
        const tasks = JSON.parse(fs.readFileSync(tFile, 'utf8'));
        const groups = JSON.parse(fs.readFileSync(gFile, 'utf8'));
        return res.json({
          success: true,
          products,
          tasks,
          groups,
          lastSyncTime: 'Из локального снапшота',
          fromSnapshot: true,
        });
      }
    } catch {
      // ignore
    }
    res.status(500).json({ success: false, error: err.message || 'Ошибка синхронизации' });
  }
});

app.post('/api/sheets/webhook-proxy', async (req, res) => {
  try {
    const { webhookUrl, payload } = req.body || {};
    const url = (webhookUrl || process.env.GOOGLE_SHEETS_WEBHOOK_URL || '').trim();
    if (!url) {
      return res.status(400).json({ success: false, error: 'Webhook URL not provided' });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
      redirect: 'follow',
    });

    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      // If response is HTML, it often means Google login redirect / permission denied
      if (text.includes('<!DOCTYPE') || text.includes('<html') || text.includes('Google Accounts')) {
        return res.status(403).json({
          success: false,
          error: 'Google Apps Script вернул страницу авторизации. Проверьте развертывание скрипта: в поле «У кого есть доступ» (Who has access) обязательно выберите «Все» (Anyone).',
          isAuthHtml: true,
        });
      }
      data = { raw: text, success: false, error: text.slice(0, 200) };
    }

    if (data && data.success === false) {
      return res.status(400).json(data);
    }

    res.json({ success: true, ...data });
  } catch (err: any) {
    console.error('Webhook proxy error:', err);
    res.status(500).json({ success: false, error: err.message || 'Webhook request failed' });
  }
});

app.get('/api/data-snapshot', (req, res) => {
  if (cachedData) {
    return res.json(cachedData);
  }
  try {
    const pFile = path.join(rootDir, 'src/data/initialProducts.json');
    const tFile = path.join(rootDir, 'src/data/initialTasks.json');
    const gFile = path.join(rootDir, 'src/data/initialGroups.json');
    if (fs.existsSync(pFile)) {
      const products = JSON.parse(fs.readFileSync(pFile, 'utf8'));
      const tasks = JSON.parse(fs.readFileSync(tFile, 'utf8'));
      const groups = JSON.parse(fs.readFileSync(gFile, 'utf8'));
      return res.json({
        products,
        tasks,
        groups,
        lastSyncTime: 'Снапшот Google Sheets',
      });
    }
  } catch {
    // fallback
  }
  res.json({ products: [], tasks: [], groups: [] });
});

app.get('/api/download-project-zip', (req, res) => {
  try {
    const rootDir = process.cwd();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="content-ops-project.zip"');

    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    archive.on('error', (err) => {
      console.error('Archiver error:', err);
      res.status(500).send({ error: err.message });
    });

    archive.pipe(res);

    archive.glob('**/*', {
      cwd: rootDir,
      ignore: [
        'node_modules/**',
        'dist/**',
        '.git/**',
        '*.log',
        '.vite/**',
      ],
      dot: true,
    });

    archive.finalize();
  } catch (err: any) {
    console.error('Zip export error:', err);
    res.status(500).json({ error: 'Failed to create zip' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
