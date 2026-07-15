// يُصدِّر بيانات جدولية كملف CSV يفتحه Excel مباشرة بترميز صحيح للعربية. نستخدم
// CSV بدل مكتبة xlsx خارجية لأن Excel يفتح CSV أصلًا دون أي إضافات، وبادئة BOM
// (﻿) هي ما يجعل Excel تحديدًا (لا كل قارئ CSV) يتعرّف على ترميز UTF-8
// بدل عرض العربية كرموز غير مفهومة.
type CsvCell = string | number | null | undefined;

function escapeCsvCell(value: CsvCell): string {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function exportToCsv(filename: string, headers: string[], rows: CsvCell[][]): void {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(','));
  const csv = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
