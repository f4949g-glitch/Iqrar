import { describe, expect, it } from 'vitest';
import { calculateInvoice } from '../api/pricingApi';

describe('calculateInvoice', () => {
  it('يطبّق الحد الأدنى للفاتورة عندما يكون إجمالي سعر الأطراف أقل منه', () => {
    const pricing = { price_per_party: 40, minimum_invoice: 100 };
    expect(calculateInvoice(2, pricing)).toBe(100);
  });

  it('يستخدم إجمالي سعر الأطراف عندما يتجاوز الحد الأدنى', () => {
    const pricing = { price_per_party: 40, minimum_invoice: 100 };
    expect(calculateInvoice(3, pricing)).toBe(120);
  });

  it('يعيد صفرًا عند عدم وجود أطراف وحد أدنى صفري', () => {
    const pricing = { price_per_party: 40, minimum_invoice: 0 };
    expect(calculateInvoice(0, pricing)).toBe(0);
  });
});
