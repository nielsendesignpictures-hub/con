-- ============================================================
-- Kontraktstyring - komplet database-skema
-- Kør hele filen i Supabase SQL Editor
-- ============================================================

-- ---------- ENUMS ----------
create type user_role as enum ('admin', 'reader');
create type contract_status as enum ('active', 'terminated', 'renegotiated', 'expired');

-- ---------- PROFILES (1:1 med auth.users) ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text not null,
  role user_role not null default 'reader',
  created_at timestamptz not null default now()
);

-- Auto-opret profil ved signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Hjælpefunktion til RLS (security definer undgår rekursiv RLS på profiles)
create or replace function public.is_admin()
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- LOCATIONS ----------
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cvr text not null unique check (cvr ~ '^[0-9]{8}$'),
  address text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- CATEGORIES ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

insert into public.categories (name) values
  ('IT'), ('Internet'), ('Telefoni'), ('Hygiejne'), ('Måtteservice'),
  ('Alarm og sikkerhed'), ('Energi'), ('Leasing'), ('Leverandøraftaler'), ('Bonusaftaler');

-- ---------- CONTRACTS ----------
create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id) on delete restrict,
  category_id uuid not null references public.categories (id) on delete restrict,
  supplier text not null,
  title text not null default '',
  start_date date,
  binding_months int check (binding_months >= 0),
  expiry_date date not null,
  notice_months int not null default 0 check (notice_months >= 0),
  termination_deadline date, -- sættes af trigger: expiry_date - notice_months
  auto_renews boolean not null default false,
  renewal_months int,
  status contract_status not null default 'active',
  notes text,
  needs_validation text[] not null default '{}', -- felter AI ikke var sikker på
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contracts_location_idx on public.contracts (location_id);
create index contracts_category_idx on public.contracts (category_id);
create index contracts_deadline_idx on public.contracts (termination_deadline) where status = 'active';

create or replace function public.set_contract_computed()
returns trigger language plpgsql as $$
begin
  new.termination_deadline := (new.expiry_date - make_interval(months => new.notice_months))::date;
  new.updated_at := now();
  return new;
end;
$$;

create trigger contracts_computed
  before insert or update on public.contracts
  for each row execute function public.set_contract_computed();

-- ---------- CONTRACT DOCUMENTS ----------
create table public.contract_documents (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  file_size bigint,
  uploaded_by uuid references public.profiles (id) on delete set null,
  uploaded_at timestamptz not null default now()
);

-- ---------- NOTIFICATIONS ----------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  contract_id uuid references public.contracts (id) on delete cascade,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, read);

-- ---------- PUSH SUBSCRIPTIONS ----------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

-- ---------- REMINDER LOG (dublet-værn) ----------
create table public.reminder_log (
  contract_id uuid not null references public.contracts (id) on delete cascade,
  deadline date not null,
  sent_at timestamptz not null default now(),
  primary key (contract_id, deadline)
);

-- ---------- VIEW: kontraktoverblik med status-farve ----------
create or replace view public.contract_overview
with (security_invoker = true) as
select
  c.*,
  l.name as location_name,
  l.cvr as location_cvr,
  k.name as category_name,
  (c.termination_deadline - current_date) as days_to_deadline,
  case
    when c.status <> 'active' then 'none'
    when c.termination_deadline - current_date <= 30 then 'red'
    when c.termination_deadline - current_date <= 60 then 'yellow'
    else 'green'
  end as urgency
from public.contracts c
join public.locations l on l.id = c.location_id
join public.categories k on k.id = c.category_id;

-- ============================================================
-- ROW LEVEL SECURITY
-- Læsebrugere: SELECT. Administratorer: alt. Håndhæves i DB.
-- ============================================================
alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.categories enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_documents enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.reminder_log enable row level security;

-- profiles: alle loggede ind kan se profiler (navne i UI), kun admin ændrer roller
create policy "profiles select" on public.profiles for select to authenticated using (true);
create policy "profiles update own name" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
create policy "profiles admin update" on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- locations / categories / contracts / documents: læs for alle, skriv for admin
create policy "locations select" on public.locations for select to authenticated using (true);
create policy "locations admin all" on public.locations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "categories select" on public.categories for select to authenticated using (true);
create policy "categories admin all" on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "contracts select" on public.contracts for select to authenticated using (true);
create policy "contracts admin all" on public.contracts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "documents select" on public.contract_documents for select to authenticated using (true);
create policy "documents admin all" on public.contract_documents for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- notifications: kun egne
create policy "notifications own select" on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy "notifications own update" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- push subscriptions: kun egne
create policy "push own all" on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- reminder_log: ingen klient-adgang (kun service role via edge function)

-- ============================================================
-- STORAGE: privat bucket "contracts"
-- Opret bucket'en i Dashboard -> Storage (navn: contracts, privat),
-- og kør derefter disse politikker:
-- ============================================================
create policy "contracts pdf read" on storage.objects for select to authenticated
  using (bucket_id = 'contracts');
create policy "contracts pdf write" on storage.objects for insert to authenticated
  with check (bucket_id = 'contracts' and public.is_admin());
create policy "contracts pdf delete" on storage.objects for delete to authenticated
  using (bucket_id = 'contracts' and public.is_admin());

-- ============================================================
-- VALGFRIT: dagligt cron via pg_cron i stedet for Dashboard-schedule
-- (Database -> Extensions -> aktivér pg_cron og pg_net først)
-- ============================================================
-- select cron.schedule('check-deadlines-daily', '0 7 * * *', $$
--   select net.http_post(
--     url := 'https://DIT-PROJEKT.supabase.co/functions/v1/check-deadlines',
--     headers := '{"Authorization": "Bearer DIN-SERVICE-ROLE-KEY"}'::jsonb
--   );
-- $$);
