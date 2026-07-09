import { describe, expect, it } from 'vitest';
import { calculateInvoice } from '../api/pricingApi';

describe('calculateInvoice', () => {
  it('يطبّق الحد الأدنى للفاتورة عندما تكون القيمة الأساسية أقل منه', () => {
    const pricing = { base_amount: 40, extra_party_fee: 20, minimum_invoice: 100, tax_percent: 0 };
    expect(calculateInvoice(2, pricing)).toBe(100);
  });

  it('يضيف رسم الطرف الإضافي فقط لما زاد عن طرفين', () => {
    const pricing = { base_amount: 100, extra_party_fee: 40, minimum_invoice: 0, tax_percent: 0 };
    expect(calculateInvoice(2, pricing)).toBe(100);
    expect(calculateInvoice(3, pricing)).toBe(140);
  });

  it('يطبّق نسبة الضريبة على المجموع بعد الحد الأدنى', () => {
    const pricing = { base_amount: 100, extra_party_fee: 0, minimum_invoice: 0, tax_percent: 15 };
    expect(calculateInvoice(2, pricing)).toBe(115);
  });

  it('يعيد صفرًا عند عدم وجود أطراف وحد أدنى صفري وبلا ضريبة', () => {
    const pricing = { base_amount: 0, extra_party_fee: 40, minimum_invoice: 0, tax_percent: 0 };
    expect(calculateInvoice(0, pricing)).toBe(0);
  });
});
