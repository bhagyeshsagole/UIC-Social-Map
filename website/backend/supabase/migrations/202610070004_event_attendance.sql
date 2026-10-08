-- Event attendance with an optional per-event anonymous identity.
-- Members attend as their profile or anonymously. Anonymous attendees get a new
-- random name and avatar for each event; the account behind an alias never
-- leaves the database (no user IDs or emails in any response). Only verified
-- UIC members can read attendee lists. Rows cascade away with the account.
create table public.kampuscape_attendance (
  user_id uuid not null references auth.users(id) on delete cascade,
  -- SHA-256 of the client's stable event identity; never personal data.
  event_key text not null check (event_key ~ '^[0-9a-f]{64}$'),
  event_title text not null default '' check (char_length(event_title) <= 200),
  mode text not null check (mode in ('profile','anonymous')),
  alias_name text check (alias_name is null or char_length(alias_name) <= 60),
  alias_avatar text check (alias_avatar is null or alias_avatar in ('orbit','sprout','sun','cat','fox','wave','berry','ghost')),
  created_at timestamptz not null default now(),
  primary key (user_id, event_key),
  check ((mode = 'anonymous') = (alias_name is not null and alias_avatar is not null))
);
create index kampuscape_attendance_event on public.kampuscape_attendance (event_key, created_at);
alter table public.kampuscape_attendance enable row level security;
-- No direct table access at all: every read and write goes through the functions below.
revoke all on public.kampuscape_attendance from anon, authenticated;

create or replace function public.kampuscape_attend(p_event_key text, p_event_title text, p_mode text)
returns table (display_name text, avatar_id text, anonymous boolean)
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  adjectives text[] := array['Quiet','Sunny','Curious','Brave','Gentle','Swift','Clever','Calm','Bright','Lucky','Cosmic','Breezy','Cozy','Daring','Merry','Nimble','Witty','Mellow','Plucky','Jolly','Snappy','Lively','Dreamy','Zesty','Humble','Peppy','Sly','Bold','Chill','Spry'];
  animals text[] := array['Otter','Fox','Owl','Panda','Koala','Heron','Lynx','Robin','Badger','Falcon','Seal','Gecko','Bison','Raven','Hare','Moose','Finch','Lemur','Puffin','Marten','Ibex','Wren','Tapir','Crane','Quokka','Beaver','Sparrow','Dolphin','Hedgehog','Squirrel'];
  avatars text[] := array['orbit','sprout','sun','cat','fox','wave','berry','ghost'];
  alias text; pic text; tries int := 0;
begin
  if uid is null or not public.kampuscape_is_member() then
    raise exception 'Sign in with a verified UIC account to attend.' using errcode = '42501';
  end if;
  if p_event_key is null or p_event_key !~ '^[0-9a-f]{64}$' then
    raise exception 'Unknown event.' using errcode = '22023';
  end if;
  if p_mode not in ('profile','anonymous') then
    raise exception 'Choose how to attend.' using errcode = '22023';
  end if;
  if p_mode = 'profile' and not exists (select 1 from public.kampuscape_profiles p where p.id = uid) then
    raise exception 'Finish your profile first.' using errcode = '42501';
  end if;
  if p_mode = 'anonymous' then
    -- Re-confirming an event keeps its alias; a new event always gets a new one.
    select a.alias_name, a.alias_avatar into alias, pic from public.kampuscape_attendance a
     where a.user_id = uid and a.event_key = p_event_key and a.mode = 'anonymous';
    while alias is null loop
      tries := tries + 1;
      alias := adjectives[1 + floor(random() * array_length(adjectives, 1))::int] || ' ' || animals[1 + floor(random() * array_length(animals, 1))::int];
      if tries > 25 then alias := alias || ' ' || (10 + floor(random() * 90))::int; end if;
      -- Unique at this event, and never one this person already uses elsewhere.
      if exists (select 1 from public.kampuscape_attendance a where a.alias_name = alias and (a.event_key = p_event_key or a.user_id = uid)) then
        alias := null;
      end if;
    end loop;
    pic := coalesce(pic, avatars[1 + floor(random() * array_length(avatars, 1))::int]);
  end if;
  insert into public.kampuscape_attendance as a (user_id, event_key, event_title, mode, alias_name, alias_avatar)
  values (uid, p_event_key, left(btrim(coalesce(p_event_title, '')), 200), p_mode, alias, pic)
  on conflict (user_id, event_key) do update
    set mode = excluded.mode, alias_name = excluded.alias_name, alias_avatar = excluded.alias_avatar, event_title = excluded.event_title;
  return query
    select case when p_mode = 'profile' then p.display_name else alias end,
           case when p_mode = 'profile' then p.avatar_id else pic end,
           p_mode = 'anonymous'
      from (select 1) one left join public.kampuscape_profiles p on p.id = uid;
end;
$$;

create or replace function public.kampuscape_leave_event(p_event_key text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  delete from public.kampuscape_attendance a where a.user_id = auth.uid() and a.event_key = p_event_key;
end;
$$;

-- Public-facing attendee list: names and avatars only, for verified members.
create or replace function public.kampuscape_event_attendees(p_event_key text)
returns table (display_name text, avatar_id text, anonymous boolean, is_you boolean, total bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.kampuscape_is_member() then
    raise exception 'Sign in with a verified UIC account to see who is going.' using errcode = '42501';
  end if;
  return query
    select case when a.mode = 'profile' then p.display_name else a.alias_name end,
           case when a.mode = 'profile' then p.avatar_id else a.alias_avatar end,
           a.mode = 'anonymous', a.user_id = auth.uid(), count(*) over ()
      from public.kampuscape_attendance a
      join auth.users u on u.id = a.user_id and (u.banned_until is null or u.banned_until < now())
      left join public.kampuscape_profiles p on p.id = a.user_id
     where a.event_key = p_event_key and (a.mode = 'anonymous' or p.id is not null)
     order by a.created_at
     limit 200;
end;
$$;

-- The caller's own attendance, so My Events can show "going as …".
create or replace function public.kampuscape_my_attendance()
returns table (event_key text, display_name text, avatar_id text, anonymous boolean)
language sql stable security definer set search_path = '' as $$
  select a.event_key,
         case when a.mode = 'profile' then p.display_name else a.alias_name end,
         case when a.mode = 'profile' then p.avatar_id else a.alias_avatar end,
         a.mode = 'anonymous'
    from public.kampuscape_attendance a left join public.kampuscape_profiles p on p.id = a.user_id
   where a.user_id = (select auth.uid());
$$;

revoke all on function public.kampuscape_attend(text, text, text) from public, anon;
revoke all on function public.kampuscape_leave_event(text) from public, anon;
revoke all on function public.kampuscape_event_attendees(text) from public, anon;
revoke all on function public.kampuscape_my_attendance() from public, anon;
grant execute on function public.kampuscape_attend(text, text, text) to authenticated;
grant execute on function public.kampuscape_leave_event(text) to authenticated;
grant execute on function public.kampuscape_event_attendees(text) to authenticated;
grant execute on function public.kampuscape_my_attendance() to authenticated;
