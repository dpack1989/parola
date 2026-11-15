create table if not exists public.parola_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.parola_state enable row level security;

revoke all on table public.parola_state from anon;
revoke all on table public.parola_state from authenticated;
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.parola_state to authenticated;

drop policy if exists "Eigene Parola-Daten lesen" on public.parola_state;
create policy "Eigene Parola-Daten lesen"
  on public.parola_state
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Eigene Parola-Daten anlegen" on public.parola_state;
create policy "Eigene Parola-Daten anlegen"
  on public.parola_state
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Eigene Parola-Daten ändern" on public.parola_state;
create policy "Eigene Parola-Daten ändern"
  on public.parola_state
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Eigene Parola-Daten löschen" on public.parola_state;
create policy "Eigene Parola-Daten löschen"
  on public.parola_state
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.touch_parola_state()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  new.version = old.version + 1;
  return new;
end;
$$;

drop trigger if exists touch_parola_state_updated_at on public.parola_state;
create trigger touch_parola_state_updated_at
before update on public.parola_state
for each row execute function public.touch_parola_state();
