-- Public events show who is hosting (user decision 2026-10-08): the host's
-- current profile name and avatar, never their account ID or email. Readable by
-- everyone, like the events themselves. Renames and account deletion apply
-- immediately because nothing is copied.
create or replace function public.kampuscape_public_events()
returns table (id text, title text, description text, date date, "time" text, venue jsonb, host_name text, host_avatar text)
language sql stable security definer set search_path = '' as $$
  select e.id, e.title, e.description, e.date, e."time", e.venue, p.display_name, p.avatar_id
    from public.kampuscape_community_events e
    join auth.users u on u.id = e.creator_id and (u.banned_until is null or u.banned_until < now())
    left join public.kampuscape_profiles p on p.id = e.creator_id
   where e.date >= (now() at time zone 'America/Chicago')::date - 1
   order by e.date, e."time"
   limit 300;
$$;
revoke all on function public.kampuscape_public_events() from public;
grant execute on function public.kampuscape_public_events() to anon, authenticated;
