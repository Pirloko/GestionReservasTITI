-- Gestión & Cuentas — esquema inicial
-- Ejecutar entero en: Supabase → SQL Editor → New query → Run
-- Tablas vacías (sin reservas de ejemplo). RLS: solo tu usuario.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Reservations
-- ---------------------------------------------------------------------------
create table if not exists public.reservations (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null default 'inflables',
  resource_id text not null default '',
  resource_ids text[] not null default '{}',
  date date not null,
  client text not null default '',
  phone text not null default '',
  total numeric(12, 0) not null default 0,
  paid numeric(12, 0) not null default 0,
  method text not null default 'transferencia'
    check (method in ('efectivo', 'transferencia', 'pendiente')),
  notes text not null default '',
  address text not null default '',
  comuna text not null default '',
  comuna_otra text not null default '',
  delivery_fee numeric(12, 0) not null default 0,
  maps_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reservations_user_date_idx
  on public.reservations (user_id, date);

-- ---------------------------------------------------------------------------
-- Plans (cuotas)
-- ---------------------------------------------------------------------------
create table if not exists public.plans (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  provider text not null default '',
  category text not null default '',
  total numeric(12, 0) not null default 0,
  first_due date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plans_user_idx
  on public.plans (user_id);

-- ---------------------------------------------------------------------------
-- Plan installments
-- ---------------------------------------------------------------------------
create table if not exists public.plan_installments (
  id bigint generated always as identity primary key,
  plan_id text not null references public.plans (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  n integer not null check (n >= 1),
  due date not null,
  amount numeric(12, 0) not null default 0,
  paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, n)
);

create index if not exists plan_installments_user_due_idx
  on public.plan_installments (user_id, due);

create index if not exists plan_installments_plan_idx
  on public.plan_installments (plan_id);

-- ---------------------------------------------------------------------------
-- Prefs (tema / tipografía)
-- ---------------------------------------------------------------------------
create table if not exists public.prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme_id text not null default 'bosque',
  primary_color text not null default '#1f3d2f',
  accent_color text not null default '#4a7c59',
  font_step integer not null default 1,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reservations_set_updated_at on public.reservations;
create trigger reservations_set_updated_at
  before update on public.reservations
  for each row execute function public.set_updated_at();

drop trigger if exists plans_set_updated_at on public.plans;
create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

drop trigger if exists plan_installments_set_updated_at on public.plan_installments;
create trigger plan_installments_set_updated_at
  before update on public.plan_installments
  for each row execute function public.set_updated_at();

drop trigger if exists prefs_set_updated_at on public.prefs;
create trigger prefs_set_updated_at
  before update on public.prefs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.reservations enable row level security;
alter table public.plans enable row level security;
alter table public.plan_installments enable row level security;
alter table public.prefs enable row level security;

-- Reservations
drop policy if exists "reservations_select_own" on public.reservations;
drop policy if exists "reservations_insert_own" on public.reservations;
drop policy if exists "reservations_update_own" on public.reservations;
drop policy if exists "reservations_delete_own" on public.reservations;

create policy "reservations_select_own"
  on public.reservations for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "reservations_insert_own"
  on public.reservations for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "reservations_update_own"
  on public.reservations for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "reservations_delete_own"
  on public.reservations for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Plans
drop policy if exists "plans_select_own" on public.plans;
drop policy if exists "plans_insert_own" on public.plans;
drop policy if exists "plans_update_own" on public.plans;
drop policy if exists "plans_delete_own" on public.plans;

create policy "plans_select_own"
  on public.plans for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "plans_insert_own"
  on public.plans for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "plans_update_own"
  on public.plans for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "plans_delete_own"
  on public.plans for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Plan installments
drop policy if exists "plan_installments_select_own" on public.plan_installments;
drop policy if exists "plan_installments_insert_own" on public.plan_installments;
drop policy if exists "plan_installments_update_own" on public.plan_installments;
drop policy if exists "plan_installments_delete_own" on public.plan_installments;

create policy "plan_installments_select_own"
  on public.plan_installments for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "plan_installments_insert_own"
  on public.plan_installments for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "plan_installments_update_own"
  on public.plan_installments for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "plan_installments_delete_own"
  on public.plan_installments for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Prefs
drop policy if exists "prefs_select_own" on public.prefs;
drop policy if exists "prefs_insert_own" on public.prefs;
drop policy if exists "prefs_update_own" on public.prefs;
drop policy if exists "prefs_delete_own" on public.prefs;

create policy "prefs_select_own"
  on public.prefs for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "prefs_insert_own"
  on public.prefs for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "prefs_update_own"
  on public.prefs for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "prefs_delete_own"
  on public.prefs for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Grants (Data API)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.reservations to authenticated;
grant select, insert, update, delete on public.plans to authenticated;
grant select, insert, update, delete on public.plan_installments to authenticated;
grant select, insert, update, delete on public.prefs to authenticated;

grant usage, select on all sequences in schema public to authenticated;
