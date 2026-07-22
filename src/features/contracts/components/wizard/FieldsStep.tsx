import { useRef, useState } from 'react';
import { Document, Page } from 'react-pdf';
import { AlertTriangle, ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { addField, deleteField, updateField, type NewFieldInput } from '../../api/contractsApi';
import { FIELD_TYPE_LABELS, type ContractField, type ContractParty, type FieldType } from '../../types';
import { FIELD_TYPE_ICONS } from '../../lib/fieldTypeIcons';
import '@/lib/pdf/setupWorker';

const DRAG_FIELD_TYPE_MIME = 'application/x-iqrar-field-type';

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
  const [resizing, setResizing] = useState<{
    id: string;
    startClientX: number;
    startClientY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);
  const [error, setError] = useState('');
  // محرِّر خيارات حقل "قائمة منسدلة": بلا هذا لا توجد أي وسيلة لتحديد خيارات
  // الحقل، فيبقى دائمًا فارغًا وغير قابل للتعبئة عند التوقيع رغم كونه إلزاميًا،
  // ما يمنع إتمام التوقيع نهائيًا. يُفتح تلقائيًا فور إفلات/وضع حقل جديد من
  // هذا النوع، ويمكن إعادة فتحه بالنقر على أي حقل قائمة منسدلة موضوع سابقًا.
  const [editingOptionsFieldId, setEditingOptionsFieldId] = useState<string | null>(null);
  const [optionsDraft, setOptionsDraft] = useState('');
  const editingOptionsField = fields.find((f) => f.id === editingOptionsFieldId) ?? null;
  const MIN_FIELD_SIZE = 2;
  // يمنع "النقرة" التي تُنهي عملية سحب حقل موجود (تحريك/تحجيم) من إنشاء حقل
  // جديد بالخطأ: تُرفَع فقط أثناء سحب فعلي، ويُستهلَك مرة واحدة عند أول نقرة تالية.
  const justDraggedRef = useRef(false);

  const partyIndex = (partyId: string) => parties.findIndex((p) => p.id === partyId);
  const colorFor = (partyId: string) => PARTY_COLORS[partyIndex(partyId) % PARTY_COLORS.length] ?? '#5B6B82';

  const pageFields = fields.filter((f) => f.page_number === page);

  const createFieldAt = async (type: FieldType, xPct: number, yPct: number) => {
    if (!selectedParty) {
      setError('اختر الطرف المسؤول عن تعبئة الحقل أولًا');
      return;
    }
    const size = DEFAULT_SIZE[type];
    const input: NewFieldInput = {
      party_id: selectedParty,
      field_type: type,
      label: FIELD_TYPE_LABELS[type],
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
      if (type === 'select') {
        setEditingOptionsFieldId(created.id);
        setOptionsDraft('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّرت إضافة الحقل');
    }
  };

  const saveFieldOptions = async () => {
    if (!editingOptionsFieldId) return;
    const options = optionsDraft
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      await updateField(editingOptionsFieldId, { options });
      onFieldsChange(fields.map((f) => (f.id === editingOptionsFieldId ? { ...f, options } : f)));
      setEditingOptionsFieldId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر حفظ خيارات القائمة');
    }
  };

  const placeField = (e: React.MouseEvent<HTMLDivElement>) => {
    if (justDraggedRef.current) {
      // هذه نقرة تابعة لسحب حقل موجود انتهى للتو، لا نقرة فعلية على المستند.
      justDraggedRef.current = false;
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    void createFieldAt(selectedType, xPct, yPct);
  };

  const onPageDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes(DRAG_FIELD_TYPE_MIME)) e.preventDefault();
  };

  const onPageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const type = e.dataTransfer.getData(DRAG_FIELD_TYPE_MIME) as FieldType;
    if (!type) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    void createFieldAt(type, xPct, yPct);
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
    const fieldXPx = ((field.pos_x ?? 0) / 100) * rect.width;
    const fieldYPx = ((field.pos_y ?? 0) / 100) * rect.height;
    setDragging({ id: field.id, offsetX: e.clientX - rect.left - fieldXPx, offsetY: e.clientY - rect.top - fieldYPx });
  };

  const startResize = (field: ContractField, e: React.MouseEvent) => {
    e.stopPropagation();
    setResizing({
      id: field.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startWidth: field.width ?? MIN_FIELD_SIZE,
      startHeight: field.height ?? MIN_FIELD_SIZE,
    });
  };

  const onPageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (resizing) {
      justDraggedRef.current = true;
      const rect = e.currentTarget.getBoundingClientRect();
      const field = fields.find((f) => f.id === resizing.id);
      if (!field) return;
      const deltaWidthPct = ((e.clientX - resizing.startClientX) / rect.width) * 100;
      const deltaHeightPct = ((e.clientY - resizing.startClientY) / rect.height) * 100;
      const maxWidth = 100 - (field.pos_x ?? 0);
      const maxHeight = 100 - (field.pos_y ?? 0);
      onFieldsChange(
        fields.map((f) =>
          f.id === resizing.id
            ? {
                ...f,
                width: Math.max(MIN_FIELD_SIZE, Math.min(maxWidth, resizing.startWidth + deltaWidthPct)),
                height: Math.max(MIN_FIELD_SIZE, Math.min(maxHeight, resizing.startHeight + deltaHeightPct)),
              }
            : f,
        ),
      );
      return;
    }
    if (!dragging) return;
    justDraggedRef.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    const field = fields.find((f) => f.id === dragging.id);
    if (!field) return;
    const xPct = ((e.clientX - rect.left - dragging.offsetX) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top - dragging.offsetY) / rect.height) * 100;
    onFieldsChange(
      fields.map((f) =>
        f.id === dragging.id
          ? {
              ...f,
              pos_x: Math.max(0, Math.min(100 - (f.width ?? 0), xPct)),
              pos_y: Math.max(0, Math.min(100 - (f.height ?? 0), yPct)),
            }
          : f,
      ),
    );
  };

  const endDrag = async () => {
    // تنظيف احتياطي: إن انتهى السحب بمغادرة المؤشر للحاوية (mouseleave) بلا نقرة
    // تالية تستهلك العلامة، تُصفَّر بعد دورة الأحداث الحالية كي لا تُسكِت نقرة
    // مستقبلية غير متعلقة بهذا السحب.
    setTimeout(() => {
      justDraggedRef.current = false;
    }, 0);
    if (resizing) {
      const field = fields.find((f) => f.id === resizing.id);
      setResizing(null);
      if (!field) return;
      try {
        await updateField(field.id, { width: field.width ?? MIN_FIELD_SIZE, height: field.height ?? MIN_FIELD_SIZE });
      } catch {
        // تجاهل فشل حفظ الحجم النهائي؛ يبقى الحقل كما هو محليًا حتى إعادة تحميل الصفحة
      }
      return;
    }
    if (!dragging) return;
    const field = fields.find((f) => f.id === dragging.id);
    setDragging(null);
    if (!field) return;
    try {
      await updateField(field.id, { pos_x: field.pos_x ?? 0, pos_y: field.pos_y ?? 0 });
    } catch {
      // تجاهل فشل حفظ الموضع النهائي؛ يبقى الحقل كما هو محليًا حتى إعادة تحميل الصفحة
    }
  };

  return (
    <>
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      {/* شريط جانبي ثابت (sticky) بدل شريط أعلى الصفحة كان يتطلب الرجوع
          للأعلى بشكل متكرر عند العمل في أسفل مستند طويل. أزرار أنواع الحقول
          قابلة للسحب والإفلات مباشرة فوق المستند، مع بقاء النقر على المستند
          طريقة بديلة سريعة (تستخدم النوع المحدَّد حاليًا). */}
      <div className="space-y-3 lg:sticky lg:top-4 lg:w-64 lg:shrink-0">
        <div className="rounded-xl border border-line bg-card p-3">
          <p className="mb-2 text-xs font-bold text-slate">الطرف المسؤول</p>
          <div className="flex flex-wrap gap-1.5">
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

        <div className="rounded-xl border border-line bg-card p-3">
          <p className="mb-2 text-xs font-bold text-slate">أنواع الحقول — اسحب إلى المستند أو انقر ثم انقر على مكانه</p>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((type) => {
              const Icon = FIELD_TYPE_ICONS[type];
              return (
                <button
                  key={type}
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(DRAG_FIELD_TYPE_MIME, type);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => setSelectedType(type)}
                  className={`flex cursor-grab items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition active:cursor-grabbing ${
                    selectedType === type ? 'bg-seal text-white' : 'bg-paper text-ink'
                  }`}
                >
                  <Icon size={13} className="shrink-0" aria-hidden="true" />
                  {FIELD_TYPE_LABELS[type]}
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-slate">
          اسحب أحد أنواع الحقول من هنا وأفلته على مكانه في المستند، أو انقر لتحديد النوع ثم انقر على مكانه. اسحب الحقول الموضوعة لتغيير مكانها، أو
          اسحب المقبض الدائري في زاويتها لتغيير حجمها.
        </p>
      </div>

      <div className="min-w-0 flex-1 space-y-4">
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
            onDragOver={onPageDragOver}
            onDrop={onPageDrop}
          >
          <Document file={pdfUrl} loading={<p className="p-10 text-sm text-slate">جارِ تحميل المستند...</p>}>
            <Page pageNumber={page} width={600} renderTextLayer={false} renderAnnotationLayer={false} />
          </Document>
          {pageFields.map((field) => (
            <div
              key={field.id}
              onMouseDown={(e) => startDrag(field, e)}
              onClick={(e) => {
                e.stopPropagation();
                if (field.field_type === 'select') {
                  setEditingOptionsFieldId(field.id);
                  setOptionsDraft((field.options ?? []).join('\n'));
                }
              }}
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
              {(() => {
                const Icon = FIELD_TYPE_ICONS[field.field_type];
                return (
                  <span className="flex items-center gap-1">
                    <Icon size={10} className="shrink-0" aria-hidden="true" />
                    {FIELD_TYPE_LABELS[field.field_type]}
                  </span>
                );
              })()}
              {field.field_type === 'select' && (field.options?.length ?? 0) === 0 && (
                <span
                  title="لم تُحدَّد خيارات لهذه القائمة بعد — انقر على الحقل لإضافتها"
                  className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white"
                >
                  <AlertTriangle size={10} />
                </span>
              )}
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
              <div
                onMouseDown={(e) => startResize(field, e)}
                onClick={(e) => e.stopPropagation()}
                title="اسحب لتغيير حجم الحقل"
                className="absolute -bottom-1.5 -right-1.5 hidden h-3.5 w-3.5 cursor-nwse-resize rounded-full border-2 border-white group-hover:block"
                style={{ background: colorFor(field.party_id) }}
              />
            </div>
          ))}
        </div>
      </div>

        {error && <p className="text-sm font-bold text-clay">{error}</p>}
        {fields.length === 0 && <p className="text-center text-xs text-slate">لم تُضف أي حقول بعد</p>}
      </div>
    </div>

    <div className="flex justify-between">
      <Button variant="secondary" onClick={onBack}>
        السابق
      </Button>
      <Button onClick={onNext} disabled={fields.length === 0}>
        التالي: المراجعة والإرسال
      </Button>
    </div>

    {editingOptionsField && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4"
        dir="rtl"
        onClick={() => setEditingOptionsFieldId(null)}
      >
        <div className="w-full max-w-md rounded-md border border-line bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-ink">خيارات القائمة المنسدلة</h3>
            <button
              type="button"
              onClick={() => setEditingOptionsFieldId(null)}
              aria-label="إغلاق"
              className="text-slate hover:text-ink"
            >
              <X size={18} />
            </button>
          </div>
          <p className="mb-2 text-xs text-slate">اكتب كل خيار في سطر منفصل — ستظهر هذه الخيارات للطرف المسؤول عن تعبئة الحقل عند التوقيع.</p>
          <textarea
            value={optionsDraft}
            onChange={(e) => setOptionsDraft(e.target.value)}
            rows={6}
            placeholder={'مثال:\nخيار أول\nخيار ثانٍ\nخيار ثالث'}
            className="w-full resize-none rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-seal"
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditingOptionsFieldId(null)}>
              إلغاء
            </Button>
            <Button onClick={saveFieldOptions}>حفظ</Button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
