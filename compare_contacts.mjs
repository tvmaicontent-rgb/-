async function compareContacts() {
  const spreadsheetId = '1vCZQgzBPv8uahr8ckRI1f-TA_QS6Afz2B9NP_ZMj6ek';
  for (const gid of ['1556172881', '1825148105']) {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
    const res = await fetch(url);
    const text = await res.text();
    console.log(`=== GID ${gid} ===`);
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    console.log(`Rows: ${lines.length}`);
    lines.forEach((l, idx) => {
      console.log(`  [${idx}]: ${l.slice(0, 80)}`);
    });
  }
}
compareContacts().catch(console.error);
