import type { createClient } from 'jsr:@supabase/supabase-js@2';

type AdminClient = ReturnType<typeof createClient>;

function generateTempPassword(): string {
  return crypto.randomUUID().slice(0, 8) + 'Aa1!';
}

interface PartyLike {
  id: string;
  email: string | null;
  full_name: string;
  user_id: string | null;
}

// ينشئ حساب Auth (بدور "member") لطرف عقد لا يملك حسابًا بعد، ويربطه بصف الطرف —
// يمنح "عضوية عادية" تسمح له لاحقًا برؤية عقوده تحت تبويب "عقود تتطلب التوثيق" دون
// انتظار توقيعه الفعلي. يُعيد كلمة المرور المؤقتة فقط عند إنشاء حساب جديد فعليًا.
export async function ensurePartyAccount(
  admin: AdminClient,
  party: PartyLike,
): Promise<{ created: boolean; tempPassword?: string }> {
  if (party.user_id || !party.email) return { created: false };

  const tempPassword = generateTempPassword();
  const { data: created, error } = await admin.auth.admin.createUser({
    email: party.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: party.full_name },
  });

  let userId = created?.user?.id;

  if (error || !userId) {
    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list?.users.find((u) => u.email === party.email);
    if (!existing) {
      console.error('تعذّر إنشاء حساب للطرف ولم يوجد حساب مطابق للبريد', party.email, error);
      return { created: false };
    }
    userId = existing.id;
    await admin.from('contract_parties').update({ user_id: userId }).eq('id', party.id);
    return { created: false };
  }

  await admin.from('contract_parties').update({ user_id: userId }).eq('id', party.id);
  return { created: true, tempPassword };
}
