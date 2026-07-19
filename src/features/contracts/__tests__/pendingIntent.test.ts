import { describe, expect, it, beforeEach } from 'vitest';
import { setPendingContractIntent, consumePendingContractIntent } from '../lib/pendingIntent';

describe('pendingIntent', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('يعيد null عند عدم وجود نية محفوظة', () => {
    expect(consumePendingContractIntent()).toBeNull();
  });

  it('يحفظ النية ويعيدها كما هي', () => {
    setPendingContractIntent({ documentType: 'contract', partyCount: 3, verificationDefault: 'nafath' });
    const result = consumePendingContractIntent();
    expect(result).toEqual({ documentType: 'contract', partyCount: 3, verificationDefault: 'nafath' });
  });

  it('يمسح النية بعد قراءتها مرة واحدة (استهلاك لمرة واحدة)', () => {
    setPendingContractIntent({ documentType: 'power_of_attorney', partyCount: 2, verificationDefault: 'manual' });
    consumePendingContractIntent();
    expect(consumePendingContractIntent()).toBeNull();
  });
});
