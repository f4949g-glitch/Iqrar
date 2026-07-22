import { describe, expect, it } from 'vitest';
import { parseUserAgent } from '../parseUserAgent';

describe('parseUserAgent', () => {
  it('يعيد شرطة عند غياب سلسلة User-Agent', () => {
    expect(parseUserAgent(null)).toBe('—');
  });

  it('يتعرّف على iPhone وSafari', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    expect(parseUserAgent(ua)).toBe('Safari · iPhone');
  });

  it('يتعرّف على Android وChrome', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36';
    expect(parseUserAgent(ua)).toBe('Chrome · Android');
  });

  it('يتعرّف على Windows وEdge', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edg/115.0.1901.183';
    expect(parseUserAgent(ua)).toBe('Edge · Windows');
  });

  it('يتعرّف على macOS وChrome', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36';
    expect(parseUserAgent(ua)).toBe('Chrome · macOS');
  });

  it('يتعرّف على Firefox على Windows', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0';
    expect(parseUserAgent(ua)).toBe('Firefox · Windows');
  });

  it('يتعرّف على Linux', () => {
    const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36';
    expect(parseUserAgent(ua)).toBe('Chrome · Linux');
  });

  it('يعيد "غير معروف" لكلا الجزأين عند سلسلة غير قابلة للتصنيف', () => {
    expect(parseUserAgent('SomeWeirdBot/1.0')).toBe('متصفح غير معروف · نظام غير معروف');
  });
});
