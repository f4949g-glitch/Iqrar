import { describe, expect, it } from 'vitest';
import { translateErrorMessage, getErrorMessage, extractFunctionError } from '../errorMessage';

describe('translateErrorMessage', () => {
  it('يترجم خطأ تكرار مفتاح فريد', () => {
    expect(translateErrorMessage('duplicate key value violates unique constraint "x"')).toBe(
      'هذه البيانات مسجَّلة مسبقًا، لا يمكن تكرارها',
    );
  });

  it('يترجم خطأ صلاحيات RLS', () => {
    expect(translateErrorMessage('new row violates row-level security policy for table "contracts"')).toBe(
      'ليست لديك صلاحية كافية لتنفيذ هذا الإجراء',
    );
  });

  it('يترجم انتهاء صلاحية الجلسة (JWT)', () => {
    expect(translateErrorMessage('JWT expired')).toBe('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجددًا');
  });

  it('يترجم خطأ الشبكة', () => {
    expect(translateErrorMessage('Failed to fetch')).toBe('تعذّر الاتصال بالخادم، تحقق من اتصال الإنترنت وحاول مجددًا');
  });

  it('يعيد الرسالة كما هي عند عدم مطابقة أي نمط معروف', () => {
    expect(translateErrorMessage('some unrecognized backend error')).toBe('some unrecognized backend error');
  });

  it('المطابقة غير حساسة لحالة الأحرف', () => {
    expect(translateErrorMessage('FAILED TO FETCH')).toBe('تعذّر الاتصال بالخادم، تحقق من اتصال الإنترنت وحاول مجددًا');
  });
});

describe('getErrorMessage', () => {
  it('يستخرج ويترجم رسالة من كائن Error حقيقي', () => {
    expect(getErrorMessage(new Error('Failed to fetch'), 'خطأ عام')).toBe('تعذّر الاتصال بالخادم، تحقق من اتصال الإنترنت وحاول مجددًا');
  });

  it('يستخرج الرسالة من كائن شبيه بالخطأ بلا instanceof Error', () => {
    expect(getErrorMessage({ message: 'JWT expired' }, 'خطأ عام')).toBe('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجددًا');
  });

  it('يعيد الرسالة الاحتياطية عند قيمة غير معروفة الشكل', () => {
    expect(getErrorMessage('sträng نص عشوائي', 'خطأ عام')).toBe('خطأ عام');
    expect(getErrorMessage(null, 'خطأ عام')).toBe('خطأ عام');
    expect(getErrorMessage({}, 'خطأ عام')).toBe('خطأ عام');
  });

  it('يعيد الرسالة الاحتياطية عندما تكون message فارغة', () => {
    expect(getErrorMessage(new Error(''), 'خطأ عام')).toBe('خطأ عام');
  });
});

describe('extractFunctionError', () => {
  it('يستخرج حقل error من جسم استجابة Edge Function JSON', async () => {
    const context = new Response(JSON.stringify({ error: 'رسالة عربية مخصصة' }));
    const err = await extractFunctionError({ message: 'Edge Function returned a non-2xx status code', context });
    expect(err.message).toBe('رسالة عربية مخصصة');
  });

  it('يترجم رسالة error.message العامة عند تعذّر تحليل جسم الاستجابة', async () => {
    const context = new Response('not json at all');
    const err = await extractFunctionError({ message: 'Failed to fetch', context });
    expect(err.message).toBe('تعذّر الاتصال بالخادم، تحقق من اتصال الإنترنت وحاول مجددًا');
  });

  it('يترجم رسالة error.message العامة عند غياب context تمامًا', async () => {
    const err = await extractFunctionError({ message: 'Edge Function returned a non-2xx status code' });
    expect(err.message).toBe('حدث خطأ أثناء تنفيذ العملية على الخادم');
  });
});
