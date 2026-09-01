async function inspectSpreadsheet() {
  const spreadsheetId = '1vCZQgzBPv8uahr8ckRI1f-TA_QS6Afz2B9NP_ZMj6ek';
  // Let's check common gids or fetch HTML / feed or check known gids
  const gids = [
    { name: 'Content (Отдел контента)', gid: '59376984' },
    { name: 'KAM (Коммерческий отдел)', gid: '183144046' },
    { name: 'Tasks (Задачи)', gid: '1482592400' },
    { name: 'New Products (Новые товары)', gid: '413377182' },
    { name: 'GID 0', gid: '0' },
  ];

  for (const item of gids) {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${item.gid}`;
    try {
      const res = await fetch(url);
      const text = await res.text();
      const firstLine = text.split('\n')[0];
      const secondLine = text.split('\n')[1] || '';
      console.log(`[GID ${item.gid} - ${item.name}]: Status ${res.status}, Length ${text.length}, Line1: ${firstLine.slice(0, 100)}, Line2: ${secondLine.slice(0, 100)}`);
    } catch (e) {
      console.log(`[GID ${item.gid}]: Error ${e.message}`);
    }
  }

  // Also let's inspect the HTML of the spreadsheet to find all sheet names and GIDs!
  const htmlUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  const htmlRes = await fetch(htmlUrl);
  const htmlText = await htmlRes.text();
  console.log("HTML length:", htmlText.length);
  // Match sheet tabs in HTML
  // Pattern: "name":"...",..."sheetId":... or data-sheet-id="..." or similar
  const matches = [...htmlText.matchAll(/name\\":\\"([^\\"]+)\\",\\"sheetId\\":([0-9]+)/g)];
  if (matches.length > 0) {
    console.log("Found sheets via pattern 1:");
    matches.forEach(m => console.log(`  Tab: "${m[1]}" -> GID: ${m[2]}`));
  } else {
    // try pattern without backslashes
    const matches2 = [...htmlText.matchAll(/"name":"([^"]+)","sheetId":([0-9]+)/g)];
    console.log("Found sheets via pattern 2:", matches2.map(m => `"${m[1]}" -> GID: ${m[2]}`));
    
    // try pattern with gridId
    const matches3 = [...htmlText.matchAll(/sheetId":([0-9]+),"name":"([^"]+)"/g)];
    console.log("Found sheets via pattern 3:", matches3.map(m => `"${m[2]}" -> GID: ${m[1]}`));
  }
}
inspectSpreadsheet().catch(console.error);
