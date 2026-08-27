// Tiny in-memory CSV builder — no filesystem, no `csv-writer` dependency.
// Replaces the old exams_service prototype's hardcoded `/tmp/test_${id}.csv`
// write (broke outside Linux, raced on concurrent exports, leaked disk).
// `columns` = [{ key, header }]; `rows` = array of plain objects.
function csvField(value) {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows, columns) {
  const header = columns.map((c) => csvField(c.header)).join(',');
  const lines = rows.map((row) => columns.map((c) => csvField(row[c.key])).join(','));
  return [header, ...lines].join('\r\n') + '\r\n';
}

module.exports = { toCsv };
