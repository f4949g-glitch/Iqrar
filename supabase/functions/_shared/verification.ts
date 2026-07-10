import QRCode from 'npm:qrcode@1.5.4';
import { escapeHtml } from './renderContractHtml.ts';

// يُولّد رقم توثيق فريدًا من 10 أرقام (يُعاد المحاولة عند تعارض نادر مع رقم موجود).
export async function generateVerificationNumber(
  findExisting: (candidate: string) => Promise<boolean>,
): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = String(Math.floor(1000000000 + Math.random() * 9000000000));
    const exists = await findExisting(candidate);
    if (!exists) return candidate;
  }
  throw new Error('تعذّر توليد رقم توثيق فريد');
}

export function buildVerifyUrl(verificationNumber: string): string {
  const base = Deno.env.get('PUBLIC_SITE_URL') ?? 'https://iqrar-sigma.vercel.app';
  return `${base.replace(/\/$/, '')}/verify?number=${verificationNumber}`;
}

// شريط التوثيق النهائي (رقم التوثيق + التاريخ + رمز QR) يُلحَق بنهاية المستندات
// المُنشأة عبر المحرر النصي — المسح يفتح صفحة التحقق العامة (يلزم إدخال هوية
// الأطراف هناك أيضًا، فالرمز وحده لا يكشف بيانات الوثيقة).
export async function renderVerificationFooterHtml(verificationNumber: string, completedAt: string): Promise<string> {
  const url = buildVerifyUrl(verificationNumber);
  const svg = await QRCode.toString(url, { type: 'svg', margin: 1, width: 110 });
  // -u-ca-gregory: التقويم الافتراضي للغة ar-SA في Intl هو الهجري، ونريد ميلاديًا دائمًا.
  const dateLabel = new Date(completedAt).toLocaleDateString('ar-SA-u-ca-gregory');
  return `<div class="verification-footer">
    <div class="verification-qr">${svg}</div>
    <div class="verification-info">
      <p>رقم التوثيق: <strong>${escapeHtml(verificationNumber)}</strong></p>
      <p>تاريخ التوثيق: <strong>${escapeHtml(dateLabel)}</strong></p>
      <p class="verification-hint">امسح الرمز أو زر صفحة التحقق للتأكد من صحة هذه الوثيقة</p>
    </div>
  </div>`;
}

export async function generateQrPngBytes(verificationNumber: string): Promise<Uint8Array> {
  const url = buildVerifyUrl(verificationNumber);
  const buffer = await QRCode.toBuffer(url, { type: 'png', margin: 1, width: 220 });
  return new Uint8Array(buffer);
}
