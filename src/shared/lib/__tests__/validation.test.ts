import { describe, expect, it } from 'vitest';
import { emailError, nationalIdError, passwordError, phoneError } from '../validation';

describe('nationalIdError', () => {
  it('يقبل رقم هوية سعودي صحيح من 10 أرقام', () => {
    expect(nationalIdError('1000383644')).toBeNull();
  });

  it('يرفض رقمًا أقل من 10 أرقام', () => {
    expect(nationalIdError('123456789')).not.toBeNull();
  });

  it('يرفض رقمًا يحتوي على أحرف غير رقمية', () => {
    expect(nationalIdError('10003836a4')).not.toBeNull();
  });

  it('يرفض قيمة فارغة', () => {
    expect(nationalIdError('')).not.toBeNull();
  });
});

describe('passwordError', () => {
  it('يقبل كلمة مرور تحقّق كل الشروط', () => {
    expect(passwordError('Iqrar123!')).toBeNull();
  });

  it('يرفض كلمة مرور أقصر من 8 أحرف', () => {
    expect(passwordError('Iq1!')).not.toBeNull();
  });

  it('يرفض كلمة مرور أطول من 15 حرفًا', () => {
    expect(passwordError('Iqrar1234567890!')).not.toBeNull();
  });

  it('يرفض كلمة مرور بلا حرف كبير', () => {
    expect(passwordError('iqrar123!')).not.toBeNull();
  });

  it('يرفض كلمة مرور بلا حرف صغير', () => {
    expect(passwordError('IQRAR123!')).not.toBeNull();
  });

  it('يرفض كلمة مرور بلا رقم', () => {
    expect(passwordError('Iqrarxxx!')).not.toBeNull();
  });

  it('يرفض كلمة مرور بلا رمز خاص', () => {
    expect(passwordError('Iqrar1234')).not.toBeNull();
  });
});

describe('emailError', () => {
  it('يقبل بريدًا إلكترونيًا صحيحًا', () => {
    expect(emailError('user@example.com')).toBeNull();
  });

  it('يرفض بريدًا بلا علامة @', () => {
    expect(emailError('userexample.com')).not.toBeNull();
  });

  it('يرفض بريدًا بلا نطاق', () => {
    expect(emailError('user@')).not.toBeNull();
  });

  it('يرفض بريدًا يحتوي على مسافة', () => {
    expect(emailError('user name@example.com')).not.toBeNull();
  });
});

describe('phoneError', () => {
  it('يقبل رقم جوال سعودي بالصيغة الدولية الصحيحة', () => {
    expect(phoneError('966501234567')).toBeNull();
  });

  it('يرفض رقمًا لا يبدأ بـ9665', () => {
    expect(phoneError('966401234567')).not.toBeNull();
  });

  it('يرفض رقمًا بصيغة محلية 05xxxxxxxx', () => {
    expect(phoneError('0501234567')).not.toBeNull();
  });

  it('يرفض رقمًا بعدد أرقام غير صحيح', () => {
    expect(phoneError('96650123456')).not.toBeNull();
  });
});
