import { useEffect, useMemo, useState } from 'react';

// حقل تاريخ مبني من ثلاث قوائم (يوم/شهر/سنة) بدل <input type="date"> الأصلي —
// المتحكم الأصلي على iOS يعرض التقويم الهجري إذا كان تقويم الجهاز مضبوطًا على
// أم القرى، رغم أن القيمة المخزّنة ميلادية أصلاً؛ هذا الحقل يضمن عرضًا ميلاديًا
// دائمًا بغض النظر عن إعدادات الجهاز.

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

interface GregorianDateInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

interface LocalDate {
  year: string;
  month: string;
  day: string;
}

function parseValue(value: string): LocalDate {
  // نُزيل الأصفار البادئة (مثل "05") لأن قيم <option> غير مبطّنة بالصفر (1..31)؛
  // مقارنة السلاسل الحرفية لعنصر <select> تفشل بصمت بين "05" و"5".
  const [y, m, d] = value ? value.split('-') : ['', '', ''];
  return { year: y ?? '', month: m ? String(Number(m)) : '', day: d ? String(Number(d)) : '' };
}

export function GregorianDateInput({ value, onChange, required }: GregorianDateInputProps) {
  // حالة محلية تراكم اختيارات اليوم/الشهر/السنة المستقلة عبر القوائم الثلاث.
  // لو اعتمدنا فقط على تفكيك خاصية value في كل مرة (كما في الإصدار السابق) فسيُعاد
  // حساب الحقلين الآخرين من value القديمة (لا تزال فارغة لحين اكتمال الثلاثة معًا)
  // في كل استدعاء onChange، فتُفقَد كل قيمة يختارها المستخدم فورًا — حلقة مفرغة
  // تمنع إكمال التاريخ عمليًا عبر التفاعل الحقيقي.
  const [local, setLocal] = useState<LocalDate>(() => parseValue(value));

  useEffect(() => {
    setLocal(parseValue(value));
  }, [value]);

  const daysInMonth = useMemo(() => {
    if (!local.year || !local.month) return 31;
    return new Date(Number(local.year), Number(local.month), 0).getDate();
  }, [local.year, local.month]);

  const update = (patch: Partial<LocalDate>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange(
      next.year && next.month && next.day
        ? `${next.year.padStart(4, '0')}-${next.month.padStart(2, '0')}-${next.day.padStart(2, '0')}`
        : '',
    );
  };

  const selectClass = 'min-w-0 flex-1 rounded-lg border border-line bg-white px-2 py-2.5 text-center text-sm text-ink outline-none focus:border-seal';

  return (
    <div className="flex gap-2" dir="ltr">
      <select required={required} value={local.day} onChange={(e) => update({ day: e.target.value })} className={selectClass}>
        <option value="" disabled>يوم</option>
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
      <select required={required} value={local.month} onChange={(e) => update({ month: e.target.value })} className={selectClass}>
        <option value="" disabled>شهر</option>
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>{m}</option>
        ))}
      </select>
      <select required={required} value={local.year} onChange={(e) => update({ year: e.target.value })} className={selectClass}>
        <option value="" disabled>سنة</option>
        {Array.from({ length: 110 }, (_, i) => new Date().getFullYear() - i).map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}
