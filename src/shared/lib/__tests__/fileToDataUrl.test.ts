import { describe, expect, it } from 'vitest';
import { fileToDataUrl } from '../fileToDataUrl';

describe('fileToDataUrl', () => {
  it('يحوّل ملفًا نصيًا إلى data URL يبدأ بالنوع الصحيح', async () => {
    const file = new File(['hello world'], 'test.txt', { type: 'text/plain' });
    const result = await fileToDataUrl(file);
    expect(result).toMatch(/^data:text\/plain;base64,/);
  });

  it('يحوّل ملف صورة إلى data URL يحتفظ بنوع MIME', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'logo.png', { type: 'image/png' });
    const result = await fileToDataUrl(file);
    expect(result.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('يرفض الوعد عند فشل القراءة', async () => {
    const file = new File(['x'], 'test.txt');
    const originalReadAsDataURL = FileReader.prototype.readAsDataURL;
    FileReader.prototype.readAsDataURL = function (this: FileReader) {
      this.onerror?.(new ProgressEvent('error') as unknown as ProgressEvent<FileReader>);
    };
    await expect(fileToDataUrl(file)).rejects.toBeDefined();
    FileReader.prototype.readAsDataURL = originalReadAsDataURL;
  });
});
