import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'https://esm.sh/pdf-lib@1.17.1';
import fontkit from 'https://esm.sh/@pdf-lib/fontkit@1.1.1';
import { getArabicFontBytes } from './arabicFont.ts';
import { reshapeArabicText } from './arabicShaper.ts';

export interface FieldToRender {
  field_type: string;
  page_number: number;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  value: unknown;
}

const IMAGE_FIELD_TYPES = new Set(['signature', 'image', 'logo', 'stamp']);

// خط Helvetica القياسي المستخدم لقيم الحقول النصية لا يملك أي رموز عربية، فكان
// نص عربي يكتبه طرف في حقل نصي بعقد PDF يظهر مفقودًا/مشوَّهًا في المستند
// النهائي (لا مجرد "معكوس"). نتحقق من وجود حرف عربي واحد على الأقل ونحوّل
// لخط عربي مُشكَّل (نفس المستخدَم في صفحة التوثيق) عند الحاجة فقط.
const ARABIC_CHAR_RE = /[؀-ۿ]/;
function containsArabic(text: string): boolean {
  return ARABIC_CHAR_RE.test(text);
}

export interface VerificationStamp {
  number: string;
  dateLabel: string;
  qrPngBytes: Uint8Array;
}

export interface SignerAudit {
  partyIndex: number;
  ip: string | null;
  userAgentLabel: string | null;
  signedAtLabel: string | null;
}

// نفس التسميات المستخدمة في ContractDetailPage.tsx (PARTY_STATUS_LABEL) للاتساق.
const STATUS_LABELS_AR: Record<string, string> = {
  signed: 'وقّع',
  rejected: 'مرفوض',
  pending: 'بانتظار التوقيع',
  viewed: 'تمت المشاهدة',
};

export interface PartyForVerificationPage {
  orderIndex: number;
  roleLabel: string;
  fullName: string;
  nationalId: string | null;
  status: string;
  signedAtLabel: string | null;
}

// يدمج قيم الحقول المعبّأة فوق نسخة PDF الأصلية، ويُرجع بايتات النسخة النهائية.
// الإحداثيات (pos_x/pos_y/width/height) نِسَب مئوية من أبعاد الصفحة، متوافقة بين
// محرر وضع الحقول في الواجهة وهذا التوليد لأن كليهما يحسبها كنسبة من حجم الصفحة.
export async function generateFinalPdf(
  originalBytes: Uint8Array,
  fields: FieldToRender[],
  fetchImage: (path: string) => Promise<Uint8Array>,
  verificationStamp?: VerificationStamp,
  signerAudits?: SignerAudit[],
  companyLogoBytes?: Uint8Array | null,
  parties?: PartyForVerificationPage[],
  documentTitle?: string,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalBytes);
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  // يُحمَّل الخط العربي مرة واحدة فقط وعند أول حاجة فعلية له (قيمة حقل تحوي
  // حرفًا عربيًا)، لا لكل مستند بصرف النظر عن محتواه.
  let arabicFieldFont: Awaited<ReturnType<typeof pdfDoc.embedFont>> | null = null;
  const getArabicFieldFont = async () => {
    if (!arabicFieldFont) arabicFieldFont = await pdfDoc.embedFont(await getArabicFontBytes(), { subset: false });
    return arabicFieldFont;
  };

  // شعار المنشأة (اختياري): يُرسَم بارزًا في الزاوية العلوية لكل صفحة من صفحات
  // المستند، كترويسة (letterhead) ثابتة على مدى المستند بأكمله.
  let logoImage: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null = null;
  if (companyLogoBytes) {
    try {
      logoImage = await pdfDoc.embedPng(companyLogoBytes).catch(() => pdfDoc.embedJpg(companyLogoBytes));
      const logoSize = 52;
      const logoMargin = 20;
      for (const page of pages) {
        const pageWidth = page.getWidth();
        const pageHeight = page.getHeight();
        page.drawImage(logoImage, {
          x: pageWidth - logoMargin - logoSize,
          y: pageHeight - logoMargin - logoSize,
          width: logoSize,
          height: logoSize,
        });
      }
    } catch (err) {
      console.error('تعذّر إضافة شعار المنشأة للمستند', err);
    }
  }

  for (const field of fields) {
    if (field.value == null || field.value === '') continue;
    const page = pages[field.page_number - 1];
    if (!page) continue;

    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();
    const boxX = pageWidth * (field.pos_x / 100);
    const boxWidth = pageWidth * (field.width / 100);
    const boxHeight = pageHeight * (field.height / 100);
    const boxYFromBottom = pageHeight * (1 - (field.pos_y + field.height) / 100);

    if (IMAGE_FIELD_TYPES.has(field.field_type)) {
      const value = field.value as { path?: string };
      if (!value.path) continue;
      try {
        const bytes = await fetchImage(value.path);
        // الصورة قد تكون PNG (لوحة التوقيع تُصدِّر PNG دائمًا) أو JPEG (صورة شعار/ختم
        // مرفوعة من المستخدم، شائعة جدًا من كاميرا الجوال) — embedPng وحدها تفشل
        // بصمت على JPEG فيختفي الحقل من المستند النهائي دون أي خطأ ظاهر للمستخدم.
        const image = await pdfDoc.embedPng(bytes).catch(() => pdfDoc.embedJpg(bytes));
        page.drawImage(image, { x: boxX, y: boxYFromBottom, width: boxWidth, height: boxHeight });
      } catch (err) {
        console.error('تعذّر تضمين صورة الحقل', field, err);
      }
      continue;
    }

    if (field.field_type === 'checkbox') {
      if (field.value === true) {
        const size = Math.min(boxWidth, boxHeight);
        page.drawText('X', { x: boxX, y: boxYFromBottom, size: size * 0.9, font, color: rgb(0, 0, 0) });
      }
      continue;
    }

    const text = String(field.value);
    const fontSize = Math.max(7, Math.min(12, boxHeight * 0.6));
    if (containsArabic(text)) {
      const arabicFont = await getArabicFieldFont();
      drawArabicRightAligned(page, text, boxX + boxWidth - 2, boxYFromBottom + boxHeight * 0.25, fontSize, arabicFont, boxWidth - 4);
    } else {
      page.drawText(text, {
        x: boxX + 2,
        y: boxYFromBottom + boxHeight * 0.25,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
        maxWidth: boxWidth - 4,
      });
    }
  }

  if (verificationStamp) {
    try {
      await appendVerificationPages(pdfDoc, font, verificationStamp, parties ?? [], signerAudits ?? [], documentTitle ?? '', logoImage, pages[0]);
    } catch (err) {
      // شبكة أو خط غير متاح مؤقتًا: لا يجوز أن يفشل توثيق العقد بالكامل بسبب
      // ذلك — تُضاف صفحة توثيق مبسّطة (رقم + تاريخ + QR بلا أسماء عربية) بدل
      // الصفحة الكاملة، بدل رسم شيء فوق محتوى المستند الأصلي كما كان سابقًا.
      console.error('تعذّر إنشاء صفحة التوثيق الكاملة، سيُضاف ختم مبسّط بدلًا منها', err);
      await appendMinimalVerificationPage(pdfDoc, font, verificationStamp, pages[0]);
    }
  }

  return pdfDoc.save();
}

async function appendMinimalVerificationPage(pdfDoc: PDFDocument, latinFont: PDFFont, stamp: VerificationStamp, referencePage: PDFPage) {
  const page = pdfDoc.addPage([referencePage.getWidth(), referencePage.getHeight()]);
  const rightEdge = page.getWidth() - 40;
  const y = page.getHeight() - 60;
  const qrSize = 100;
  try {
    const qrImage = await pdfDoc.embedPng(stamp.qrPngBytes);
    page.drawImage(qrImage, { x: rightEdge - qrSize, y: y - qrSize, width: qrSize, height: qrSize });
  } catch (err) {
    console.error('تعذّر تضمين رمز QR في الختم المبسّط', err);
  }
  const labelRight = rightEdge - qrSize - 14;
  drawLatinRightAligned(page, `Verification No: ${stamp.number}`, labelRight, y - 20, 11, latinFont);
  drawLatinRightAligned(page, `Date: ${stamp.dateLabel}`, labelRight, y - 38, 11, latinFont);
}

// يرسم نصًا عربيًا محاذًى لليمين ضمن عرض عمود مُحدَّد (يُقصّ الحرف الزائد بدل
// تجاوز حدود العمود، لأن pdf-lib لا يلفّ النص تلقائيًا).
function drawArabicRightAligned(
  page: PDFPage,
  text: string,
  rightEdge: number,
  y: number,
  size: number,
  font: PDFFont,
  maxWidth: number,
) {
  let shaped = reshapeArabicText(text);
  let width = font.widthOfTextAtSize(shaped, size);
  while (width > maxWidth && text.length > 1) {
    text = text.slice(0, -1);
    // '…' غير مدعوم في الخط المضمَّن (يُستبدَل بمسافة عبر reshapeArabicText)،
    // فتُستخدم نقطتان عاديتان كإشارة اقتصاص مرئية بدلًا منه.
    shaped = reshapeArabicText(text + '..');
    width = font.widthOfTextAtSize(shaped, size);
  }
  page.drawText(shaped, { x: rightEdge - width, y, size, font, color: rgb(0, 0, 0) });
}

function drawLatinRightAligned(page: PDFPage, text: string, rightEdge: number, y: number, size: number, font: PDFFont) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: rightEdge - width, y, size, font, color: rgb(0.15, 0.15, 0.15) });
}

interface Column {
  key: keyof PartyForVerificationPage | 'index';
  label: string;
  width: number;
  arabic: boolean;
}

const COLUMNS: Column[] = [
  { key: 'index', label: '#', width: 20, arabic: false },
  { key: 'roleLabel', label: 'الدور', width: 90, arabic: true },
  { key: 'fullName', label: 'الاسم', width: 130, arabic: true },
  { key: 'nationalId', label: 'رقم الهوية', width: 85, arabic: false },
  { key: 'status', label: 'الحالة', width: 68, arabic: true },
  { key: 'signedAtLabel', label: 'وقت التوقيع', width: 92, arabic: false },
];

// صفحة/صفحات توثيق مستقلة تُلحَق بنهاية المستند بدل رسم الختم فوق آخر صفحة
// موجودة (كان يتسبب بتراكب مع محتوى حقيقي للمستند) — تحمل رمز QR ورقم التوثيق
// وجدول أطراف كامل بأسمائهم وأدوارهم بالعربية الصحيحة (مُشكَّلة عبر
// arabicShaper.ts، لأن pdf-lib لا يدعم تشكيل العربية تلقائيًا).
async function appendVerificationPages(
  pdfDoc: PDFDocument,
  latinFont: PDFFont,
  stamp: VerificationStamp,
  parties: PartyForVerificationPage[],
  signerAudits: SignerAudit[],
  documentTitle: string,
  logoImage: Awaited<ReturnType<typeof PDFDocument.prototype.embedPng>> | null,
  referencePage: PDFPage,
) {
  const arabicFontBytes = await getArabicFontBytes();
  // subset:true يُفسِد الحروف المركّبة (composite glyphs) في هذا الخط تحديدًا
  // (تظهر فارغة تمامًا) — تحقّقنا محليًا أن subset:false يُصلح ذلك، بتكلفة حجم
  // أكبر قليلًا للملف النهائي (تضمين الخط كاملًا بدل استخلاص المستخدَم منه فقط).
  const arabicFont = await pdfDoc.embedFont(arabicFontBytes, { subset: false });

  const pageWidth = referencePage.getWidth();
  const pageHeight = referencePage.getHeight();
  const margin = 40;
  const rightEdge = pageWidth - margin;
  const rowHeight = 20;
  const tableWidth = COLUMNS.reduce((sum, c) => sum + c.width, 0);
  const tableLeftEdge = rightEdge - tableWidth;

  let qrImage: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null = null;
  try {
    qrImage = await pdfDoc.embedPng(stamp.qrPngBytes);
  } catch (err) {
    console.error('تعذّر تضمين رمز QR', err);
  }

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  function drawHeader() {
    if (logoImage) {
      const logoSize = 44;
      page.drawImage(logoImage!, { x: rightEdge - logoSize, y: pageHeight - margin - logoSize + 10, width: logoSize, height: logoSize });
    }
    drawArabicRightAligned(page, 'صفحة التوثيق', rightEdge, y, 18, arabicFont, tableWidth - (logoImage ? 56 : 0));
    y -= 26;
    if (documentTitle) {
      drawArabicRightAligned(page, documentTitle, rightEdge, y, 12, arabicFont, tableWidth);
      y -= 22;
    }
  }

  function drawQrBlock() {
    const qrSize = 90;
    if (qrImage) {
      page.drawImage(qrImage!, { x: rightEdge - qrSize, y: y - qrSize, width: qrSize, height: qrSize });
    }
    const infoRight = rightEdge - qrSize - 14;
    drawLatinRightAligned(page, `Verification No: ${stamp.number}`, infoRight, y - 14, 10, latinFont);
    drawLatinRightAligned(page, `Date: ${stamp.dateLabel}`, infoRight, y - 30, 10, latinFont);
    drawArabicRightAligned(page, 'امسح الرمز أو زر صفحة التحقق للتأكد من صحة هذه الوثيقة', infoRight, y - 48, 9, arabicFont, infoRight - margin);
    y -= qrSize + 24;
  }

  function drawTableHeader() {
    let cursor = rightEdge;
    for (const col of COLUMNS) {
      const colLeft = cursor - col.width;
      // عناوين الأعمدة كلها عربية (حتى أعمدة القيم الرقمية مثل "رقم الهوية")،
      // بخلاف قيم الصفوف التي قد تكون رقمية فعلًا (col.arabic أدناه يخص القيم لا العناوين).
      drawArabicRightAligned(page, col.label, cursor, y, 9.5, arabicFont, col.width);
      cursor = colLeft;
    }
    y -= 6;
    page.drawLine({ start: { x: tableLeftEdge, y }, end: { x: rightEdge, y }, thickness: 0.75, color: rgb(0.6, 0.6, 0.6) });
    y -= rowHeight - 4;
  }

  function ensureSpace(needed: number) {
    if (y - needed < margin + 20) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
      drawArabicRightAligned(page, 'صفحة التوثيق (تتمة)', rightEdge, y, 14, arabicFont, tableWidth);
      y -= 30;
      drawTableHeader();
    }
  }

  drawHeader();
  drawQrBlock();
  drawTableHeader();

  for (const party of parties) {
    ensureSpace(rowHeight);
    let cursor = rightEdge;
    const rowValues: Array<[Column, string]> = [
      [COLUMNS[0], String(party.orderIndex)],
      // "—" (em dash) غير مدعوم في الخط العربي المضمَّن، فتُستخدم بدائل آمنة:
      // كلمة عربية للأعمدة العربية، وشرطتان لاتينيتان للأعمدة الرقمية (يدعمها Helvetica).
      [COLUMNS[1], party.roleLabel || 'غير محدد'],
      [COLUMNS[2], party.fullName || 'غير محدد'],
      [COLUMNS[3], party.nationalId || '--'],
      [COLUMNS[4], STATUS_LABELS_AR[party.status] ?? party.status],
      [COLUMNS[5], party.signedAtLabel || '—'],
    ];
    for (const [col, value] of rowValues) {
      if (col.arabic) {
        drawArabicRightAligned(page, value, cursor, y, 9, arabicFont, col.width);
      } else {
        drawLatinRightAligned(page, value, cursor, y, 9, latinFont);
      }
      cursor -= col.width;
    }
    y -= rowHeight;
  }

  if (signerAudits.length > 0) {
    ensureSpace(20 + signerAudits.length * 12);
    y -= 10;
    drawLatinRightAligned(page, 'Signing audit trail:', rightEdge, y, 9, latinFont);
    y -= 13;
    for (const audit of signerAudits) {
      ensureSpace(12);
      const line = `Party #${audit.partyIndex} signed from: ${audit.ip ?? '—'} | ${audit.userAgentLabel ?? '—'} | ${audit.signedAtLabel ?? '—'}`;
      drawLatinRightAligned(page, line, rightEdge, y, 7, latinFont);
      y -= 11;
    }
  }
}
