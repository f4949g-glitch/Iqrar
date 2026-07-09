-- دعم إنشاء العقد بمحرر نص غني (حقول دمج + حقول تعبئة) كبديل لرفع PDF.

alter table public.contracts
  add column body_json jsonb,
  add column final_html text;

-- الحقول المرتبطة بمحرر النص (anchor_id يطابق معرّف عقدة الحقل داخل body_json)
-- لا تملك موضعًا/صفحة كحقول PDF، لذا نُرخي هذه الأعمدة لتقبل NULL.
alter table public.contract_fields
  alter column page_number drop not null,
  alter column pos_x drop not null,
  alter column pos_y drop not null,
  alter column width drop not null,
  alter column height drop not null,
  add column anchor_id text;

create index contract_fields_anchor_idx on public.contract_fields (contract_id, anchor_id) where anchor_id is not null;
