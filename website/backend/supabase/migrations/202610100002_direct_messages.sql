-- Event-scoped contact handles do not reveal account IDs or link aliases across events.
alter table public.kampuscape_attendance add column contact_id uuid not null default gen_random_uuid() unique;
create table public.kampuscape_message_threads (
 id uuid primary key default gen_random_uuid(), event_key text not null, event_title text not null,
 requester_id uuid not null references auth.users(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 requester_name text not null, requester_avatar text not null,
 recipient_name text not null, recipient_avatar text not null,
 status text not null default 'pending' check(status in ('pending','accepted','declined')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 requester_read_at timestamptz not null default now(), recipient_read_at timestamptz not null default now(),
 check(requester_id<>recipient_id)
);
create unique index kampuscape_thread_pair on public.kampuscape_message_threads(event_key,least(requester_id,recipient_id),greatest(requester_id,recipient_id));
create index kampuscape_threads_inbox on public.kampuscape_message_threads(recipient_id,updated_at desc);
create index kampuscape_threads_outbox on public.kampuscape_message_threads(requester_id,updated_at desc);
create table public.kampuscape_messages (
 id bigint generated always as identity primary key,
 thread_id uuid not null references public.kampuscape_message_threads(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 body text not null check(char_length(btrim(body)) between 1 and 2000),
 client_id uuid not null,
 created_at timestamptz not null default now(), unique(sender_id,client_id)
);
create index kampuscape_messages_thread on public.kampuscape_messages(thread_id,id desc);
create index kampuscape_messages_sender on public.kampuscape_messages(sender_id,created_at desc);
create table public.kampuscape_message_blocks (
 blocker_id uuid not null references auth.users(id) on delete cascade,
 blocked_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(blocker_id,blocked_id),check(blocker_id<>blocked_id)
);
create index kampuscape_blocks_recipient on public.kampuscape_message_blocks(blocked_id);
alter table public.kampuscape_message_threads enable row level security;
alter table public.kampuscape_messages enable row level security;
alter table public.kampuscape_message_blocks enable row level security;
revoke all on public.kampuscape_message_threads,public.kampuscape_messages,public.kampuscape_message_blocks from public,anon,authenticated;

create function kampuscape_private.can_message(a uuid,b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select not exists(select 1 from public.kampuscape_message_blocks where (blocker_id=a and blocked_id=b) or (blocker_id=b and blocked_id=a))
 and (select count(*) from auth.users where id in(a,b) and (banned_until is null or banned_until<now()))=2;
$$;
revoke all on function kampuscape_private.can_message(uuid,uuid) from public,anon,authenticated;

create function public.kampuscape_request_message(p_contact_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid:=auth.uid(); target public.kampuscape_attendance; own public.kampuscape_attendance; profile public.kampuscape_profiles; tid uuid; other_name text; other_avatar text;
begin
 if not public.kampuscape_is_member() then raise exception 'Sign in first.' using errcode='42501'; end if;
 select * into profile from public.kampuscape_profiles where id=uid and onboarding_completed_at is not null;
 select * into target from public.kampuscape_attendance where contact_id=p_contact_id;
 if profile.id is null or target.user_id is null or target.user_id=uid then raise exception 'This attendee is unavailable.' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(least(uid,target.user_id)::text||greatest(uid,target.user_id)::text,42));
 if not kampuscape_private.can_message(uid,target.user_id) then raise exception 'This conversation is unavailable.' using errcode='42501'; end if;
 select id into tid from public.kampuscape_message_threads where event_key=target.event_key
   and least(requester_id,recipient_id)=least(uid,target.user_id) and greatest(requester_id,recipient_id)=greatest(uid,target.user_id);
 if tid is not null then return tid; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,43));
 if (select count(*) from public.kampuscape_message_threads where requester_id=uid and created_at>now()-interval '1 day')>=15 then
  raise exception 'You can send up to 15 new message requests a day.' using errcode='54000'; end if;
 select * into own from public.kampuscape_attendance where user_id=uid and event_key=target.event_key;
 select case when target.mode='anonymous' then target.alias_name else p.display_name end,
        case when target.mode='anonymous' then target.alias_avatar else p.avatar_id end
 into other_name,other_avatar from public.kampuscape_profiles p where p.id=target.user_id;
 if other_name is null then raise exception 'This attendee is unavailable.' using errcode='42501'; end if;
 insert into public.kampuscape_message_threads(event_key,event_title,requester_id,recipient_id,requester_name,requester_avatar,recipient_name,recipient_avatar)
 values(target.event_key,target.event_title,uid,target.user_id,
 case when own.mode='anonymous' then own.alias_name else profile.display_name end,
 case when own.mode='anonymous' then own.alias_avatar else profile.avatar_id end,other_name,other_avatar) returning id into tid;
 return tid;
end; $$;

create function public.kampuscape_message_action(p_thread_id uuid,p_action text) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid:=auth.uid(); t public.kampuscape_message_threads; other_id uuid;
begin
 if not public.kampuscape_is_member() then raise exception 'Sign in first.' using errcode='42501'; end if;
 select * into t from public.kampuscape_message_threads where id=p_thread_id and uid in(requester_id,recipient_id);
 if t.id is null then raise exception 'Conversation unavailable.' using errcode='42501'; end if;
 other_id:=case when uid=t.requester_id then t.recipient_id else t.requester_id end;
 perform pg_advisory_xact_lock(hashtextextended(least(uid,other_id)::text||greatest(uid,other_id)::text,42));
 select * into t from public.kampuscape_message_threads where id=p_thread_id for update;
 if p_action='block' then
  insert into public.kampuscape_message_blocks(blocker_id,blocked_id) values(uid,other_id) on conflict do nothing;
 elsif p_action='unblock' then
  delete from public.kampuscape_message_blocks where blocker_id=uid and blocked_id=other_id;
 elsif p_action in('accept','decline') and uid=t.recipient_id and t.status='pending' and kampuscape_private.can_message(uid,other_id) then
  update public.kampuscape_message_threads set status=case when p_action='accept' then 'accepted' else 'declined' end,updated_at=now() where id=t.id;
 elsif p_action='read' then
  update public.kampuscape_message_threads set requester_read_at=case when uid=requester_id then now() else requester_read_at end,
   recipient_read_at=case when uid=recipient_id then now() else recipient_read_at end where id=t.id;
 else raise exception 'This action is unavailable.' using errcode='42501'; end if;
end; $$;

create function public.kampuscape_message_inbox() returns table(
 id uuid,event_title text,display_name text,avatar_id text,your_name text,status text,incoming boolean,blocked boolean,blocked_by_you boolean,unread bigint,updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
 select t.id,t.event_title,case when auth.uid()=t.requester_id then t.recipient_name else t.requester_name end,
 case when auth.uid()=t.requester_id then t.recipient_avatar else t.requester_avatar end,
 case when auth.uid()=t.requester_id then t.requester_name else t.recipient_name end,t.status,auth.uid()=t.recipient_id,
 not kampuscape_private.can_message(t.requester_id,t.recipient_id),
 exists(select 1 from public.kampuscape_message_blocks b where b.blocker_id=auth.uid() and b.blocked_id=case when auth.uid()=t.requester_id then t.recipient_id else t.requester_id end),
 (select count(*) from public.kampuscape_messages m where m.thread_id=t.id and m.sender_id<>auth.uid() and m.created_at>case when auth.uid()=t.requester_id then t.requester_read_at else t.recipient_read_at end),t.updated_at
 from public.kampuscape_message_threads t where auth.uid() in(t.requester_id,t.recipient_id) and public.kampuscape_is_member()
 order by t.updated_at desc limit 200;
$$;
create function public.kampuscape_message_history(p_thread_id uuid,p_before bigint default null) returns table(id bigint,body text,is_you boolean,created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
 if not public.kampuscape_is_member() or not exists(select 1 from public.kampuscape_message_threads t where t.id=p_thread_id and auth.uid() in(t.requester_id,t.recipient_id) and t.status='accepted') then
  raise exception 'Accept the message request first.' using errcode='42501'; end if;
 return query select m.id,m.body,m.sender_id=auth.uid(),m.created_at from public.kampuscape_messages m
 where m.thread_id=p_thread_id and (p_before is null or m.id<p_before) order by m.id desc limit 50;
end; $$;
create function public.kampuscape_send_message(p_thread_id uuid,p_body text,p_client_id uuid) returns bigint
language plpgsql security definer set search_path = '' as $$
declare uid uuid:=auth.uid(); t public.kampuscape_message_threads; other_id uuid; mid bigint;
begin
 if not public.kampuscape_is_member() then raise exception 'Sign in first.' using errcode='42501'; end if;
 if p_client_id is null or char_length(btrim(coalesce(p_body,''))) not between 1 and 2000 then raise exception 'Write 1–2000 characters.' using errcode='22023'; end if;
 select * into t from public.kampuscape_message_threads where id=p_thread_id and uid in(requester_id,recipient_id);
 if t.id is null then raise exception 'Conversation unavailable.' using errcode='42501'; end if;
 other_id:=case when uid=t.requester_id then t.recipient_id else t.requester_id end;
 perform pg_advisory_xact_lock(hashtextextended(least(uid,other_id)::text||greatest(uid,other_id)::text,42));
 select * into t from public.kampuscape_message_threads where id=p_thread_id for update;
 if t.status<>'accepted' or not kampuscape_private.can_message(uid,other_id) then raise exception 'The recipient must accept before you can chat, and neither person can be blocked.' using errcode='42501'; end if;
 select id into mid from public.kampuscape_messages where sender_id=uid and client_id=p_client_id and thread_id=p_thread_id;
 if mid is not null then return mid; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,44));
 if (select count(*) from public.kampuscape_messages where sender_id=uid and created_at>now()-interval '1 minute')>=30 then
  raise exception 'Please wait a minute before sending more messages.' using errcode='54000'; end if;
 insert into public.kampuscape_messages(thread_id,sender_id,body,client_id) values(t.id,uid,btrim(p_body),p_client_id) returning id into mid;
 update public.kampuscape_message_threads set updated_at=now() where id=t.id;
 return mid;
end; $$;

-- A separate RPC preserves the existing attendee-list contract for old clients.
create or replace function public.kampuscape_event_contacts(p_event_key text)
returns table(display_name text,avatar_id text,anonymous boolean,is_you boolean,total bigint,contact_id uuid)
language plpgsql stable security definer set search_path = '' as $$
declare member boolean:=public.kampuscape_is_member();
begin
 return query select
 case when not member then null when a.mode='profile' then p.display_name else a.alias_name end,
 case when not member then null when a.mode='profile' then p.avatar_id else a.alias_avatar end,
 case when member then a.mode='anonymous' end,coalesce(a.user_id=auth.uid(),false),count(*) over(),
 case when member and a.user_id<>auth.uid() and kampuscape_private.can_message(auth.uid(),a.user_id) then a.contact_id end
 from public.kampuscape_attendance a join auth.users u on u.id=a.user_id and (u.banned_until is null or u.banned_until<now())
 left join public.kampuscape_profiles p on p.id=a.user_id
 where a.event_key=p_event_key and (a.mode='anonymous' or p.id is not null) order by a.created_at limit 200;
end; $$;
revoke all on function public.kampuscape_request_message(uuid),public.kampuscape_message_action(uuid,text),public.kampuscape_message_inbox(),public.kampuscape_message_history(uuid,bigint),public.kampuscape_send_message(uuid,text,uuid),public.kampuscape_event_contacts(text) from public,anon,authenticated;
grant execute on function public.kampuscape_request_message(uuid),public.kampuscape_message_action(uuid,text),public.kampuscape_message_inbox(),public.kampuscape_message_history(uuid,bigint),public.kampuscape_send_message(uuid,text,uuid) to authenticated;
grant execute on function public.kampuscape_event_contacts(text) to anon,authenticated;
