// Day grouping is always done from the viewer's LOCAL calendar date. The server
// runs UTC on Render, so grouping there would file an early-morning IST entry
// under the previous day.

export const localDayKey = (value) => {
  const d = new Date(value);
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

export const dayHeading = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (localDayKey(today) === key) return 'Today';
  if (localDayKey(yesterday) === key) return 'Yesterday';

  return date.toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  });
};

export const timeOfDay = (value) =>
  new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

// Bucket records into { key, heading, items } newest-day-first, newest-item-first.
// `getDate` pulls the timestamp off whatever shape the record has.
export const groupByDay = (records, getDate) => {
  const grouped = new Map();

  for (const record of records) {
    const key = localDayKey(getDate(record));
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(record);
  }

  return [...grouped.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, items]) => ({
      key,
      heading: dayHeading(key),
      items: items.sort((a, b) => new Date(getDate(b)) - new Date(getDate(a)))
    }));
};
