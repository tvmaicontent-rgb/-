import fs from 'fs';

async function findTabGids() {
  const spreadsheetId = '1vCZQgzBPv8uahr8ckRI1f-TA_QS6Afz2B9NP_ZMj6ek';
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  const res = await fetch(url);
  const html = await res.text();

  // Let's print out all <div class="goog-inline-block docs-sheet-tab-caption">...
  const tabPattern = /<div class="goog-inline-block docs-sheet-tab-caption">([^<]+)<\/div>/g;
  let m;
  const tabNames = [];
  while ((m = tabPattern.exec(html)) !== null) {
    tabNames.push(m[1]);
  }
  console.log("All tab names found in HTML:", tabNames);

  // In Google Sheets html, sheet ID mapping is in a script tag or data attributes or bootstrap data
  // Let's search around "Контакты поставщиков"
  const idx = html.indexOf('Контакты поставщиков');
  console.log("Context around 'Контакты поставщиков':", html.slice(Math.max(0, idx - 400), idx + 400));

  // Let's search for sheetId in JSON chunks in HTML
  // Usually something like: [...,"Контакты поставщиков",0,...] or [...,123456789,"Контакты поставщиков"]
  const jsonBlocks = [...html.matchAll(/(\[[^\]]*?Контакты поставщиков[^\]]*?\])/g)];
  console.log("JSON blocks with 'Контакты поставщиков':", jsonBlocks.map(b => b[1]));

  // Also let's test fetching by searching for all numbers in html that could be gids
  const numbers = [...html.matchAll(/([0-9]{7,12})/g)].map(x => x[1]);
  const uniqueNums = Array.from(new Set(numbers));
  console.log("Candidate GID numbers:", uniqueNums.length);

  for (const num of uniqueNums) {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${num}`;
    try {
      const r = await fetch(csvUrl);
      if (r.ok) {
        const txt = await r.text();
        if (!txt.startsWith('<!DOCTYPE html>')) {
          console.log(`FOUND VALID SHEET FOR GID ${num}! First 120 chars:`, txt.slice(0, 120));
        }
      }
    } catch (e) {}
  }
}

findTabGids().catch(console.error);
