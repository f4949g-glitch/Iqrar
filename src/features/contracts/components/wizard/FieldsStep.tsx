import { useState } from 'react';
import { Document, Page } from 'react-pdf';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { addField, deleteField, updateField, type NewFieldInput } from '../../api/contractsApi';
import { FIELD_TYPE_LABELS, type ContractField, type ContractParty, type FieldType } from '../../types';
import '@/lib/pdf/setupWorker';

const DEFAULT_SIZE: Record<FieldType, { width: number; height: number }> = {
  signature: { width: 18, height: 6 },
  checkbox: { width: 4, height: 4 },
  text: { width: 20, height: 4 },
  number: { width: 20, height: 4 },
  email: { width: 20, height: 4 },
  phone: { width: 20, height: 4 },
  date: { width: 16, height: 4 },
  time: { width: 12, height: 4 },
  select: { width: 20, height: 4 },
  textarea: { width: 32, height: 10 },
  image: { width: 15, height: 8 },
  logo: { width: 15, height: 8 },
  stamp: { width: 15, height: 10 },
  file: { width: 18, height: 5 },
};

const PARTY_COLORS = ['#C9922B', '#4C7A6B', '#B5533C', '#5B6B82', '#8B5CF6', '#0EA5E9'];

interface FieldsStepProps {
  contractId: string;
  pdfUrl: string;
  pageCount: number;
  parties: ContractParty[];
  fields: ContractField[];
  onFieldsChange: (fields: ContractField[]) => void;
  onBack: () => void;
  onNext: () => void;
}

export function FieldsStep({ contractId, pdfUrl, pageCount, parties, fields, onFieldsChange, onBack, onNext }: FieldsStepProps) {
  const [page, setPage] = useState(1);
  const [selectedParty, setSelectedParty] = useState(parties[0]?.id ?? '');
  const [selectedType, setSelectedType] = useState<FieldType>('signature');
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [error, setError] = useState('');

  const partyIndex = (partyId: string) => parties.findIndex((p) => p.id === partyId);
  const colorFor = (partyId: string) => PARTY_COLORS[partyIndex(partyId) % PARTY_COLORS.length] ?? '#5B6B82';

  const pageFields = fields.filter((f) => f.page_number === page);

  const placeField = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedParty) {
      setError('اختر الطرف المسؤول عن تعبئة الحقل أولًا');
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    const size = DEFAULT_SIZE[selectedType];

    const input: NewFieldInput = {
      party_id: selectedParty,
      field_type: selectedType,
      label: FIELD_TYPE_LABELS[selectedType],
      page_number: page,
      pos_x: Math.max(0, Math.min(100 - size.width, xPct - size.width / 2)),
      pos_y: Math.max(0, Math.min(100 - size.height, yPct - size.height / 2)),
      width: size.width,
      height: size.height,
      required: true,
    };
    try {
      const created = await addField(contractId, input);
      onFieldsChange([...fields, created]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّرت إضافة الحقل');
    }
  };

  const removeField = async (fieldId: string) => {
    try {
      await deleteField(fieldId);
      onFieldsChange(fields.filter((f) => f.id !== fieldId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر حذف الحقل');
    }
  };

  const startDrag = (field: ContractField, e: React.MouseEvent) => {
    e.stopPropagation();
    const container = (e.currentTarget as HTMLElement).parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const fieldXPx = (field.pos_x / 100) * rect.width;
    const fieldYPx = (field.pos_y / 100) * rect.height;
    setDragging({ id: field.id, offsetX: e.clientX - rect.left - fieldXPx, offsetY: e.clientY - rect.top - fieldYPx });
  };

  const onPageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const field = fields.find((f) => f.id === dragging.id);
    if (!field) return;
    const xPct = ((e.clientX - rect.left - dragging.offsetX) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top - dragging.offsetY) / rect.height) * 100;
    onFieldsChange(
      fields.map((f) =>
        f.id === dragging.id
          ? { ...f, pos_x: Math.max(0, Math.min(100 - f.width, xPct)), pos_y: Math.max(0, Math.min(100 - f.height, yPct)) }
          : f,
      ),
    );
  };

  const endDrag = async () => {
    if (!dragging) return;
    const field = fields.find((f) => f.id === dragging.id);
    setDragging(null);
    if (!field) return;
    try {
      await updateField(field.id, { pos_x: field.pos_x, pos_y: field.pos_y });
    } catch {
      // تجاهل فشل حفظ الموضع النهائي؛ يبقى الحقل كما هو محليًا حتى إعادة تحميل الصفحة
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-card p-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate">الطرف المسؤول:</span>
          {parties.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedParty(p.id)}
              className="rounded-full px-3 py-1 text-xs font-bold transition"
              style={{
                background: selectedParty === p.id ? colorFor(p.id) : '#F7F5F1',
                color: selectedParty === p.id ? '#fff' : '#5B6B82',
              }}
            >
              {p.full_name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-xl border border-line bg-card p-3">
        {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setSelectedType(type)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              selectedType === type ? 'bg-seal text-white' : 'bg-paper text-ink'
            }`}
          >
            {FIELD_TYPE_LABELS[type]}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate">اضغط على مكان في المستند لإضافة الحقل المحدد، واسحب الحقول الموضوعة لتغيير مكانها.</p>

      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className="rounded-lg border border-line bg-card p-1.5 disabled:opacity-40"
        >
          <ChevronRight size={16} />
        </button>
        <span className="text-sm font-bold text-ink">
          صفحة {page} / {pageCount}
        </span>
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => setPage((p) => p + 1)}
          className="rounded-lg border border-line bg-card p-1.5 disabled:opacity-40"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      <div className="flex justify-center overflow-auto rounded-xl border border-line bg-[#525659] p-4">
        <div
          className="relative cursor-crosshair select-none bg-white shadow-lg"
          onClick={placeField}
          onMouseMove={onPageMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
        >
          <Document file={pdfUrl} loading={<p className="p-10 text-sm text-slate">جارِ تحميل المستند...</p>}>
            <Page pageNumber={page} width={600} />
          </Document>
          {pageFields.map((field) => (
            <div
              key={field.id}
              onMouseDown={(e) => startDrag(field, e)}
              className="group absolute flex cursor-move items-center justify-center rounded border-2 text-[10px] font-bold"
              style={{
                left: `${field.pos_x}%`,
                top: `${field.pos_y}%`,
                width: `${field.width}%`,
                height: `${field.height}%`,
                borderColor: colorFor(field.party_id),
                background: `${colorFor(field.party_id)}22`,
                color: colorFor(field.party_id),
              }}
            >
              {FIELD_TYPE_LABELS[field.field_type]}
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  removeField(field.id);
                }}
                className="absolute -left-2 -top-2 hidden h-4 w-4 items-center justify-center rounded-full bg-clay text-white group-hover:flex"
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm font-bold text-clay">{error}</p>}
      {fields.length === 0 && <p className="text-center text-xs text-slate">لم تُضف أي حقول بعد</p>}

      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack}>
          السابق
        </Button>
        <Button onClick={onNext} disabled={fields.length === 0}>
          التالي: المراجعة والإرسال
        </Button>
      </div>
    </div>
  );
}
