// عرض مبسّط لمعلومات المتصفح والجهاز من سلسلة User-Agent الخام، لعرضها ضمن أثر
// تدقيق التوقيع دون الحاجة لمكتبة كاملة لتحليل User-Agent.
export function parseUserAgent(ua: string | null): string {
  if (!ua) return '—';

  let os = 'نظام غير معروف';
  if (/iphone/i.test(ua)) os = 'iPhone';
  else if (/ipad/i.test(ua)) os = 'iPad';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac os/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = 'متصفح غير معروف';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/chrome\//i.test(ua) && !/chromium/i.test(ua)) browser = 'Chrome';
  else if (/crios\//i.test(ua)) browser = 'Chrome';
  else if (/fxios\//i.test(ua) || /firefox\//i.test(ua)) browser = 'Firefox';
  else if (/safari\//i.test(ua)) browser = 'Safari';

  return `${browser} · ${os}`;
}
