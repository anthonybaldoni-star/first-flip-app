-- Multi-tenant SaaS: profiles mirror subscription state updated by Stripe webhooks (server-side only).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  subscription_tier text not null default 'free'
    check (subscription_tier in ('free', 'pro', 'team', 'enterprise')),
  subscription_status text,
  stripe_customer_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Inserts typically via trigger on signup; service role bypasses RLS for webhook updates.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
