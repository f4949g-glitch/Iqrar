import { GregorianDateInput } from './GregorianDateInput';

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
}: FieldProps) {
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
        <span className="mb-1 block font-bold text-ink">{label}</span>
        <div
          className="flex items-center overflow-hidden rounded-lg border bg-white focus-within:border-seal"
          style={{ borderColor: error ? '#B5533C' : '#E5E1D6' }}
          dir="ltr"
        >
          <span className="border-l border-line bg-paper px-3 py-2 text-sm font-bold text-slate">966</span>
          <input
            type="text"
            inputMode="numeric"
            value={local}
            required={required}
            placeholder="5xxxxxxxx"
            maxLength={9}
            onChange={(e) => handlePhoneChange(e.target.value)}
            className="w-full bg-transparent px-3 py-2 text-ink outline-none"
          />
        </div>
        {hint && !error && <span className="mt-1 block text-xs text-slate">{hint}</span>}
        {error && <span className="mt-1 block text-xs font-bold text-clay">{error}</span>}
      </label>
    );
  }

  return (
    <label className="block text-sm">
      <span className="mb-1 block font-bold text-ink">{label}</span>
      {type === 'date' ? (
        <GregorianDateInput value={value} onChange={onChange} required={required} />
      ) : (
        <input
          type={type}
          inputMode={digitsOnly ? 'numeric' : undefined}
          value={value}
          required={required}
          placeholder={placeholder}
          min={min}
          max={max}
          maxLength={maxLength}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full rounded-lg border bg-white px-3 py-2 text-ink outline-none focus:border-seal"
          style={{ borderColor: error ? '#B5533C' : '#E5E1D6' }}
        />
      )}
      {hint && !error && <span className="mt-1 block text-xs text-slate">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-bold text-clay">{error}</span>}
    </label>
  );
}
