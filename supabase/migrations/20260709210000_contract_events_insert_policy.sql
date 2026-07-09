-- كان send_contract (security invoker) يفشل عند إدراج حدث "sent" لعدم وجود
-- سياسة INSERT على contract_events للمستخدم المصادَق، فتُرفض العملية بكاملها.
create policy contract_events_insert on public.contract_events
  for insert with check (
    private.is_admin() or exists (select 1 from public.contracts c where c.id = contract_id and c.created_by = auth.uid())
  );
