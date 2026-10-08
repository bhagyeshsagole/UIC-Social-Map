-- Public member events are visible to everyone, signed in or not (user decision
-- 2026-10-07). Creating and deleting still require a verified UIC member; the
-- creator's identity is never readable.
grant usage on schema public to anon;
grant select (id, title, description, date, time, venue, created_at) on public.kampuscape_community_events to anon;
drop policy community_events_read on public.kampuscape_community_events;
create policy community_events_read on public.kampuscape_community_events for select to anon, authenticated
  using (date >= (now() at time zone 'America/Chicago')::date - 1);

-- Attendee count is public (user decision 2026-10-07); names and avatars only for
-- verified members. Never account IDs or emails; anonymous attendees stay
-- anonymous. Joining still requires a verified member (kampuscape_attend unchanged).
create or replace function public.kampuscape_event_attendees(p_event_key text)
returns table (display_name text, avatar_id text, anonymous boolean, is_you boolean, total bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  member boolean := public.kampuscape_is_member();
begin
  return query
    select case when not member then null when a.mode = 'profile' then p.display_name else a.alias_name end,
           case when not member then null when a.mode = 'profile' then p.avatar_id else a.alias_avatar end,
           case when member then a.mode = 'anonymous' end, coalesce(a.user_id = auth.uid(), false), count(*) over ()
      from public.kampuscape_attendance a
      join auth.users u on u.id = a.user_id and (u.banned_until is null or u.banned_until < now())
      left join public.kampuscape_profiles p on p.id = a.user_id
     where a.event_key = p_event_key and (a.mode = 'anonymous' or p.id is not null)
     order by a.created_at
     limit 200;
end;
$$;
-- kampuscape_is_member() returns false for guests; anon needs execute on it to call this.
grant execute on function public.kampuscape_is_member() to anon;
grant execute on function public.kampuscape_event_attendees(text) to anon, authenticated;
