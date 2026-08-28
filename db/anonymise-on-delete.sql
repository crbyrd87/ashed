-- Account deletion by anonymisation.
--
-- DO NOT RUN YET. Two things must happen first — see PRECONDITIONS below.
--
-- DECISION (28 Aug 2026): a deleted account's identity is removed, but the
-- check-in history it produced is kept and detached. Community ratings,
-- cigars.avg_rating and the Feed stay intact; the person genuinely disappears.
--
-- WHY NULL AND NOT A TOMBSTONE USER
-- Every surface that renders an author already handles a missing one:
--   Feed.js         -> "Someone"
--   FeedModal.js    -> "Unknown"
--   Notifications   -> "Someone"
--   AdminConsole    -> "unknown"
-- So nulling the author needs no interface changes. A tombstone user would
-- also need its own auth.users row (public.users.id references it) and would
-- merge every deleted person into one fake profile that the admin console
-- would then list as a real account.
--
-- WHY THIS IS NOT A BLANKET CASCADE
-- comments and fires live on OTHER people's check-ins. Cascading them would
-- silently rewrite someone else's page and drop their like count. They are
-- detached, not deleted. cigars must outlive its contributors, so added_by is
-- detached too — matching submitted_by, which is already SET NULL.

-- ============================================================================
-- PRECONDITIONS
-- ============================================================================
--
-- 1. CHECK THE RLS POLICIES ON THE AFFECTED TABLES FIRST.
--    If any SELECT policy is written as `user_id = auth.uid()`, then a row
--    with a NULL user_id evaluates to NULL, not true, and becomes invisible to
--    everyone — silently hiding anonymised check-ins from the Feed. Run:
--
--      select tablename, policyname, cmd, qual
--      from pg_policies
--      where schemaname = 'public'
--        and tablename in ('checkins','ratings','comments','fires');
--
--    Public read access must be keyed on something else, such as
--    `visibility = 'public'`. If it is not, fix the policy before running this.
--
-- 2. DECIDE WHETHER DELETION SHOULD ALSO REMOVE PRIVATE CHECK-INS.
--    This script keeps every check-in, including ones marked private, with the
--    author detached. If private check-ins should be destroyed rather than
--    anonymised, that needs a separate step before the delete.

begin;

-- ---------------------------------------------------------------------------
-- 1. Allow the author to be detached
-- ---------------------------------------------------------------------------
alter table public.checkins alter column user_id drop not null;
alter table public.ratings  alter column user_id drop not null;
alter table public.comments alter column user_id drop not null;
alter table public.fires    alter column user_id drop not null;

-- ---------------------------------------------------------------------------
-- 2. Content that is kept and detached
-- ---------------------------------------------------------------------------
alter table public.checkins drop constraint checkins_user_id_fkey;
alter table public.checkins add constraint checkins_user_id_fkey
  foreign key (user_id) references public.users(id) on delete set null;

alter table public.ratings drop constraint ratings_user_id_fkey;
alter table public.ratings add constraint ratings_user_id_fkey
  foreign key (user_id) references public.users(id) on delete set null;

alter table public.comments drop constraint comments_user_id_fkey;
alter table public.comments add constraint comments_user_id_fkey
  foreign key (user_id) references public.users(id) on delete set null;

alter table public.fires drop constraint fires_user_id_fkey;
alter table public.fires add constraint fires_user_id_fkey
  foreign key (user_id) references public.users(id) on delete set null;

-- The catalog outlives its contributors. submitted_by is already SET NULL;
-- added_by being NO ACTION is an inconsistency on the same table.
alter table public.cigars drop constraint cigars_added_by_fkey;
alter table public.cigars add constraint cigars_added_by_fkey
  foreign key (added_by) references public.users(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 3. Purely personal records, removed with the account
-- ---------------------------------------------------------------------------
alter table public.wishlist drop constraint wishlist_user_id_fkey;
alter table public.wishlist add constraint wishlist_user_id_fkey
  foreign key (user_id) references public.users(id) on delete cascade;

alter table public.humidor drop constraint humidor_user_id_fkey;
alter table public.humidor add constraint humidor_user_id_fkey
  foreign key (user_id) references public.users(id) on delete cascade;

alter table public.places drop constraint places_user_id_fkey;
alter table public.places add constraint places_user_id_fkey
  foreign key (user_id) references public.users(id) on delete cascade;

-- A friendship with nobody on one side is meaningless.
alter table public.friends drop constraint friends_requester_id_fkey;
alter table public.friends add constraint friends_requester_id_fkey
  foreign key (requester_id) references public.users(id) on delete cascade;

alter table public.friends drop constraint friends_recipient_id_fkey;
alter table public.friends add constraint friends_recipient_id_fkey
  foreign key (recipient_id) references public.users(id) on delete cascade;

-- ---------------------------------------------------------------------------
-- 4. Deleting the login removes the profile, which triggers everything above
-- ---------------------------------------------------------------------------
alter table public.users drop constraint users_id_fkey;
alter table public.users add constraint users_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;

commit;

-- ============================================================================
-- AFTERWARDS
-- ============================================================================
-- Deleting from Supabase's Authentication -> Users page now works in one step
-- and leaves no orphan in either direction.
--
-- Still outstanding, and not solved by this file:
--   CR-21   the admin console calls from("users").delete() and never
--           auth.admin.deleteUser, so it removes the profile and strands the
--           login. It needs a serverless endpoint holding the service-role key.
--   rec 40  Settings promises "permanently delete your account and all your
--           data". After this change that is still not what happens — history
--           is kept, detached. The copy has to say so.
--   rec 58  in-app account deletion is an App Store review requirement, and
--           needs the same endpoint as CR-21.
--
-- Verify with:
--   select conrelid::regclass, conname, pg_get_constraintdef(oid)
--   from pg_constraint
--   where confrelid = 'public.users'::regclass and contype = 'f'
--   order by 1;
