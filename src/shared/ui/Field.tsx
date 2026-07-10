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
  /** يقبل أرقامًا فقط ويقصّ الإدخال عند maxLength (مثال: هوية/جوال/سجل تجاري 10 خانات). */
  digitsOnly?: boolean;
  maxLength?: number;
}

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
}: FieldProps) {
  const handleChange = (raw: string) => {
    let next = raw;
    if (digitsOnly) next = next.replace(/[^0-9]/g, '');
    if (maxLength) next = next.slice(0, maxLength);
    onChange(next);
  };

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
