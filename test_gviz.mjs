async function testSheetByName() {
  const spreadsheetId = '1vCZQgzBPv8uahr8ckRI1f-TA_QS6Afz2B9NP_ZMj6ek';
  const sheetNames = [
    'Контакты поставщиков',
    'Контакты',
    'Отдел контента',
    'Коммерческий отдел',
    'Задачи',
    'Новые товары',
    'Свойства',
    'Группы',
    'Поставщики'
  ];

  for (const name of sheetNames) {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;
    try {
      const res = await fetch(url);
      const text = await res.text();
      console.log(`Sheet "${name}" (Status ${res.status}): Length ${text.length}`);
      if (res.ok && !text.includes('<!DOCTYPE html>')) {
        console.log(`  Header / First lines of "${name}":\n`, text.slice(0, 300));
      }
    } catch (e) {
      console.error(name, e.message);
    }
  }
}
testSheetByName().catch(console.error);
