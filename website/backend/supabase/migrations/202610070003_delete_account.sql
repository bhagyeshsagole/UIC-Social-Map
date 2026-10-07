-- Self-service account deletion. A signed-in user can erase only their own
-- account: support messages they sent (linked or by address), their profile and
-- the Auth user itself (identities, sessions and refresh tokens cascade).
create or replace function public.kampuscape_delete_account()
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  address text;
begin
  if uid is null then
    raise exception 'Sign in to delete your account.' using errcode = '42501';
  end if;
  select lower(u.email) into address from auth.users u where u.id = uid;
  delete from public.kampuscape_support_requests r
   where r.user_id = uid or (address is not null and lower(r.email) = address);
  delete from public.kampuscape_profiles p where p.id = uid;
  delete from auth.users u where u.id = uid;
end;
$$;
revoke all on function public.kampuscape_delete_account() from public, anon;
grant execute on function public.kampuscape_delete_account() to authenticated;
