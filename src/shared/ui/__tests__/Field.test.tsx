import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Field } from '../Field';

describe('Field (digitsOnly + maxLength)', () => {
  it('يحذف أي حرف غير رقمي عند الكتابة', () => {
    const onChange = vi.fn();
    render(<Field label="رقم الهوية" value="" onChange={onChange} digitsOnly maxLength={10} />);
    fireEvent.change(screen.getByLabelText('رقم الهوية'), { target: { value: '1a2b3c' } });
    expect(onChange).toHaveBeenCalledWith('123');
  });

  it('يقصّ الإدخال عند الوصول إلى الحد الأقصى (10 خانات)', () => {
    const onChange = vi.fn();
    render(<Field label="الجوال" value="" onChange={onChange} digitsOnly maxLength={10} />);
    fireEvent.change(screen.getByLabelText('الجوال'), { target: { value: '05012345678999' } });
    expect(onChange).toHaveBeenCalledWith('0501234567');
  });

  it('لا يقيّد حقلًا عاديًا بلا digitsOnly', () => {
    const onChange = vi.fn();
    render(<Field label="الاسم" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('الاسم'), { target: { value: 'محمد Ahmad 123' } });
    expect(onChange).toHaveBeenCalledWith('محمد Ahmad 123');
  });
});
