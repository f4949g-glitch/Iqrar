import { describe, expect, it } from 'vitest';
import { CONTRACT_STATUS_LABEL, FIELD_TYPE_LABELS, type ContractStatus, type FieldType } from '../types';

const ALL_STATUSES: ContractStatus[] = ['draft', 'pending', 'partially_completed', 'completed', 'expired', 'rejected', 'cancelled'];
const ALL_FIELD_TYPES: FieldType[] = [
  'text',
  'number',
  'email',
  'phone',
  'date',
  'time',
  'signature',
  'image',
  'logo',
  'stamp',
  'checkbox',
  'select',
  'textarea',
  'file',
];

describe('حالات العقد وأنواع الحقول', () => {
  it('كل حالة عقد لها تسمية عربية', () => {
    for (const status of ALL_STATUSES) {
      expect(CONTRACT_STATUS_LABEL[status].label).toBeTruthy();
    }
  });

  it('كل نوع حقل له تسمية عربية', () => {
    for (const type of ALL_FIELD_TYPES) {
      expect(FIELD_TYPE_LABELS[type]).toBeTruthy();
    }
  });
});
