import type { CsvCell } from './exportCsv';

// يُصدِّر بيانات جدولية كـ PDF عبر فتح نافذة طباعة جديدة تعرض جدولًا بالعربية
// (RTL) واستدعاء طباعة المتصفح مباشرة، بدل توليد بايتات PDF بمكتبة JS مباشرة —
// تشكيل الحروف العربية في مكتبات كهذه (مثل jsPDF) معطوب افتراضيًا (نفس المشكلة
// التي عولجت يدويًا حرفًا بحرف لمستند العقد النهائي في الخادم عبر arabicShaper.ts)،
// بينما طباعة HTML عبر المتصفح تعرض العربية بشكل صحيح تلقائيًا، ويحفظها
// المستخدم كـ PDF عبر خيار "حفظ كـ PDF" في نافذة الطباعة.
function escapeHtmlCell(value: CsvCell): string {
  const text = value === null || value === undefined ? '' : String(value);
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function exportToPdf(title: string, headers: string[], rows: CsvCell[][]): void {
  const win = window.open('', '_blank');
  if (!win) return;

  const theadHtml = `<tr>${headers.map((h) => `<th>${escapeHtmlCell(h)}</th>`).join('')}</tr>`;
  const tbodyHtml =
    rows.length > 0
      ? rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtmlCell(cell)}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${headers.length}" class="empty">لا توجد بيانات</td></tr>`;

  win.document.write(`<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${escapeHtmlCell(title)}</title>
<style>
  body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 24px; color: #111; }
  h1 { font-size: 18px; margin: 0 0 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: right; }
  th { background: #f2f2f2; font-weight: bold; }
  td.empty { text-align: center; color: #777; }
</style>
</head>
<body>
  <h1>${escapeHtmlCell(title)}</h1>
  <table><thead>${theadHtml}</thead><tbody>${tbodyHtml}</tbody></table>
</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}
