import type { DraftParty } from '../components/wizard/PartiesStep';
import type { ContractParty } from '../types';

// بادئة معرّفات الأطراف المؤقتة المستخدَمة عند تأليف قالب عقد من لوحة الأدمن،
// حيث لا توجد أطراف حقيقية بعد. تُستبدل بمعرّفات حقيقية (عبر remapPartyIds)
// فور بدء مستخدم مستهدَف عقدًا فعليًا من القالب — انظر NewContractWizard.
export const TEMPLATE_PARTY_PREFIX = 'tmpl-party-';

// يبني قائمة أطراف "شكلية" لاستخدامها داخل محرر النصوص قبل وجود صفوف حقيقية في
// contract_parties — سواء أثناء تأليف زائر لمحتوى عقد (معرّفات guest-temp-*)
// أو أثناء تأليف أدمن لقالب عقد (معرّفات tmpl-party-*).
export function syntheticContractParties(draftParties: DraftParty[]): ContractParty[] {
  return draftParties.map((p, i) => ({
    id: p.partyId ?? `guest-temp-${i}`,
    contract_id: '',
    role_label: p.role_label === 'أخرى' ? p.custom_role.trim() || 'طرف' : p.role_label,
    full_name: p.full_name || null,
    national_id: p.national_id || null,
    email: p.email || null,
    phone: p.phone || null,
    token: '',
    status: 'pending',
    order_index: i,
    user_id: null,
    signed_at: null,
    created_at: '',
    verification_method: p.verification_method,
    date_of_birth: p.date_of_birth || null,
    nafath_trans_id: null,
    nafath_random_code: null,
    nafath_status: null,
    nafath_verified_at: null,
    party_type: p.party_type,
    entity_name: p.entity_name || null,
    entity_cr_number: p.entity_cr_number || null,
    nationality: p.nationality || null,
    address: p.address || null,
    reject_resend_count: 0,
    signed_ip: null,
    signed_user_agent: null,
  }));
}
