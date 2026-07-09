import { ShieldAlert } from 'lucide-react';

export function AdminGate() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-line bg-card p-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-clayLight">
        <ShieldAlert size={24} className="text-clay" />
      </div>
      <h2 className="mb-2 font-display text-lg font-bold text-ink">هذه الصفحة مخصّصة لمدير المنصة فقط</h2>
      <p className="max-w-sm text-sm text-slate">لا تملك صلاحية الوصول إلى هذا القسم.</p>
    </div>
  );
}
