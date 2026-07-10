import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1';

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

// يدمج قيم الحقول المعبّأة فوق نسخة PDF الأصلية، ويُرجع بايتات النسخة النهائية.
// الإحداثيات (pos_x/pos_y/width/height) نِسَب مئوية من أبعاد الصفحة، متوافقة بين
// محرر وضع الحقول في الواجهة وهذا التوليد لأن كليهما يحسبها كنسبة من حجم الصفحة.
export async function generateFinalPdf(
  originalBytes: Uint8Array,
  fields: FieldToRender[],
  fetchImage: (path: string) => Promise<Uint8Array>,
  verificationStamp?: VerificationStamp,
  signerAudits?: SignerAudit[],
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

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
        const image = await pdfDoc.embedPng(bytes);
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
    page.drawText(text, {
      x: boxX + 2,
      y: boxYFromBottom + boxHeight * 0.25,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
      maxWidth: boxWidth - 4,
    });
  }

  if (verificationStamp) {
    const lastPage = pages[pages.length - 1];
    const qrSize = Math.min(70, lastPage.getWidth() * 0.12);
    const margin = 24;
    try {
      // ملاحظة: خطوط PDF القياسية (Helvetica) لا تدعم ترميز الأحرف العربية في pdf-lib
      // (WinAnsi فقط)، لذا يُستخدم تنويه لاتيني/رقمي هنا لتفادي رمي استثناء عند الحفظ.
      const qrImage = await pdfDoc.embedPng(verificationStamp.qrPngBytes);
      lastPage.drawImage(qrImage, { x: margin, y: margin, width: qrSize, height: qrSize });
      lastPage.drawText(`Verification No: ${verificationStamp.number}`, {
        x: margin + qrSize + 8,
        y: margin + qrSize - 12,
        size: 9,
        font,
        color: rgb(0, 0, 0),
      });
      lastPage.drawText(`Date: ${verificationStamp.dateLabel}`, {
        x: margin + qrSize + 8,
        y: margin + qrSize - 26,
        size: 9,
        font,
        color: rgb(0, 0, 0),
      });

      // أثر تدقيق التوقيع (IP والمتصفح/النظام والوقت) لكل طرف، بأرقام الأطراف بدل
      // أسمائها العربية (خطوط PDF القياسية لا تدعم عرض العربية هنا كما هو موضح أعلاه).
      let auditY = margin + qrSize - 40;
      for (const audit of signerAudits ?? []) {
        const line = `Party #${audit.partyIndex} signed from: ${audit.ip ?? '—'} | ${audit.userAgentLabel ?? '—'} | ${audit.signedAtLabel ?? '—'}`;
        lastPage.drawText(line, {
          x: margin + qrSize + 8,
          y: auditY,
          size: 7,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });
        auditY -= 11;
      }
    } catch (err) {
      console.error('تعذّر إضافة شريط التوثيق للمستند', err);
    }
  }

  return pdfDoc.save();
}
