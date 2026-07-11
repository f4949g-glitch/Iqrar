alter table public.contract_parties
  add constraint contract_parties_contract_id_order_index_key unique (contract_id, order_index);
