import { FileText, PenLine } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { DOCUMENT_TYPE_DEFINITE_LABELS, type DocumentType } from '../../types';

interface MethodStepProps {
  documentType: DocumentType;
  onSelect: (method: 'pdf' | 'editor') => void;
  onBack: () => void;
  busy?: boolean;
}

export function MethodStep({ documentType, onSelect, onBack, busy = false }: MethodStepProps) {
  const docLabel = DOCUMENT_TYPE_DEFINITE_LABELS[documentType];
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate">اختر طريقة إنشاء محتوى {docLabel}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onSelect('editor')}
          disabled={busy}
          className="flex flex-col items-start gap-3 rounded-2xl border border-line bg-card p-6 text-right shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-sm"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sealLight">
            <PenLine size={20} className="text-seal" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold text-ink">كتابة {docLabel} داخل المنصة</h3>
            <p className="mt-1 text-xs text-slate">محرر نصوص كامل مع حقول دمج تُملأ تلقائيًا من بيانات الأطراف، وحقول يعبّئها كل طرف بنفسه</p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => onSelect('pdf')}
          disabled={busy}
          className="flex flex-col items-start gap-3 rounded-2xl border border-line bg-card p-6 text-right shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-sm"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sageLight">
            <FileText size={20} className="text-sage" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold text-ink">رفع ملف PDF جاهز</h3>
            <p className="mt-1 text-xs text-slate">ارفع مستندًا جاهزًا وضع حقول التوقيع والتعبئة فوقه بالسحب والإفلات</p>
          </div>
        </button>
      </div>
      <Button variant="secondary" onClick={onBack} disabled={busy}>
        السابق
      </Button>
    </div>
  );
}
