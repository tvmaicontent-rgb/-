import fs from 'fs';

async function extractAllTabs() {
  const spreadsheetId = '1vCZQgzBPv8uahr8ckRI1f-TA_QS6Afz2B9NP_ZMj6ek';
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  const res = await fetch(url);
  const html = await res.text();

  // Search for anything like "Контакты" or sheet names in html
  const idx = html.indexOf('Контакт');
  console.log("Index of 'Контакт':", idx);
  if (idx !== -1) {
    console.log("Around 'Контакт':", html.slice(Math.max(0, idx - 200), idx + 200));
  }

  // Look for bootstrap data or sheets data
  // Often inside bootstrapData = {...} or similar
  const matches = [...html.matchAll(/"([^"]+)",\[\],\[\],([0-9]+)/g)];
  console.log("Matches:", matches.map(m => `Name: ${m[1]}, GID: ${m[2]}`));

  // Check all numbers that look like gid in the html
  const gidMatches = [...html.matchAll(/gid=([0-9]+)/g)];
  console.log("All gids in html:", Array.from(new Set(gidMatches.map(m => m[1]))));

  // Let's also search for all sheet names inside docs-sheet-tab or json
  const sheetNames = [...html.matchAll(/\["([^"]+)",[0-9]+,[0-9]+,[0-9]+,"[0-9]+"/g)];
  console.log("Sheet names regex 1:", sheetNames.map(m => m[1]));

  // Let's dump all occurrences of "gid" or "sheet" or search for Cyrillic words
  const cyrillic = [...html.matchAll(/([А-Яа-яЁё\s]{4,30})/g)].map(m => m[1].trim()).filter(Boolean);
  const uniqueCyrillic = Array.from(new Set(cyrillic)).filter(w => w.length > 5);
  console.log("Some Cyrillic strings in HTML:", uniqueCyrillic.slice(0, 30));
}

extractAllTabs().catch(console.error);
