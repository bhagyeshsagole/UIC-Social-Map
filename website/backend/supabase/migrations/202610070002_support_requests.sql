-- kampuscape.com/support: help, reach-outs, bug reports and content/safety reports.
-- Anyone may submit; nobody can read rows through the API (review them in the
-- Supabase dashboard). Server-side limits keep the open form from being flooded.
create table public.kampuscape_support_requests (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('help','reach_out','bug','report')),
  name text not null default '' check (char_length(name) <= 80),
  email text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  message text not null check (char_length(btrim(message)) between 10 and 4000),
  related_url text not null default '' check (char_length(related_url) <= 500),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'new' check (status in ('new','in_progress','closed')),
  created_at timestamptz not null default now()
);
create index kampuscape_support_requests_recent on public.kampuscape_support_requests (created_at desc);
create index kampuscape_support_requests_email on public.kampuscape_support_requests (lower(email), created_at desc);

alter table public.kampuscape_support_requests enable row level security;
revoke all on public.kampuscape_support_requests from anon, authenticated;
-- Column grants: clients cannot set status, timestamps or someone else's user ID.
grant insert (kind, name, email, message, related_url) on public.kampuscape_support_requests to anon, authenticated;
create policy support_submit on public.kampuscape_support_requests for insert to anon, authenticated with check (true);

-- Normalizes input, links signed-in members, and rate-limits per address and overall.
-- Security definer so the limit can count rows the submitter cannot read.
create or replace function kampuscape_private.prepare_support_request()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.name := btrim(new.name);
  new.email := lower(btrim(new.email));
  new.message := btrim(new.message);
  new.related_url := btrim(new.related_url);
  new.user_id := auth.uid();
  new.status := 'new';
  new.created_at := now();
  if (select count(*) from public.kampuscape_support_requests r
      where lower(r.email) = new.email and r.created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many messages from this address. Please try again in an hour.' using errcode = '54000';
  end if;
  if (select count(*) from public.kampuscape_support_requests r where r.created_at > now() - interval '1 hour') >= 300 then
    raise exception 'Support is receiving a lot of messages. Please try again shortly.' using errcode = '54000';
  end if;
  return new;
end;
$$;
revoke all on function kampuscape_private.prepare_support_request() from public, anon, authenticated;
create trigger kampuscape_prepare_support_request before insert on public.kampuscape_support_requests
for each row execute function kampuscape_private.prepare_support_request();
