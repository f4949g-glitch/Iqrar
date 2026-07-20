import { useId } from 'react';
import { GregorianDateInput } from './GregorianDateInput';

// نطاقات بريد شائعة تُقترَح تلقائيًا أثناء الكتابة في أي حقل بريد إلكتروني
// (type="email")، مع بقاء حرية كتابة أي نطاق آخر يدويًا كاملًا.
const COMMON_EMAIL_DOMAINS = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com'];

function emailSuggestions(value: string): string[] {
  const at = value.indexOf('@');
  const local = (at === -1 ? value : value.slice(0, at)).trim();
  if (!local) return [];
  return COMMON_EMAIL_DOMAINS.map((domain) => `${local}@${domain}`);
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  error?: string | null;
  placeholder?: string;
  min?: number;
  max?: number;
  hint?: string;
  /** يقبل أرقامًا فقط ويقصّ الإدخال عند maxLength (مثال: هوية/سجل تجاري 10 خانات). */
  digitsOnly?: boolean;
  maxLength?: number;
  /** حقل جوال بصيغة دولية: بادئة "966" ثابتة + حتى 9 أرقام بعدها (مثال: 966501234567). */
  phone?: boolean;
  /** يُعطَّل الحقل ويظهر بمظهر مقفل (مثال: بيانات هوية مُستمَدة من الحساب لا يجوز تعديلها). */
  disabled?: boolean;
}

const PHONE_PREFIX = '966';

export function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  error,
  placeholder,
  min,
  max,
  hint,
  digitsOnly,
  maxLength,
  phone,
  disabled,
}: FieldProps) {
  const datalistId = useId();
  const handleChange = (raw: string) => {
    let next = raw;
    if (digitsOnly) next = next.replace(/[^0-9]/g, '');
    if (maxLength) next = next.slice(0, maxLength);
    onChange(next);
  };

  if (phone) {
    const local = value.startsWith(PHONE_PREFIX) ? value.slice(PHONE_PREFIX.length) : value.replace(/[^0-9]/g, '');
    const handlePhoneChange = (raw: string) => {
      const digits = raw.replace(/[^0-9]/g, '').slice(0, 9);
      onChange(digits ? PHONE_PREFIX + digits : '');
    };
    return (
      <label className="block text-sm">
        <span className="mb-1 block font-bold text-ink">
          {label}
          {required && (
            <span className="text-clay" aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </span>
        <div
          className="flex items-center overflow-hidden rounded-lg border bg-paper shadow-sm focus-within:border-seal"
          style={{ borderColor: error ? '#B5533C' : '#E5E1D6' }}
          dir="ltr"
        >
          <span className="border-l border-line bg-card px-3 py-2 text-sm font-bold text-slate">966</span>
          <input
            type="text"
            inputMode="numeric"
            value={local}
            required={required}
            placeholder="5xxxxxxxx"
            maxLength={9}
            disabled={disabled}
            onChange={(e) => handlePhoneChange(e.target.value)}
            className="w-full bg-transparent px-3 py-2 text-ink outline-none disabled:cursor-not-allowed disabled:text-slate"
          />
        </div>
        {hint && !error && <span className="mt-1 block text-xs text-slate">{hint}</span>}
        {error && <span className="mt-1 block text-xs font-bold text-clay">{error}</span>}
      </label>
    );
  }

  return (
    <label className="block text-sm">
      <span className="mb-1 block font-bold text-ink">
        {label}
        {required && (
          <span className="text-clay" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </span>
      {type === 'date' ? (
        <GregorianDateInput value={value} onChange={onChange} required={required} />
      ) : (
        <>
          <input
            type={type}
            inputMode={digitsOnly ? 'numeric' : undefined}
            value={value}
            required={required}
            placeholder={placeholder}
            min={min}
            max={max}
            maxLength={maxLength}
            disabled={disabled}
            list={type === 'email' ? datalistId : undefined}
            autoComplete={type === 'email' ? 'off' : undefined}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full rounded-lg border bg-paper px-3 py-2 text-ink shadow-sm outline-none focus:border-seal disabled:cursor-not-allowed disabled:bg-card disabled:text-slate disabled:shadow-none"
            style={{ borderColor: error ? '#B5533C' : '#E5E1D6' }}
          />
          {type === 'email' && (
            <datalist id={datalistId}>
              {emailSuggestions(value).map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          )}
        </>
      )}
      {hint && !error && <span className="mt-1 block text-xs text-slate">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-bold text-clay">{error}</span>}
    </label>
  );
}
