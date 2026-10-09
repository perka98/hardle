begin;

-- Unverified signups must not reserve usernames.
create or replace function public.hardle_create_profile_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  requested_username text := new.raw_user_meta_data->>'username';
begin
  if new.email_confirmed_at is null then
    return new;
  end if;

  if requested_username is null or requested_username = '' then
    return new;
  end if;

  if not public.hardle_username_is_allowed(requested_username) then
    raise exception 'This username is not allowed.';
  end if;

  begin
    insert into public.hardle_profiles(user_id, username)
    values (new.id, requested_username)
    on conflict (user_id) do nothing;
  exception
    when unique_violation then
      raise exception 'Username is already taken.';
  end;

  return new;
end;
$function$;

drop trigger if exists hardle_create_profile_on_signup on auth.users;
create trigger hardle_create_profile_on_signup
after insert or update on auth.users
for each row execute function public.hardle_create_profile_on_signup();

-- Enforce case-insensitive uniqueness even for concurrent signup attempts.
create unique index if not exists hardle_profiles_username_lower_unique
on public.hardle_profiles (lower(username));

-- Do not allow unverified accounts to reserve a profile through the RPC.
create or replace function public.hardle_register_profile(p_username text)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  uid uuid := auth.uid();
  confirmed_at timestamptz;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;

  select u.email_confirmed_at into confirmed_at
  from auth.users u
  where u.id = uid;

  if confirmed_at is null then
    raise exception 'Please verify your email before registering a username.';
  end if;

  if not public.hardle_username_is_allowed(p_username) then
    raise exception 'This username is not allowed.';
  end if;

  begin
    insert into public.hardle_profiles(user_id, username)
    values (uid, p_username)
    on conflict (user_id) do nothing;
  exception
    when unique_violation then
      raise exception 'Username is already taken.';
  end;
end;
$function$;

-- Free usernames left behind by signups that never verified their email.
delete from public.hardle_profiles p
using auth.users u
where u.id = p.user_id
  and u.email_confirmed_at is null;

commit;
