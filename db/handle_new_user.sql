-- Create a public.users profile row whenever an auth.users account is created.
--
-- WHY THIS EXISTS
-- Supabase keeps credentials in auth.users and the app keeps everything else
-- in public.users. Nothing in the application code ever inserts into
-- public.users — every write there is an UPDATE or DELETE from the admin
-- console. So that row can only come from a trigger, and on 28 Aug 2026 a new
-- signup (rareops@gmail.com) produced an auth.users account with no matching
-- profile row, which means the trigger is missing or was dropped.
--
-- WHAT BREAKS WITHOUT IT
-- App.js reads the user's flags with .single(), so a missing row returns
-- nothing and every flag silently defaults to false: no username, no premium,
-- no admin. Anything with a foreign key to public.users will refuse to insert
-- outright.
--
-- BEFORE RUNNING
-- Check the column names against your actual schema in the Supabase table
-- editor. This assumes: id, email, username, display_name, member_since.
-- If `username` has a UNIQUE constraint, see the note at the bottom.

-- 1. The function ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, username, display_name, member_since)
  values (
    new.id,
    new.email,
    -- Auth.js passes these through signUp options.data, so they arrive in
    -- raw_user_meta_data. Fall back to the email's local part so the row is
    -- never created without a username.
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1)),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 2. The trigger -------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Backfill anyone already orphaned ----------------------------------------
-- Run this once. It finds auth accounts with no profile row and creates one.
-- Safe to re-run: the NOT EXISTS clause skips anyone who already has a row.
insert into public.users (id, email, username, display_name, member_since)
select
  u.id,
  u.email,
  coalesce(nullif(u.raw_user_meta_data->>'username', ''), split_part(u.email, '@', 1)),
  coalesce(nullif(u.raw_user_meta_data->>'display_name', ''), split_part(u.email, '@', 1)),
  coalesce(u.created_at, now())
from auth.users u
where not exists (select 1 from public.users p where p.id = u.id);

-- 4. Check the result --------------------------------------------------------
-- Should return zero rows. Anything listed is still orphaned.
select u.id, u.email, u.created_at
from auth.users u
where not exists (select 1 from public.users p where p.id = u.id);


-- NOTE ON A UNIQUE USERNAME CONSTRAINT
-- If public.users.username is UNIQUE, both the trigger and the backfill can
-- fail when two people pick the same name, or when two email local parts
-- collide (alice@gmail.com and alice@outlook.com both yield "alice"). The
-- trigger would then block signup entirely, which is worse than the bug it
-- fixes. If that constraint exists, make the fallback unique, for example:
--     split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 6)
-- and decide separately whether a colliding username should fail the signup
-- with a clear message rather than silently.
