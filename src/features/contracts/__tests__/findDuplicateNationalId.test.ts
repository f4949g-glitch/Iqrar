import { describe, expect, it } from 'vitest';
import { findDuplicateNationalId } from '../lib/findDuplicateNationalId';

describe('findDuplicateNationalId', () => {
  it('يُرجع null عندما لا يوجد تكرار', () => {
    expect(findDuplicateNationalId(['1000383644', '2000383644'])).toBeNull();
  });

  it('يُرجع null عندما تكون كل القيم فارغة', () => {
    expect(findDuplicateNationalId(['', '', ''])).toBeNull();
  });

  it('يتجاهل القيم الفارغة عند المقارنة', () => {
    expect(findDuplicateNationalId(['', '1000383644', ''])).toBeNull();
  });

  it('يكتشف تكرار رقم الهوية بين طرفين ويُرجع فهرسيهما', () => {
    const result = findDuplicateNationalId(['1000383644', '2000383644', '1000383644']);
    expect(result).toEqual({ firstIndex: 0, secondIndex: 2 });
  });

  it('يكتشف التكرار بين طرفين متتاليين', () => {
    const result = findDuplicateNationalId(['1000383644', '1000383644']);
    expect(result).toEqual({ firstIndex: 0, secondIndex: 1 });
  });

  it('يتجاهل المسافات الزائدة قبل المقارنة', () => {
    const result = findDuplicateNationalId(['1000383644 ', ' 1000383644']);
    expect(result).toEqual({ firstIndex: 0, secondIndex: 1 });
  });
});
