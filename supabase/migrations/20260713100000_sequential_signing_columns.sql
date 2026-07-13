alter table public.contracts add column sequential_signing boolean not null default false;
alter table public.contract_templates add column sequential_signing boolean not null default false;
