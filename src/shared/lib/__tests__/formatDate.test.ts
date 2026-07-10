import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime } from '../formatDate';

// ملاحظة: اللغة ar-SA تعرض الأرقام بصيغة هندية-عربية افتراضيًا (٢٠٢٦ وليس 2026)؛
// هذا سلوك متوقع للواجهة العربية. ما نتحقق منه هنا هو أن التقويم ميلادي وليس
// هجريًا (لأن ar-SA يستخدم التقويم الهجري افتراضيًا ما لم تُفرض -u-ca-gregory).
describe('formatDate', () => {
  it('يعرض السنة الميلادية ٢٠٢٦ وليس السنة الهجرية المقابلة', () => {
    const result = formatDate('2026-01-01T00:00:00Z');
    expect(result).toContain('٢٠٢٦');
    expect(result).not.toContain('١٤٤٧');
  });

  it('يقبل كائن Date إضافة إلى النص', () => {
    const result = formatDate(new Date('2026-07-10T00:00:00Z'));
    expect(result).toContain('٢٠٢٦');
  });
});

describe('formatDateTime', () => {
  it('يعرض التاريخ والوقت بالسنة الميلادية', () => {
    const result = formatDateTime('2026-07-10T12:00:00Z');
    expect(result).toContain('٢٠٢٦');
  });
});
