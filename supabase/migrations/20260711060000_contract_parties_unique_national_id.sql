create unique index if not exists contract_parties_contract_national_id_key
  on public.contract_parties (contract_id, national_id)
  where national_id is not null and national_id <> '';
