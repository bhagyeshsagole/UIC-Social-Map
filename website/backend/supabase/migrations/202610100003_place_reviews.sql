-- Public review content, private account linkage, one review per member/place.
create table public.kampuscape_review_places(id text primary key, name text not null);
create table public.kampuscape_place_reviews(
 id uuid primary key default gen_random_uuid(),
 place_id text not null references public.kampuscape_review_places(id),
 user_id uuid not null references auth.users(id) on delete cascade,
 rating integer not null check(rating between 1 and 5),
 body text not null check(char_length(btrim(body)) between 10 and 2000),
 anonymous boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(place_id,user_id)
);
create index kampuscape_reviews_place on public.kampuscape_place_reviews(place_id,created_at desc,id);
create index kampuscape_reviews_user on public.kampuscape_place_reviews(user_id,updated_at desc);
create table public.kampuscape_review_reports(
 review_id uuid not null references public.kampuscape_place_reviews(id) on delete cascade,
 reporter_id uuid not null references auth.users(id) on delete cascade,
 reason text not null check(char_length(btrim(reason)) between 5 and 500),
 created_at timestamptz not null default now(),primary key(review_id,reporter_id)
);
alter table public.kampuscape_review_places enable row level security;
alter table public.kampuscape_place_reviews enable row level security;
alter table public.kampuscape_review_reports enable row level security;
revoke all on public.kampuscape_review_places,public.kampuscape_place_reviews,public.kampuscape_review_reports from public,anon,authenticated;

create function public.kampuscape_place_reviews(p_place_id text,p_offset integer default 0) returns jsonb
language sql stable security definer set search_path='' as $$
 with visible as (
 select r.id,r.rating,r.body,r.anonymous,r.created_at,r.updated_at,r.user_id,
 case when r.anonymous then 'Anonymous student' else p.display_name end as display_name,
 case when r.anonymous then 'orbit' else p.avatar_id end as avatar_id
 from public.kampuscape_place_reviews r join auth.users u on u.id=r.user_id
 join public.kampuscape_profiles p on p.id=r.user_id
 where r.place_id=p_place_id and (u.banned_until is null or u.banned_until<now())
 ), page as (select * from visible order by created_at desc,id limit 20 offset greatest(0,least(coalesce(p_offset,0),10000)))
 select jsonb_build_object('count',(select count(*) from visible),'average',(select round(avg(rating),1) from visible),
 'reviews',coalesce((select jsonb_agg(to_jsonb(page)-'user_id'||jsonb_build_object('is_you',coalesce(user_id=auth.uid(),false))) from page),'[]'::jsonb),
 'mine',(select to_jsonb(v)-'user_id'||jsonb_build_object('is_you',true) from visible v where user_id=auth.uid() and public.kampuscape_is_member()));
$$;
create function public.kampuscape_save_review(p_place_id text,p_rating integer,p_body text,p_anonymous boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); rid uuid;
begin
 if not public.kampuscape_is_member() or not exists(select 1 from public.kampuscape_profiles where id=uid and onboarding_completed_at is not null) then raise exception 'Complete your profile to review a place.' using errcode='42501';end if;
 if not exists(select 1 from public.kampuscape_review_places where id=p_place_id) or p_rating is null or p_rating not between 1 and 5 or char_length(btrim(coalesce(p_body,''))) not between 10 and 2000 or p_anonymous is null then raise exception 'Choose a place, 1–5 stars, and write 10–2000 characters.' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,55));
 if not exists(select 1 from public.kampuscape_place_reviews where user_id=uid and place_id=p_place_id) and (select count(*) from public.kampuscape_place_reviews where user_id=uid and created_at>now()-interval '1 day')>=10 then raise exception 'You can review up to 10 new places per day.' using errcode='54000';end if;
 insert into public.kampuscape_place_reviews(place_id,user_id,rating,body,anonymous) values(p_place_id,uid,p_rating,btrim(p_body),p_anonymous)
 on conflict(place_id,user_id) do update set rating=excluded.rating,body=excluded.body,anonymous=excluded.anonymous,updated_at=now() returning id into rid;
 return rid;
end; $$;
create function public.kampuscape_delete_review(p_review_id uuid) returns void
language sql security definer set search_path='' as $$
 delete from public.kampuscape_place_reviews where id=p_review_id and user_id=auth.uid() and public.kampuscape_is_member();
$$;
create function public.kampuscape_report_review(p_review_id uuid,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.kampuscape_is_member() then raise exception 'Sign in first.' using errcode='42501';end if;
 if char_length(btrim(coalesce(p_reason,''))) not between 5 and 500 then raise exception 'Describe the issue in 5–500 characters.' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,56));
 if (select count(*) from public.kampuscape_review_reports where reporter_id=auth.uid() and created_at>now()-interval '1 day')>=20 then raise exception 'Please try again tomorrow.' using errcode='54000';end if;
 insert into public.kampuscape_review_reports(review_id,reporter_id,reason) values(p_review_id,auth.uid(),btrim(p_reason)) on conflict do nothing;
end; $$;
revoke all on function public.kampuscape_place_reviews(text,integer),public.kampuscape_save_review(text,integer,text,boolean),public.kampuscape_delete_review(uuid),public.kampuscape_report_review(uuid,text) from public,anon,authenticated;
grant execute on function public.kampuscape_place_reviews(text,integer) to anon,authenticated;
grant execute on function public.kampuscape_save_review(text,integer,text,boolean),public.kampuscape_delete_review(uuid),public.kampuscape_report_review(uuid,text) to authenticated;
