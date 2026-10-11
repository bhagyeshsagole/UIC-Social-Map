-- Email a member through Resend when they get a message request or a new message.
-- Postgres sends the email itself (pg_net), so the browser never sees the recipient's
-- address or the Resend key and cannot trigger or forge a notification.
-- Setup (once, in the SQL editor):
--   select vault.create_secret('re_...', 'kampuscape_resend_api_key');
--   select vault.create_secret('accounts@kampuscape.com', 'kampuscape_resend_from');
-- Without both secrets, or without pg_net, messaging works and no email is sent.
do $$ begin
 if exists(select 1 from pg_available_extensions where name='pg_net') then create extension if not exists pg_net; end if;
end $$;

-- One email per unread streak: a member is emailed again only after they open the conversation.
alter table public.kampuscape_message_threads add column requester_emailed_at timestamptz, add column recipient_emailed_at timestamptz;

create function kampuscape_private.html_escape(value text) returns text
language sql immutable set search_path = '' as $$
 select replace(replace(replace(replace(replace(coalesce(value,''),'&','&amp;'),'<','&lt;'),'>','&gt;'),'"','&quot;'),'''','&#39;');
$$;

create function kampuscape_private.send_message_email(p_to uuid,p_subject text,p_intro text,p_idempotency text) returns void
language plpgsql security definer set search_path = '' as $$
declare api_key text; sender text; address text;
begin
 select email into address from auth.users where id=p_to and email ~* '^[^@\s]+@uic\.edu$' and (banned_until is null or banned_until<now());
 if address is null then return; end if;
 execute 'select max(decrypted_secret) filter (where name=''kampuscape_resend_api_key''),max(decrypted_secret) filter (where name=''kampuscape_resend_from'') from vault.decrypted_secrets'
  into api_key,sender;
 if api_key is null or sender is null then return; end if;
 execute 'select net.http_post(url:=$1,body:=$2,headers:=$3)' using 'https://api.resend.com/emails',
  jsonb_build_object('from','Kampuscape <'||sender||'>','to',jsonb_build_array(address),'subject',p_subject,
   'text',p_intro||E'\n\nOpen your messages: https://kampuscape.com/uic#messages\n\nYou got this email because you have a Kampuscape account. To stop messages from someone, block them in Messages.',
   'html','<!doctype html><html lang="en"><body style="margin:0;padding:32px 16px;background:#f3f3ee;font-family:Arial,sans-serif;color:#28352f"><div style="max-width:480px;margin:auto;padding:32px;background:#fff;border-radius:20px"><p style="font-size:19px;font-weight:700">Kampuscape</p><p style="font-size:17px;line-height:1.6">'||kampuscape_private.html_escape(p_intro)||'</p><p><a href="https://kampuscape.com/uic#messages" style="display:inline-block;padding:14px 24px;background:#405f39;color:#fff;text-decoration:none;border-radius:12px">Open messages</a></p><p style="font-size:13px;line-height:1.6;color:#606d5e">You got this email because you have a Kampuscape account. To stop messages from someone, block them in Messages.</p></div></body></html>'),
  jsonb_build_object('Authorization','Bearer '||api_key,'Content-Type','application/json','Idempotency-Key',p_idempotency);
exception when others then
 -- Email is best effort. A missing extension, vault or provider must never block messaging.
 return;
end; $$;
revoke all on function kampuscape_private.html_escape(text),kampuscape_private.send_message_email(uuid,text,text,text) from public,anon,authenticated;

-- Message bodies stay out of email; the email names the sender and the event only.
create function kampuscape_private.notify_message_request() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 perform kampuscape_private.send_message_email(new.recipient_id,new.requester_name||' wants to message you on Kampuscape',
  new.requester_name||' sent you a message request about '||new.event_title||'. Open Kampuscape to accept or decline it.','message-request/'||new.id);
 update public.kampuscape_message_threads set recipient_emailed_at=now() where id=new.id;
 return null;
end; $$;

create function kampuscape_private.notify_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare t public.kampuscape_message_threads; to_requester boolean; emailed timestamptz; seen timestamptz;
begin
 select * into t from public.kampuscape_message_threads where id=new.thread_id;
 to_requester:=new.sender_id=t.recipient_id;
 emailed:=case when to_requester then t.requester_emailed_at else t.recipient_emailed_at end;
 seen:=case when to_requester then t.requester_read_at else t.recipient_read_at end;
 -- Skip members who already have an unread email, and members reading right now.
 if (emailed is not null and emailed>=seen) or seen>now()-interval '2 minutes' then return null; end if;
 perform kampuscape_private.send_message_email(case when to_requester then t.requester_id else t.recipient_id end,
  'New message from '||case when to_requester then t.recipient_name else t.requester_name end,
  case when to_requester then t.recipient_name else t.requester_name end||' sent you a message about '||t.event_title||'.','message/'||new.id);
 update public.kampuscape_message_threads set requester_emailed_at=case when to_requester then now() else requester_emailed_at end,
  recipient_emailed_at=case when to_requester then recipient_emailed_at else now() end where id=t.id;
 return null;
end; $$;
revoke all on function kampuscape_private.notify_message_request(),kampuscape_private.notify_message() from public,anon,authenticated;

-- Accepting a request counts as reading it, so the first chat message can be emailed.
create function kampuscape_private.read_on_accept() returns trigger
language plpgsql set search_path = '' as $$
begin
 if old.status='pending' and new.status='accepted' then new.recipient_read_at:=now(); end if;
 return new;
end; $$;
revoke all on function kampuscape_private.read_on_accept() from public,anon,authenticated;

create trigger kampuscape_message_read_on_accept before update of status on public.kampuscape_message_threads
 for each row execute function kampuscape_private.read_on_accept();
create trigger kampuscape_message_request_email after insert on public.kampuscape_message_threads
 for each row execute function kampuscape_private.notify_message_request();
create trigger kampuscape_message_email after insert on public.kampuscape_messages
 for each row execute function kampuscape_private.notify_message();
