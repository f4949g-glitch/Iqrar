import { useMemo } from 'react';

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

export function GregorianDateInput({ value, onChange, required }: GregorianDateInputProps) {
  const [year, month, day] = value ? value.split('-') : ['', '', ''];

  const daysInMonth = useMemo(() => {
    if (!year || !month) return 31;
    return new Date(Number(year), Number(month), 0).getDate();
  }, [year, month]);

  const emit = (y: string, m: string, d: string) => {
    onChange(y && m && d ? `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` : '');
  };

  const selectClass = 'min-w-0 flex-1 rounded-lg border border-line bg-white px-2 py-2.5 text-center text-sm text-ink outline-none focus:border-seal';

  return (
    <div className="flex gap-2" dir="ltr">
      <select required={required} value={day} onChange={(e) => emit(year, month, e.target.value)} className={selectClass}>
        <option value="" disabled>يوم</option>
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
      <select required={required} value={month} onChange={(e) => emit(year, e.target.value, day)} className={selectClass}>
        <option value="" disabled>شهر</option>
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>{m}</option>
        ))}
      </select>
      <select required={required} value={year} onChange={(e) => emit(e.target.value, month, day)} className={selectClass}>
        <option value="" disabled>سنة</option>
        {Array.from({ length: 110 }, (_, i) => new Date().getFullYear() - i).map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}
