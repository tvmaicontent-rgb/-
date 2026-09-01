async function inspectContacts() {
  const spreadsheetId = '1vCZQgzBPv8uahr8ckRI1f-TA_QS6Afz2B9NP_ZMj6ek';
  const gids = ['1556172881', '1825148105'];

  for (const gid of gids) {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
    const res = await fetch(url);
    const text = await res.text();
    console.log(`=== GID ${gid} ===`);
    console.log(`Length: ${text.length}`);
    console.log(`Content sample:\n`, text.slice(0, 800));
  }
}
inspectContacts().catch(console.error);
