// يستخرج رسالة قابلة للعرض من أي قيمة مرفوضة (Error حقيقي، أو كائن خطأ من
// supabase-js كـ PostgrestError/FunctionsHttpError لا يجتاز دومًا instanceof Error
// عبر حدود الحزم)، بدل عرض "{}" أو رسالة عامة لا تفيد في التشخيص.
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    const message = (err as { message: string }).message;
    if (message) return message;
  }
  return fallback;
}
