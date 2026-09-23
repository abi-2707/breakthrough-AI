create table if not exists public.patients (
  id text primary key,
  name text not null,
  age integer not null default 0,
  condition text not null default 'General Health Monitoring',
  "joinedDate" text not null default 'Today',
  prescriptions jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.patients enable row level security;

revoke all on table public.patients from anon, authenticated;
grant select, insert, update, delete on table public.patients to service_role;

create or replace function public.set_patients_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists patients_updated_at on public.patients;
create trigger patients_updated_at
before update on public.patients
for each row execute function public.set_patients_updated_at();
