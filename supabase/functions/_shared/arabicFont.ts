// خط Amiri (Regular) — خط عربي تقليدي بتغطية شاملة لأشكال العرض العربية
// (Arabic Presentation Forms، تحقّقنا من كل رمز يُنتجه arabicShaper.ts موجود
// فيه) يُستخدم لتوليد صفحة التوثيق داخل ملفات PDF المرفوعة. لا يُضمَّن الخط في
// الكود المصدري لأنه كبير الحجم (~430 كيلوبايت) وسيتطلب سلسلة base64 عملاقة
// معرّضة للتلف عند إعادة كتابتها؛ بدلًا من ذلك يُجلَب مرة واحدة عند أول طلب
// ويُخزَّن مؤقتًا في الذاكرة (يبقى Deno isolate دافئًا بين الطلبات المتتالية).
// المصدر: مستودع google/fonts (رخصة SIL Open Font License) — مضيف مستقر
// وموثوق للحزم مفتوحة المصدر.
const AMIRI_FONT_URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/Amiri-Regular.ttf';

let cachedFontBytes: Uint8Array | null = null;

export async function getArabicFontBytes(): Promise<Uint8Array> {
  if (cachedFontBytes) return cachedFontBytes;
  const res = await fetch(AMIRI_FONT_URL);
  if (!res.ok) throw new Error(`تعذّر تحميل الخط العربي (${res.status})`);
  cachedFontBytes = new Uint8Array(await res.arrayBuffer());
  return cachedFontBytes;
}
