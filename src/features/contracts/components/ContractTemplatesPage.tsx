import { useEffect, useMemo, useState } from 'react';
import type { JSONContent } from '@tiptap/react';
import { Plus, Trash2, Search } from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { Button } from '@/shared/ui/Button';
import { useSession } from '@/features/auth/hooks/useSession';
import { listAllUsers } from '@/features/auth/api/adminUsersApi';
import type { Profile } from '@/features/auth';
import { ContractEditor } from '../editor/ContractEditor';
import { emptyParty } from './wizard/PartiesStep';
import { syntheticContractParties, TEMPLATE_PARTY_PREFIX } from '../lib/syntheticParties';
import {
  createTemplate,
  deleteTemplate,
  listAllTemplates,
  listTemplateAccess,
  setTemplateAccess,
  toggleTemplate,
  updateTemplate,
  type ContractTemplate,
} from '../api/contractTemplatesApi';
import { DOCUMENT_TYPE_LABELS, type DocumentType } from '../types';

const emptyForm = {
  title: '',
  documentType: 'contract' as DocumentType,
  partyCount: 2,
  sequentialSigning: false,
};

export function ContractTemplatesPage() {
  const { profile } = useSession();
  const isAdmin = profile?.role === 'admin';

  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [bodyJson, setBodyJson] = useState<JSONContent | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [t, u] = await Promise.all([listAllTemplates(), listAllUsers()]);
      setTemplates(t);
      setUsers(u);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تحميل قوالب العقود');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const editorParties = useMemo(
    () =>
      syntheticContractParties(
        Array.from({ length: Math.max(1, Math.min(10, form.partyCount)) }, (_, i) => ({
          ...emptyParty(i),
          partyId: `${TEMPLATE_PARTY_PREFIX}${i}`,
        })),
      ),
    [form.partyCount],
  );

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setBodyJson(null);
    setSelectedUserIds([]);
    setUserSearch('');
  };

  const startEdit = async (template: ContractTemplate) => {
    setError('');
    setEditingId(template.id);
    setForm({
      title: template.title,
      documentType: template.document_type,
      partyCount: template.party_count,
      sequentialSigning: template.sequential_signing,
    });
    setBodyJson(template.body_json);
    try {
      const grants = await listTemplateAccess(template.id);
      setSelectedUserIds(grants.map((g) => g.user_id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تحميل المستخدمين المسموح لهم');
    }
  };

  const save = async () => {
    setError('');
    if (!form.title.trim()) {
      setError('عنوان القالب مطلوب');
      return;
    }
    if (!bodyJson) {
      setError('اكتب محتوى القالب أولًا');
      return;
    }
    setSaving(true);
    try {
      const input = {
        title: form.title.trim(),
        document_type: form.documentType,
        body_json: bodyJson,
        party_count: Math.max(1, Math.min(10, form.partyCount)),
        sequential_signing: form.sequentialSigning,
      };
      const saved = editingId ? await updateTemplate(editingId, input) : await createTemplate(input);
      await setTemplateAccess(saved.id, selectedUserIds);
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر حفظ القالب');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (template: ContractTemplate) => {
    await toggleTemplate(template.id, !template.is_active);
    await load();
  };

  const remove = async (id: string) => {
    await deleteTemplate(id);
    if (editingId === id) resetForm();
    await load();
  };

  const filteredUsers = users.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return (u.full_name ?? '').toLowerCase().includes(q) || (u.national_id ?? '').includes(q) || u.email.toLowerCase().includes(q);
  });

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  };

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold text-ink">قوالب العقود</h1>

      <div className="space-y-4 rounded-xl border border-line bg-card p-5">
        <h2 className="font-display text-sm font-bold text-ink">{editingId ? 'تعديل القالب' : 'إنشاء قالب جديد'}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="عنوان القالب" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} required />
          <label className="block text-sm">
            <span className="mb-1 block font-bold text-ink">نوع الوثيقة</span>
            <select
              value={form.documentType}
              onChange={(e) => setForm((f) => ({ ...f, documentType: e.target.value as DocumentType }))}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus:border-seal"
            >
              {(Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]).map((dt) => (
                <option key={dt} value={dt}>
                  {DOCUMENT_TYPE_LABELS[dt]}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="عدد الأطراف"
            value={String(form.partyCount)}
            onChange={(v) => setForm((f) => ({ ...f, partyCount: Number(v) || 1 }))}
            type="number"
            min={1}
            max={10}
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.sequentialSigning}
            onChange={(e) => setForm((f) => ({ ...f, sequentialSigning: e.target.checked }))}
          />
          <span className="font-bold text-ink">ترتيب توقيع إلزامي (كل طرف يوقّع بعد من يسبقه بحسب ترتيب الأطراف)</span>
        </label>

        <div>
          <p className="mb-2 text-xs font-bold text-slate">
            محتوى القالب (استخدم "إدراج حقل دمج"/"إدراج حقل تعبئة" لكل طرف بالضبط كما في محتوى عقد حقيقي)
          </p>
          {/* إعادة إنشاء المحرر بتغيّر عدد الأطراف: تغيير العدد بعد كتابة محتوى
              يُبطل مراجع الأطراف داخله على أي حال، فيُعاد التأليف بدل ترك مراجع معطوبة. */}
          <ContractEditor key={form.partyCount} parties={editorParties} content={bodyJson} onChange={setBodyJson} />
        </div>

        <div>
          <p className="mb-2 text-xs font-bold text-ink">المستخدمون المسموح لهم باستخدام هذا القالب ({selectedUserIds.length})</p>
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2">
            <Search size={15} className="text-slate" />
            <input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="ابحث بالاسم أو رقم الهوية أو البريد"
              className="w-full text-sm text-ink outline-none"
            />
          </div>
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-line p-2">
            {filteredUsers.map((u) => (
              <label key={u.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-paper">
                <input type="checkbox" checked={selectedUserIds.includes(u.id)} onChange={() => toggleUser(u.id)} />
                <span className="font-bold text-ink">{u.full_name || u.email}</span>
                <span className="text-xs text-slate">{u.national_id || u.email}</span>
              </label>
            ))}
            {filteredUsers.length === 0 && <p className="p-2 text-xs text-slate">لا يوجد مستخدمون مطابقون</p>}
          </div>
        </div>

        {error && <p className="text-sm font-bold text-clay">{error}</p>}
        <div className="flex items-center gap-2">
          <Button onClick={save} disabled={saving}>
            <span className="flex items-center gap-1.5">
              <Plus size={16} /> {saving ? 'جارِ الحفظ...' : editingId ? 'حفظ التعديلات' : 'إنشاء القالب'}
            </span>
          </Button>
          {editingId && (
            <Button variant="secondary" onClick={resetForm} disabled={saving}>
              إلغاء التعديل
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="mb-4 font-display text-sm font-bold text-ink">القوالب الحالية</h2>
        {loading && <p className="text-sm text-slate">جارِ التحميل...</p>}
        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-3">
              <div>
                <p className="font-bold text-ink">{t.title}</p>
                <p className="text-xs text-slate">
                  {DOCUMENT_TYPE_LABELS[t.document_type]} · {t.party_count} أطراف
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggle(t)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold ${t.is_active ? 'bg-sageLight text-sage' : 'bg-line text-slate'}`}
                >
                  {t.is_active ? 'مُفعَّل' : 'مُعطَّل'}
                </button>
                <button type="button" onClick={() => startEdit(t)} className="text-xs font-bold text-seal">
                  تعديل
                </button>
                <button type="button" onClick={() => remove(t.id)} className="text-clay">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {!loading && templates.length === 0 && <p className="text-sm text-slate">لا توجد قوالب بعد</p>}
        </div>
      </div>
    </div>
  );
}
