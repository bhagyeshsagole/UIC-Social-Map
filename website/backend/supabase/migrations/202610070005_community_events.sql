-- Member-created events the creator marks Public: visible on every signed-in
-- UIC member's map and in Community. Private events stay device + share-link
-- only and never reach this table. Creator identity is never readable by others.
create table public.kampuscape_community_events (
  id text primary key check (id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  creator_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  description text not null default '' check (char_length(description) <= 500),
  date date not null,
  time text not null check (time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  venue jsonb not null check (jsonb_typeof(venue) = 'object' and jsonb_typeof(venue->'coords') = 'array' and octet_length(venue::text) <= 60000),
  created_at timestamptz not null default now()
);
create index kampuscape_community_events_date on public.kampuscape_community_events (date);

alter table public.kampuscape_community_events enable row level security;
revoke all on public.kampuscape_community_events from anon, authenticated;
-- Column grants: everything except creator_id is readable; clients cannot set it.
grant select (id, title, description, date, time, venue, created_at) on public.kampuscape_community_events to authenticated;
grant insert (id, title, description, date, time, venue) on public.kampuscape_community_events to authenticated;
grant delete on public.kampuscape_community_events to authenticated;

create policy community_events_read on public.kampuscape_community_events for select to authenticated
  using ((select public.kampuscape_is_member()) and date >= (now() at time zone 'America/Chicago')::date - 1);
create policy community_events_create on public.kampuscape_community_events for insert to authenticated
  with check (creator_id = (select auth.uid()) and (select public.kampuscape_is_member()));
create policy community_events_delete_own on public.kampuscape_community_events for delete to authenticated
  using (creator_id = (select auth.uid()));

-- Normalize text, forbid past dates, and limit each member to 10 public events a day.
create or replace function kampuscape_private.prepare_community_event()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.creator_id := auth.uid();
  new.title := btrim(new.title);
  new.description := btrim(new.description);
  new.created_at := now();
  if new.date < (now() at time zone 'America/Chicago')::date then
    raise exception 'Choose a future date.' using errcode = '22023';
  end if;
  if (select count(*) from public.kampuscape_community_events e
      where e.creator_id = new.creator_id and e.created_at > now() - interval '1 day') >= 10 then
    raise exception 'You can publish up to 10 public events a day.' using errcode = '54000';
  end if;
  return new;
end;
$$;
revoke all on function kampuscape_private.prepare_community_event() from public, anon, authenticated;
create trigger kampuscape_prepare_community_event before insert on public.kampuscape_community_events
for each row execute function kampuscape_private.prepare_community_event();
