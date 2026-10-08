-- Kampuscape membership and private onboarding profiles.
-- Install both Auth hooks from config.toml before enabling sign-ins in production.
create schema if not exists kampuscape_private;
revoke all on schema kampuscape_private from public, anon, authenticated;

create or replace function public.kampuscape_is_uic_email(email text)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(email ~* '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@uic\.edu$', false);
$$;
revoke all on function public.kampuscape_is_uic_email(text) from public;
grant execute on function public.kampuscape_is_uic_email(text) to authenticated, supabase_auth_admin;

-- Database guard prevents non-UIC signups and email changes, including direct Auth requests.
create or replace function kampuscape_private.enforce_uic_email()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not public.kampuscape_is_uic_email(new.email)
     or (coalesce(new.email_change, '') <> '' and not public.kampuscape_is_uic_email(new.email_change))
     or coalesce(new.is_anonymous, false) then
    raise exception 'Kampuscape requires an @uic.edu email address.' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function kampuscape_private.enforce_uic_email() from public, anon, authenticated;
create trigger kampuscape_uic_email_guard before insert or update of email, email_change, is_anonymous
on auth.users for each row execute function kampuscape_private.enforce_uic_email();

-- Friendly rejection before creating the Auth user, for email and OAuth alike.
create or replace function public.kampuscape_before_user_created(event jsonb)
returns jsonb language plpgsql set search_path = '' as $$
begin
  if not public.kampuscape_is_uic_email(event->'user'->>'email')
     or coalesce((event->'user'->>'is_anonymous')::boolean, false) then
    return jsonb_build_object('error', jsonb_build_object('http_code',403,'message','Only @uic.edu accounts can join Kampuscape.'));
  end if;
  return '{}'::jsonb;
end;
$$;
revoke all on function public.kampuscape_before_user_created(jsonb) from public, anon, authenticated;
grant execute on function public.kampuscape_before_user_created(jsonb) to supabase_auth_admin;

-- Runs on every new access token, including OAuth, OTP and refresh. The canonical
-- Auth record is authoritative; user_metadata/email_verified can be user-edited.
create or replace function public.kampuscape_access_token_hook(event jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from auth.users u
    where u.id = (event->>'user_id')::uuid
      and public.kampuscape_is_uic_email(u.email)
      and u.email_confirmed_at is not null
      and not coalesce(u.is_anonymous,false)
      and (u.banned_until is null or u.banned_until < now())
  ) or not public.kampuscape_is_uic_email(event->'claims'->>'email') then
    return jsonb_build_object('error', jsonb_build_object('http_code',403,'message','Sign in with a verified @uic.edu account.'));
  end if;
  return jsonb_build_object('claims',event->'claims');
end;
$$;
revoke all on function public.kampuscape_access_token_hook(jsonb) from public, anon, authenticated;
grant execute on function public.kampuscape_access_token_hook(jsonb) to supabase_auth_admin;
grant usage on schema public to supabase_auth_admin;

-- Recheck the current Auth record in RLS, so an older JWT cannot retain access
-- after an email/verification/ban change. The caller cannot supply another ID.
create or replace function public.kampuscape_is_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.users u where u.id = (select auth.uid())
      and public.kampuscape_is_uic_email(u.email)
      and u.email_confirmed_at is not null
      and not coalesce(u.is_anonymous,false)
      and (u.banned_until is null or u.banned_until < now())
  );
$$;
revoke all on function public.kampuscape_is_member() from public, anon;
grant execute on function public.kampuscape_is_member() to authenticated;

create table public.kampuscape_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 60),
  pronouns text not null default '' check (char_length(pronouns) <= 40),
  avatar_id text not null check (avatar_id in ('orbit','sprout','sun','cat','fox','wave','berry','ghost')),
  interests text[] not null check (
    cardinality(interests) between 1 and 8 and array_position(interests, null) is null
    and interests <@ array['music','arts','food','outdoors','sports','gaming','tech','career','volunteering','film','dance','social']::text[]
  ),
  onboarding_completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.kampuscape_profiles enable row level security;
revoke all on public.kampuscape_profiles from anon, authenticated;
grant select, insert, update on public.kampuscape_profiles to authenticated;
create policy profiles_read_own on public.kampuscape_profiles for select to authenticated
  using (id = (select auth.uid()) and (select public.kampuscape_is_member()));
create policy profiles_insert_own on public.kampuscape_profiles for insert to authenticated
  with check (id = (select auth.uid()) and (select public.kampuscape_is_member()));
create policy profiles_update_own on public.kampuscape_profiles for update to authenticated
  using (id = (select auth.uid()) and (select public.kampuscape_is_member()))
  with check (id = (select auth.uid()) and (select public.kampuscape_is_member()));

create or replace function kampuscape_private.prepare_profile()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.display_name := btrim(new.display_name);
  new.pronouns := btrim(new.pronouns);
  if cardinality(new.interests) <> (select count(distinct i) from unnest(new.interests) i) then
    raise exception 'Choose each interest only once.' using errcode = '23514';
  end if;
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.created_at := now(); new.onboarding_completed_at := now();
  else
    new.id := old.id; new.created_at := old.created_at; new.onboarding_completed_at := old.onboarding_completed_at;
  end if;
  return new;
end;
$$;
revoke all on function kampuscape_private.prepare_profile() from public, anon, authenticated;
create trigger kampuscape_prepare_profile before insert or update on public.kampuscape_profiles
for each row execute function kampuscape_private.prepare_profile();
