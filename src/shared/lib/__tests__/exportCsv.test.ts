import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { exportToCsv } from '../exportCsv';

describe('exportToCsv', () => {
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;
  let clickSpy: ReturnType<typeof vi.spyOn>;
  let capturedBlob: Blob | null;
  let capturedDownload: string | null;

  beforeEach(() => {
    capturedBlob = null;
    capturedDownload = null;
    createObjectURLSpy = vi.fn((blob: Blob) => {
      capturedBlob = blob;
      return 'blob:mock-url';
    });
    revokeObjectURLSpy = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL: createObjectURLSpy, revokeObjectURL: revokeObjectURLSpy });
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      capturedDownload = this.download;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clickSpy.mockRestore();
  });

  it('يضيف امتداد csv. للملف عند غيابه', () => {
    exportToCsv('تقرير', ['العمود'], [['قيمة']]);
    expect(capturedDownload).toBe('تقرير.csv');
  });

  it('لا يكرر الامتداد إن كان موجودًا مسبقًا', () => {
    exportToCsv('تقرير.csv', ['العمود'], [['قيمة']]);
    expect(capturedDownload).toBe('تقرير.csv');
  });

  it('ينتج blob بترميز CSV نصي', async () => {
    exportToCsv('ملف', ['اسم', 'قيمة'], [['أحمد', 100]]);
    expect(capturedBlob).not.toBeNull();
    expect(capturedBlob!.type).toContain('text/csv');
    const text = await capturedBlob!.text();
    expect(text).toContain('اسم,قيمة');
    expect(text).toContain('أحمد,100');
  });

  it('يبدأ المحتوى ببادئة BOM لدعم فتح Excel للعربية بترميز صحيح', async () => {
    exportToCsv('ملف', ['عمود'], [['قيمة']]);
    const bytes = new Uint8Array(await capturedBlob!.arrayBuffer());
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf]);
  });

  it('يُحيط بالقيم المحتوية على فاصلة بعلامتي اقتباس', async () => {
    exportToCsv('ملف', ['عمود'], [['قيمة, بفاصلة']]);
    const text = await capturedBlob!.text();
    expect(text).toContain('"قيمة, بفاصلة"');
  });

  it('يضاعف علامات الاقتباس الداخلية عند الهروب منها', async () => {
    exportToCsv('ملف', ['عمود'], [['نص "مقتبس"']]);
    const text = await capturedBlob!.text();
    expect(text).toContain('"نص ""مقتبس"""');
  });

  it('يحوّل القيم الفارغة (null/undefined) إلى خلايا فارغة', async () => {
    exportToCsv('ملف', ['أ', 'ب'], [[null, undefined]]);
    const text = await capturedBlob!.text();
    expect(text.split('\r\n')[1]).toBe(',');
  });

  it('يُحرِّر عنوان الـ blob بعد النقر لتفادي تسريب الذاكرة', () => {
    exportToCsv('ملف', ['عمود'], [['قيمة']]);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });
});
