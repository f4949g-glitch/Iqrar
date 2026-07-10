-- استبدال حقول التواصل الاجتماعي الثابتة (Instagram/X/أخرى) بقائمة قابلة للتوسع
-- (زر + لإضافة عدة حسابات)، وإضافة رقم واتساب قابل للتعديل من الإعدادات بدل
-- الرقم الثابت في الكود، يستخدمه زر واتساب العائم في كل الموقع.

alter table public.site_settings
  add column social_links jsonb not null default '[]'::jsonb,
  add column whatsapp_number text,
  drop column social_instagram,
  drop column social_x,
  drop column social_other_label,
  drop column social_other_url;
