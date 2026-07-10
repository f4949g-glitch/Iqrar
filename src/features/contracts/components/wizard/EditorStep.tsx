import { useState } from 'react';
import type { JSONContent } from '@tiptap/react';
import { Button } from '@/shared/ui/Button';
import { ContractEditor } from '../../editor/ContractEditor';
import { extractFillFields } from '../../editor/extractFillFields';
import { addField, deleteField, saveContractBody } from '../../api/contractsApi';
import { DOCUMENT_TYPE_DEFINITE_LABELS, type ContractField, type ContractParty, type DocumentType } from '../../types';

interface EditorStepProps {
  contractId: string;
  documentType: DocumentType;
  parties: ContractParty[];
  body: JSONContent | null;
  onBodyChange: (body: JSONContent) => void;
  fields: ContractField[];
  onFieldsChange: (fields: ContractField[]) => void;
  onBack: () => void;
  onNext: () => void;
}

export function EditorStep({ contractId, documentType, parties, body, onBodyChange, fields, onFieldsChange, onBack, onNext }: EditorStepProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const docLabel = DOCUMENT_TYPE_DEFINITE_LABELS[documentType];

  const save = async () => {
    if (!body) {
      setError(`اكتب محتوى ${docLabel} أولًا`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await saveContractBody(contractId, body);

      const extracted = extractFillFields(body as never);
      const existingByAnchor = new Map(fields.filter((f) => f.anchor_id).map((f) => [f.anchor_id as string, f]));
      const currentAnchorIds = new Set(extracted.map((f) => f.anchorId));

      const nextFields: ContractField[] = [];
      for (const f of extracted) {
        const existing = existingByAnchor.get(f.anchorId);
        if (existing) {
          nextFields.push(existing);
          continue;
        }
        const created = await addField(contractId, {
          party_id: f.partyId,
          field_type: f.fieldType,
          label: f.label,
          required: f.required,
          anchor_id: f.anchorId,
        });
        nextFields.push(created);
      }

      for (const f of fields) {
        if (f.anchor_id && !currentAnchorIds.has(f.anchor_id)) {
          await deleteField(f.id);
        }
      }

      // نضمن وجود حقل توقيع لكل طرف حتى لو لم يُدرج الكاتب حقل تعبئة توقيع يدويًا
      // في النص، وإلا يصل الطرف لصفحة التوقيع دون أي وسيلة لتوثيق موافقته.
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

      onFieldsChange(nextFields);
      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : `تعذّر حفظ محتوى ${docLabel}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate">
        استخدم "إدراج حقل دمج" لإدراج بيانات طرف معروفة مسبقًا (مثل الاسم) مباشرة داخل النص، و"إدراج حقل تعبئة" لحقل يملأه
        الطرف بنفسه عند التوقيع (كالتوقيع الإلكتروني أو تاريخ).
      </p>
      <ContractEditor parties={parties} content={body} onChange={onBodyChange} />
      {error && <p className="text-sm font-bold text-clay">{error}</p>}
      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack} disabled={saving}>
          السابق
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? 'جارِ الحفظ...' : 'التالي: المراجعة والإرسال'}
        </Button>
      </div>
    </div>
  );
}
