import { describe, expect, it } from 'vitest';
import { syntheticContractParties, TEMPLATE_PARTY_PREFIX } from '../lib/syntheticParties';
import type { DraftParty } from '../components/wizard/PartiesStep';

function makeDraftParty(overrides: Partial<DraftParty> = {}): DraftParty {
  return {
    party_type: 'individual',
    entity_name: '',
    entity_cr_number: '',
    role_label: 'الطرف الأول',
    custom_role: '',
    full_name: 'أحمد المطيري',
    national_id: '1000383644',
    nationality: 'سعودي',
    address: '',
    email: 'a@x.com',
    phone: '0500000000',
    verification_method: 'manual',
    date_of_birth: '',
    nafathState: 'idle',
    nafathMessage: '',
    randomCode: '',
    is_self: false,
    ...overrides,
  };
}

describe('syntheticContractParties', () => {
  it('يبني معرّفًا مؤقتًا guest-temp-* عند غياب partyId', () => {
    const result = syntheticContractParties([makeDraftParty(), makeDraftParty()]);
    expect(result[0].id).toBe('guest-temp-0');
    expect(result[1].id).toBe('guest-temp-1');
  });

  it('يستخدم partyId الحقيقي عند وجوده بدل توليد معرّف مؤقت', () => {
    const result = syntheticContractParties([makeDraftParty({ partyId: 'real-id-5' })]);
    expect(result[0].id).toBe('real-id-5');
  });

  it('يستبدل صفة "أخرى" بالنص المخصَّص الذي أدخله المستخدم', () => {
    const result = syntheticContractParties([makeDraftParty({ role_label: 'أخرى', custom_role: 'شاهد' })]);
    expect(result[0].role_label).toBe('شاهد');
  });

  it('يستخدم "طرف" كصفة افتراضية عندما تكون "أخرى" بلا نص مخصَّص', () => {
    const result = syntheticContractParties([makeDraftParty({ role_label: 'أخرى', custom_role: '   ' })]);
    expect(result[0].role_label).toBe('طرف');
  });

  it('يحوّل الحقول الفارغة إلى null بدل سلسلة فارغة', () => {
    const result = syntheticContractParties([makeDraftParty({ full_name: '', national_id: '', email: '', phone: '' })]);
    expect(result[0].full_name).toBeNull();
    expect(result[0].national_id).toBeNull();
    expect(result[0].email).toBeNull();
    expect(result[0].phone).toBeNull();
  });

  it('يحافظ على ترتيب order_index حسب موضع الطرف في القائمة', () => {
    const result = syntheticContractParties([makeDraftParty(), makeDraftParty(), makeDraftParty()]);
    expect(result.map((p) => p.order_index)).toEqual([0, 1, 2]);
  });

  it('كل الأطراف الناتجة بحالة pending افتراضيًا', () => {
    const result = syntheticContractParties([makeDraftParty()]);
    expect(result[0].status).toBe('pending');
  });

  it('بادئة القوالب tmpl-party- ثابتة كما هي متوقَّعة', () => {
    expect(TEMPLATE_PARTY_PREFIX).toBe('tmpl-party-');
  });
});
