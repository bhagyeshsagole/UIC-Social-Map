-- Link-only event snapshots. No table grants or enumeration; a random token is
-- the capability to view a shared event. Host identity always comes from Auth.
create table public.kampuscape_event_shares (
  event_id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  share_token uuid not null unique default gen_random_uuid(),
  snapshot jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index kampuscape_event_shares_owner on public.kampuscape_event_shares(owner_id);
alter table public.kampuscape_event_shares enable row level security;
revoke all on public.kampuscape_event_shares from public, anon, authenticated;

create function public.kampuscape_share_event(p_event jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); eid uuid; token uuid; event_date date; clean jsonb;
begin
  if not public.kampuscape_is_member() or not exists(select 1 from public.kampuscape_profiles where id=uid and onboarding_completed_at is not null) then
    raise exception 'Complete your profile before sharing.' using errcode='42501';
  end if;
  eid := (p_event->>'id')::uuid;
  event_date := (p_event->>'date')::date;
  if eid is null or event_date is null or event_date < (now() at time zone 'America/Chicago')::date - 1
    or char_length(btrim(coalesce(p_event->>'title',''))) not between 1 and 100
    or coalesce(p_event->>'time','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    or jsonb_typeof(p_event->'venue') is distinct from 'object'
    or jsonb_typeof(p_event->'venue'->'coords') is distinct from 'array'
    or jsonb_array_length(p_event->'venue'->'coords') <> 2
    or char_length(coalesce(p_event->'venue'->>'name','')) not between 1 and 120
    or octet_length(p_event::text) > 60000 then
    raise exception 'Check the event details before sharing.' using errcode='22023';
  end if;
  if exists(select 1 from public.kampuscape_community_events where id=eid::text and creator_id<>uid) then
    raise exception 'Only the host can create this share link.' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 41));
  if not exists(select 1 from public.kampuscape_event_shares where event_id=eid) and
     (select count(*) from public.kampuscape_event_shares where owner_id=uid and created_at>now()-interval '1 day') >= 30 then
    raise exception 'You can create up to 30 share links per day.' using errcode='54000';
  end if;
  clean := jsonb_build_object('id',eid,'source','Private event','title',btrim(p_event->>'title'),
    'date',event_date,'time',p_event->>'time','description',left(coalesce(p_event->>'description',''),500),
    'venue',p_event->'venue','visibility',case when exists(select 1 from public.kampuscape_community_events where id=eid::text and creator_id=uid) then 'public' else 'private' end);
  insert into public.kampuscape_event_shares as s(event_id,owner_id,snapshot,expires_at)
    values(eid,uid,clean,(event_date+31)::timestamp at time zone 'America/Chicago')
    on conflict(event_id) do update set snapshot=excluded.snapshot, expires_at=excluded.expires_at
      where s.owner_id=uid
    returning share_token into token;
  if token is null then raise exception 'Only the host can update this share link.' using errcode='42501'; end if;
  return token;
end; $$;

create function public.kampuscape_shared_event(p_token uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select s.snapshot || jsonb_build_object('shareToken',s.share_token,'host',jsonb_build_object('name',p.display_name,'avatar',p.avatar_id))
  from public.kampuscape_event_shares s
  join auth.users u on u.id=s.owner_id and (u.banned_until is null or u.banned_until<now())
  join public.kampuscape_profiles p on p.id=s.owner_id
  where s.share_token=p_token and s.expires_at>now();
$$;
create function public.kampuscape_revoke_share(p_event_id uuid) returns void
language sql security definer set search_path = '' as $$
  delete from public.kampuscape_event_shares where event_id=p_event_id and owner_id=auth.uid();
$$;
revoke all on function public.kampuscape_share_event(jsonb),public.kampuscape_revoke_share(uuid),public.kampuscape_shared_event(uuid) from public,anon,authenticated;
grant execute on function public.kampuscape_share_event(jsonb),public.kampuscape_revoke_share(uuid) to authenticated;
grant execute on function public.kampuscape_shared_event(uuid) to anon,authenticated;
