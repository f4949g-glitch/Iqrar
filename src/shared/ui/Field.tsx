interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  error?: string | null;
  placeholder?: string;
}

export function Field({ label, value, onChange, type = 'text', required, error, placeholder }: FieldProps) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-bold text-ink">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border bg-white px-3 py-2 text-ink outline-none focus:border-seal"
        style={{ borderColor: error ? '#B5533C' : '#E5E1D6' }}
      />
      {error && <span className="mt-1 block text-xs font-bold text-clay">{error}</span>}
    </label>
  );
}
