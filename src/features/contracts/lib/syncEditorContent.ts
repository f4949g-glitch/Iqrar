import type { JSONContent } from '@tiptap/react';
import { addField, saveContractBody } from '../api/contractsApi';
import { extractFillFields } from '../editor/extractFillFields';
import type { ContractField, ContractParty } from '../types';

// يُستخدم لبناء حقول عقد جديد بالكامل من محتوى محرر مؤلَّف مسبقًا (مسار الزائر
// الذي يكتب المحتوى قبل تسجيل الدخول ثم يُنشأ العقد دفعة واحدة بعد المصادقة)،
// بخلاف EditorStep.save() الذي يُفاضل بين حقول موجودة فعلاً وحقول جديدة لعقد قيد التعديل.
export async function createFieldsFromScratch(contractId: string, body: JSONContent, parties: ContractParty[]): Promise<ContractField[]> {
  await saveContractBody(contractId, body);

  const extracted = extractFillFields(body as never);
  const nextFields: ContractField[] = [];
  for (const f of extracted) {
    const created = await addField(contractId, {
      party_id: f.partyId,
      field_type: f.fieldType,
      label: f.label,
      required: f.required,
      anchor_id: f.anchorId,
    });
    nextFields.push(created);
  }

  for (const party of parties) {
    const hasSignature = nextFields.some((f) => f.party_id === party.id && f.field_type === 'signature');
    if (!hasSignature) {
      const created = await addField(contractId, {
        party_id: party.id,
        field_type: 'signature',
        label: 'التوقيع الإلكتروني',
        required: true,
      });
      nextFields.push(created);
    }
  }

  return nextFields;
}
