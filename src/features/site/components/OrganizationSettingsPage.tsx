import { useEffect, useState } from 'react';
import { Building2, Plus, Trash2 } from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { Button } from '@/shared/ui/Button';
import { fileToDataUrl } from '@/shared/lib/fileToDataUrl';
import { fetchSiteSettings, updateSiteSettings, type SiteSettings, type SocialLink } from '../api/siteSettingsApi';

export function OrganizationSettingsPage() {
  const [form, setForm] = useState<SiteSettings | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSiteSettings()
      .then((s) => {
        setForm(s);
        setLogoPreview(s.logo_data_url);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'تعذّر تحميل إعدادات المنشأة'))
      .finally(() => setLoading(false));
  }, []);

  const onLogoUpload = async (file: File) => {
    const dataUrl = await fileToDataUrl(file);
    setLogoPreview(dataUrl);
  };

  const updateSocialLink = (index: number, patch: Partial<SocialLink>) => {
    setForm((f) => f && { ...f, social_links: f.social_links.map((s, i) => (i === index ? { ...s, ...patch } : s)) });
  };

  const addSocialLink = () => {
    setForm((f) => f && { ...f, social_links: [...f.social_links, { label: '', url: '' }] });
  };

  const removeSocialLink = (index: number) => {
    setForm((f) => f && { ...f, social_links: f.social_links.filter((_, i) => i !== index) });
  };

  const save = async () => {
    if (!form) return;
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const cleanLinks = form.social_links.filter((s) => s.label.trim() && s.url.trim());
      const updated = await updateSiteSettings({ ...form, logo_data_url: logoPreview, social_links: cleanLinks });
      setForm(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر حفظ إعدادات المنشأة');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) return <p className="text-sm text-slate">جارِ التحميل...</p>;

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!saving) save();
      }}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-sealLight">
          <Building2 size={20} className="text-seal" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">هوية المنشأة</h1>
          <p className="text-sm text-slate">الاسم والشعار وبيانات التواصل التي تظهر في الصفحة الرئيسية وصفحة اتصل بنا.</p>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="mb-4 font-display text-sm font-bold text-ink">الشعار والاسم</h2>
        <div className="mb-4 flex items-center gap-4">
          {logoPreview ? (
            <img src={logoPreview} alt="شعار المنشأة" className="h-16 w-16 rounded-lg border border-line bg-card object-contain p-1" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-line text-xs text-slate">لا يوجد</div>
          )}
          <div className="flex-1 space-y-2">
            <label className="text-xs font-bold text-seal">
              رفع شعار جديد
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onLogoUpload(file);
                }}
                className="mt-1.5 block w-full text-xs"
              />
            </label>
            {logoPreview && (
              <button type="button" onClick={() => setLogoPreview(null)} className="text-xs font-bold text-clay">
                إزالة الشعار
              </button>
            )}
          </div>
        </div>
        <Field label="اسم المنشأة المعروض" value={form.org_name} onChange={(v) => setForm((f) => f && { ...f, org_name: v })} required />
      </div>

      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="mb-4 font-display text-sm font-bold text-ink">بيانات التواصل</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="البريد الإلكتروني"
            value={form.contact_email ?? ''}
            onChange={(v) => setForm((f) => f && { ...f, contact_email: v || null })}
            type="email"
          />
          <Field
            label="رقم الهاتف"
            value={form.contact_phone ?? ''}
            onChange={(v) => setForm((f) => f && { ...f, contact_phone: v || null })}
          />
          <Field
            label="رقم واتساب (بدون + أو أصفار، مثال: 966500000000)"
            value={form.whatsapp_number ?? ''}
            onChange={(v) => setForm((f) => f && { ...f, whatsapp_number: v || null })}
            digitsOnly
            hint="يُستخدم تلقائيًا في زر واتساب العائم بكل صفحات الموقع"
          />
        </div>
      </div>

      <div className="rounded-xl border border-line bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-ink">حسابات التواصل الاجتماعي</h2>
          <button type="button" onClick={addSocialLink} className="flex items-center gap-1 rounded-lg bg-sealLight px-2.5 py-1 text-xs font-bold text-seal">
            <Plus size={14} /> إضافة حساب
          </button>
        </div>
        <div className="space-y-3">
          {form.social_links.map((link, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="w-32 shrink-0">
                <Field label="المنصة" value={link.label} onChange={(v) => updateSocialLink(i, { label: v })} placeholder="Instagram" />
              </div>
              <div className="flex-1">
                <Field label="الرابط الكامل" value={link.url} onChange={(v) => updateSocialLink(i, { url: v })} placeholder="https://..." />
              </div>
              <button type="button" onClick={() => removeSocialLink(i)} className="mb-2.5 text-clay">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {form.social_links.length === 0 && <p className="text-sm text-slate">لا توجد حسابات مضافة بعد</p>}
        </div>
      </div>

      {error && <p className="text-sm font-bold text-clay">{error}</p>}
      {saved && <p className="text-sm font-bold text-sage">تم الحفظ بنجاح</p>}
      <Button type="submit" disabled={saving}>
        {saving ? 'جارِ الحفظ...' : 'حفظ الإعدادات'}
      </Button>
    </form>
  );
}
