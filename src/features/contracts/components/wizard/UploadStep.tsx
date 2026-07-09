import { useState } from 'react';
import { Document, Page } from 'react-pdf';
import { UploadCloud } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import '@/lib/pdf/setupWorker';

interface UploadStepProps {
  file: File | null;
  onFileChange: (file: File, pageCount: number) => void;
  onBack: () => void;
  onNext: () => void;
}

export function UploadStep({ file, onFileChange, onBack, onNext }: UploadStepProps) {
  const [error, setError] = useState('');
  const [pageCount, setPageCount] = useState<number | null>(null);

  const handleFile = (f: File | undefined) => {
    setError('');
    if (!f) return;
    if (f.type !== 'application/pdf') {
      setError('يُسمح برفع ملفات PDF فقط في هذه المرحلة');
      return;
    }
    setPageCount(null);
    onFileChange(f, 0);
  };

  return (
    <div className="space-y-6">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-card p-10 text-center">
        <UploadCloud size={28} className="text-slate" />
        <span className="text-sm font-bold text-ink">{file ? file.name : 'اضغط لاختيار ملف PDF'}</span>
        <span className="text-xs text-slate">PDF فقط حاليًا — دعم Word قادم في مرحلة لاحقة</span>
        <input
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>

      {error && <p className="text-sm font-bold text-clay">{error}</p>}

      {file && (
        <div className="overflow-hidden rounded-xl border border-line bg-card">
          <Document
            file={file}
            onLoadSuccess={({ numPages }) => {
              setPageCount(numPages);
              onFileChange(file, numPages);
            }}
            onLoadError={() => setError('تعذّر قراءة ملف PDF')}
            loading={<p className="p-6 text-sm text-slate">جارِ تحميل المعاينة...</p>}
          >
            <Page pageNumber={1} width={480} />
          </Document>
          {pageCount !== null && <p className="border-t border-line p-3 text-center text-xs text-slate">عدد الصفحات: {pageCount}</p>}
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack}>
          السابق
        </Button>
        <Button onClick={onNext} disabled={!file || !pageCount}>
          التالي: إضافة الحقول
        </Button>
      </div>
    </div>
  );
}
