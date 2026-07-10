import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GregorianDateInput } from '../GregorianDateInput';

function ControlledWrapper({ onChange }: { onChange: (v: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <GregorianDateInput
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
    />
  );
}

describe('GregorianDateInput', () => {
  it('يعرض ثلاث قوائم فارغة عند عدم وجود قيمة', () => {
    render(<GregorianDateInput value="" onChange={vi.fn()} />);
    expect(screen.getByText('يوم')).toBeInTheDocument();
    expect(screen.getByText('شهر')).toBeInTheDocument();
    expect(screen.getByText('سنة')).toBeInTheDocument();
  });

  it('يعرض القيمة الميلادية الصحيحة (يوم/شهر/سنة) عند تمرير تاريخ ISO كامل', () => {
    render(<GregorianDateInput value="2026-03-05" onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
    expect(screen.getByDisplayValue('مارس')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026')).toBeInTheDocument();
  });

  it('لا يستدعي onChange بقيمة كاملة إلا بعد اختيار اليوم والشهر والسنة معًا', () => {
    const onChange = vi.fn();
    const { container } = render(<ControlledWrapper onChange={onChange} />);
    const selects = () => container.querySelectorAll('select');

    fireEvent.change(selects()[0], { target: { value: '15' } });
    expect(onChange).toHaveBeenLastCalledWith('');

    fireEvent.change(selects()[1], { target: { value: '6' } });
    expect(onChange).toHaveBeenLastCalledWith('');

    fireEvent.change(selects()[2], { target: { value: '2026' } });
    expect(onChange).toHaveBeenLastCalledWith('2026-06-15');
  });
});
