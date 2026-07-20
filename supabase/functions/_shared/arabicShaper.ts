// مُشكِّل عربي مبسّط: يحوّل نصًا عربيًا منطقيًا إلى سلسلة من رموز "أشكال العرض"
// (Arabic Presentation Forms) القابلة للرسم مباشرة بـ pdf-lib، ثم يعكس ترتيب
// السلسلة الناتجة بالكامل ليُقرأ بصريًا من اليمين لليسار عند رسمها من اليسار
// لليمين. ضروري لأن pdf-lib لا يملك محرّك تشكيل نصوص (لا ربط بين الحروف ولا
// دعم RTL تلقائي) — انظر التعليق في generateFinalPdf.ts.
//
// يُستخدم فقط على نصوص عربية بحتة (أسماء أطراف، عناوين، تسميات أدوار) — لا
// يدعم مزج الأرقام أو اللاتينية داخل نفس السلسلة بشكل صحيح (ستُعكَس مواضعها
// حرفيًا أيضًا)؛ الحقول الرقمية (الهوية، التاريخ، رقم التوثيق) تُرسم دائمًا في
// خانات منفصلة تمامًا عن أي نص عربي، لا كسلاسل مدمجة.
//
// قيد معروف: النص الناتج يستخدم رموز Presentation Forms بدل الحروف الأصلية،
// فسيظهر بشكل صحيح بصريًا عند العرض/الطباعة، لكن نسخه من الـ PDF (Ctrl+C) لن
// يُنتج نصًا عربيًا عاديًا قابلاً لإعادة الاستخدام مباشرة.
//
// الأرقام المُضمَّنة داخل نص عربي (مثال: اسم جهة يحتوي رقمًا) تُعامَل كوحدة
// واحدة عند العكس النهائي فلا ينقلب ترتيبها الداخلي (انظر تجميع "tokens" في
// reshapeArabicText) — الحروف اللاتينية المُضمَّنة لا تزال غير مدعومة وتُستبدَل
// بمسافة (خارج SAFE_OTHER).

type JoinType = 'D' | 'R' | 'N'; // dual-joining / right-joining-only / non-joining

interface LetterEntry {
  type: JoinType;
  forms: string[]; // [isolated, final] أو [isolated, final, initial, medial]
}

const TABLE: Record<string, LetterEntry> = {
  'ء': { type: 'N', forms: ['ﺀ'] },
  'آ': { type: 'R', forms: ['ﺁ', 'ﺂ'] },
  'أ': { type: 'R', forms: ['ﺃ', 'ﺄ'] },
  'ؤ': { type: 'R', forms: ['ﺅ', 'ﺆ'] },
  'إ': { type: 'R', forms: ['ﺇ', 'ﺈ'] },
  'ئ': { type: 'D', forms: ['ﺉ', 'ﺊ', 'ﺋ', 'ﺌ'] },
  'ا': { type: 'R', forms: ['ﺍ', 'ﺎ'] },
  'ب': { type: 'D', forms: ['ﺏ', 'ﺐ', 'ﺑ', 'ﺒ'] },
  'ة': { type: 'R', forms: ['ﺓ', 'ﺔ'] },
  'ت': { type: 'D', forms: ['ﺕ', 'ﺖ', 'ﺗ', 'ﺘ'] },
  'ث': { type: 'D', forms: ['ﺙ', 'ﺚ', 'ﺛ', 'ﺜ'] },
  'ج': { type: 'D', forms: ['ﺝ', 'ﺞ', 'ﺟ', 'ﺠ'] },
  'ح': { type: 'D', forms: ['ﺡ', 'ﺢ', 'ﺣ', 'ﺤ'] },
  'خ': { type: 'D', forms: ['ﺥ', 'ﺦ', 'ﺧ', 'ﺨ'] },
  'د': { type: 'R', forms: ['ﺩ', 'ﺪ'] },
  'ذ': { type: 'R', forms: ['ﺫ', 'ﺬ'] },
  'ر': { type: 'R', forms: ['ﺭ', 'ﺮ'] },
  'ز': { type: 'R', forms: ['ﺯ', 'ﺰ'] },
  'س': { type: 'D', forms: ['ﺱ', 'ﺲ', 'ﺳ', 'ﺴ'] },
  'ش': { type: 'D', forms: ['ﺵ', 'ﺶ', 'ﺷ', 'ﺸ'] },
  'ص': { type: 'D', forms: ['ﺹ', 'ﺺ', 'ﺻ', 'ﺼ'] },
  'ض': { type: 'D', forms: ['ﺽ', 'ﺾ', 'ﺿ', 'ﻀ'] },
  'ط': { type: 'D', forms: ['ﻁ', 'ﻂ', 'ﻃ', 'ﻄ'] },
  'ظ': { type: 'D', forms: ['ﻅ', 'ﻆ', 'ﻇ', 'ﻈ'] },
  'ع': { type: 'D', forms: ['ﻉ', 'ﻊ', 'ﻋ', 'ﻌ'] },
  'غ': { type: 'D', forms: ['ﻍ', 'ﻎ', 'ﻏ', 'ﻐ'] },
  'ف': { type: 'D', forms: ['ﻑ', 'ﻒ', 'ﻓ', 'ﻔ'] },
  'ق': { type: 'D', forms: ['ﻕ', 'ﻖ', 'ﻗ', 'ﻘ'] },
  'ك': { type: 'D', forms: ['ﻙ', 'ﻚ', 'ﻛ', 'ﻜ'] },
  'ل': { type: 'D', forms: ['ﻝ', 'ﻞ', 'ﻟ', 'ﻠ'] },
  'م': { type: 'D', forms: ['ﻡ', 'ﻢ', 'ﻣ', 'ﻤ'] },
  'ن': { type: 'D', forms: ['ﻥ', 'ﻦ', 'ﻧ', 'ﻨ'] },
  'ه': { type: 'D', forms: ['ﻩ', 'ﻪ', 'ﻫ', 'ﻬ'] },
  'و': { type: 'R', forms: ['ﻭ', 'ﻮ'] },
  'ى': { type: 'R', forms: ['ﻯ', 'ﻰ'] },
  'ي': { type: 'D', forms: ['ﻱ', 'ﻲ', 'ﻳ', 'ﻴ'] },
};

// تشكيل (حركات) لا يُعتمَد عليه في الأسماء/التسميات هنا، يُحذف لتبسيط المُشكِّل.
const TASHKEEL = new Set(['ً', 'ٌ', 'ٍ', 'َ', 'ُ', 'ِ', 'ّ', 'ْ', 'ٰ']);

// لام + أحد أشكال الألف = رِبَاط إلزامي في الطباعة العربية (isolated, final).
const LAM_ALEF: Record<string, [string, string]> = {
  'آ': ['ﻵ', 'ﻶ'],
  'أ': ['ﻷ', 'ﻸ'],
  'إ': ['ﻹ', 'ﻺ'],
  'ا': ['ﻻ', 'ﻼ'],
};

function joinType(ch: string): JoinType {
  return TABLE[ch]?.type ?? 'N';
}

// خط Noto Naskh Arabic المُضمَّن لا يغطي كل علامات الترقيم اللاتينية (كالأقواس
// أو الشرطة)، وسيرسمها fontkit كمربع فارغ (.notdef) بدل رمي استثناء — لتفادي
// ظهور مربعات فارغة في وثيقة رسمية، تُستبدَل أي رموز غير مدعومة بمسافة.
const SAFE_OTHER = new Set([' ', ',', '.', ':', '،', '؛', '؟', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);

function isSafeChar(ch: string): boolean {
  return Boolean(TABLE[ch]) || TASHKEEL.has(ch) || SAFE_OTHER.has(ch);
}

export function reshapeArabicText(input: string): string {
  const sanitized = Array.from(input)
    .map((c) => (isSafeChar(c) ? c : ' '))
    .join('');
  const chars = Array.from(sanitized).filter((c) => !TASHKEEL.has(c));
  const out: string[] = [];
  const isDigit: boolean[] = [];

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const entry = TABLE[ch];

    if (!entry) {
      out.push(ch);
      isDigit.push(ch >= '0' && ch <= '9');
      continue;
    }

    if (ch === 'ل' && i + 1 < chars.length && LAM_ALEF[chars[i + 1]]) {
      const prevConnects = i > 0 && joinType(chars[i - 1]) === 'D';
      const [isolated, final] = LAM_ALEF[chars[i + 1]];
      out.push(prevConnects ? final : isolated);
      isDigit.push(false);
      i += 1;
      continue;
    }

    const prevConnects = i > 0 && joinType(chars[i - 1]) === 'D';
    const nextAccepts = i + 1 < chars.length && joinType(chars[i + 1]) !== 'N';
    const connectsToNext = entry.type === 'D' && nextAccepts;

    let formIndex: number;
    if (prevConnects && connectsToNext) formIndex = 3;
    else if (prevConnects && !connectsToNext) formIndex = 1;
    else if (!prevConnects && connectsToNext) formIndex = 2;
    else formIndex = 0;

    out.push(entry.forms[formIndex] ?? entry.forms[0]);
    isDigit.push(false);
  }

  // عكس السلسلة بالكامل حرفًا حرفًا صحيح للحروف العربية (كل حرف وحدة بصرية
  // مستقلة)، لكنه يقلب ترتيب أي رقم متعدد الخانات مضمَّن داخل النص (مثال:
  // "2024" تصبح "4202"). الحل: تجميع خانات الأرقام المتتالية في "رمز" واحد
  // يبقى ترتيبه الداخلي كما هو، ثم عكس ترتيب الرموز (لا الأحرف) ككل.
  const tokens: string[] = [];
  for (let i = 0; i < out.length; i++) {
    if (isDigit[i] && tokens.length > 0 && isDigit[i - 1]) {
      tokens[tokens.length - 1] += out[i];
    } else {
      tokens.push(out[i]);
    }
  }

  return tokens.reverse().join('');
}
