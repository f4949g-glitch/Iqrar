// يترجم أنماط أخطاء Postgres/الشبكة الإنجليزية الشائعة إلى رسالة عربية تشرح
// السبب، بدل عرضها كما هي للمستخدم. أي نمط غير معروف يُعاد كما وصل (أفضل من
// إخفائه بالكامل، ويبقى قابلًا للتشخيص من لقطة شاشة).
const ERROR_PATTERNS: Array<[RegExp, string]> = [
  [/duplicate key value violates unique constraint/i, 'هذه البيانات مسجَّلة مسبقًا، لا يمكن تكرارها'],
  [/violates row-level security policy/i, 'ليست لديك صلاحية كافية لتنفيذ هذا الإجراء'],
  [/violates foreign key constraint/i, 'البيانات مرتبطة بعنصر آخر لا يمكن تجاهله، تحقق من صحة القيم المدخلة'],
  [/violates not-null constraint/i, 'يوجد حقل مطلوب لم يُعبَّأ'],
  [/JWT expired|invalid JWT|invalid claim|PGRST301/i, 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجددًا'],
  [/Failed to fetch|NetworkError|network request failed|Load failed/i, 'تعذّر الاتصال بالخادم، تحقق من اتصال الإنترنت وحاول مجددًا'],
  [/Edge Function returned a non-2xx status code/i, 'حدث خطأ أثناء تنفيذ العملية على الخادم'],
  [/Relay Error invoking the Edge Function/i, 'تعذّر الوصول للخادم مؤقتًا، حاول مجددًا بعد قليل'],
];

export function translateErrorMessage(message: string): string {
  for (const [pattern, arabic] of ERROR_PATTERNS) {
    if (pattern.test(message)) return arabic;
  }
  return message;
}

// يستخرج رسالة قابلة للعرض من أي قيمة مرفوضة (Error حقيقي، أو كائن خطأ من
// supabase-js كـ PostgrestError/FunctionsHttpError لا يجتاز دومًا instanceof Error
// عبر حدود الحزم)، بدل عرض "{}" أو رسالة عامة لا تفيد في التشخيص.
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return translateErrorMessage(err.message);
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    const message = (err as { message: string }).message;
    if (message) return translateErrorMessage(message);
  }
  return fallback;
}

// يستخرج رسالة الخطأ العربية من جسم استجابة Edge Function عند فشل استدعاء
// supabase.functions.invoke (الحقل `error` داخل جسم JSON للاستجابة)، بدل
// الاكتفاء برسالة error.message العامة مثل "Edge Function returned a non-2xx
// status code" التي لا تشرح السبب الفعلي للمستخدم.
export async function extractFunctionError(error: { message: string; context?: unknown }): Promise<Error> {
  const context = error.context as Response | undefined;
  if (context && typeof context.clone === 'function') {
    try {
      const parsed = await context.clone().json();
      if (parsed?.error) return new Error(parsed.error);
    } catch {
      // تجاهل فشل التحليل والانتقال إلى الرسالة العامة أدناه
    }
  }
  return new Error(translateErrorMessage(error.message));
}
