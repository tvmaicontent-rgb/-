async function findTabs() {
  const ids = [
    '1vCZQgzBPv8uahr8ckRI1f-TA_QS6Afz2B9NP_ZMj6ek',
    '1hV2tBPZDxlEvkXYrzo9rsS40MuJ_eMQbzWr9WQRgytw'
  ];

  for (const id of ids) {
    console.log(`=== SPREADSHEET ${id} ===`);
    try {
      const res = await fetch(`https://docs.google.com/spreadsheets/d/${id}/htmlview`);
      const html = await res.text();
      // Look for sheet tabs in htmlview
      // Usually <li id="sheet-button-..."><a>Sheet Name</a></li> or item in sheets-viewport
      const tabRegex = /id="sheet-button-([0-9]+)"[^>]*><a[^>]*>([^<]+)<\/a>/g;
      let match;
      let count = 0;
      while ((match = tabRegex.exec(html)) !== null) {
        console.log(`  Tab: "${match[2]}" -> GID: ${match[1]}`);
        count++;
      }
      if (count === 0) {
        // try another regex for htmlview: <div class="goog-inline-block ... id="0">...
        const reg2 = /<li class="[^"]*" id="sheet-button-([0-9]+)">[\s\S]*?<a[^>]*>(.*?)<\/a>/g;
        while ((match = reg2.exec(html)) !== null) {
          console.log(`  Tab2: "${match[2].trim()}" -> GID: ${match[1]}`);
          count++;
        }
      }
      console.log(`Total tabs found in ${id}: ${count}`);
    } catch (e) {
      console.error(e);
    }
  }
}
findTabs().catch(console.error);
