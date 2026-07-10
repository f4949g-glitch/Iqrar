import { User } from 'lucide-react';
import type { Profile } from '../types';
import { formatDate } from '@/shared/lib/formatDate';

const ROLE_LABEL: Record<string, string> = { admin: 'مدير المنصة', member: 'عضو' };

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-3 last:border-0">
      <span className="text-xs font-bold text-slate">{label}</span>
      <span className="text-sm text-ink">{value}</span>
    </div>
  );
}

export function ProfilePage({ profile }: { profile: Profile }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sealLight">
          <User size={28} className="text-seal" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">{profile.full_name || 'الملف الشخصي'}</h1>
          <p className="text-sm text-slate">{ROLE_LABEL[profile.role] ?? profile.role}</p>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-card p-5">
        <Row label="البريد الإلكتروني" value={profile.email} />
        <Row label="رقم الهوية" value={profile.national_id || '—'} />
        <Row label="الجنسية" value={profile.nationality || '—'} />
        <Row label="رقم الجوال" value={profile.phone || '—'} />
        <Row label="تاريخ الميلاد" value={profile.date_of_birth ? formatDate(profile.date_of_birth) : '—'} />
      </div>
    </div>
  );
}
