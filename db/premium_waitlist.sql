-- The paywall's waitlist.
--
-- UpgradePrompt used to promise a free trial that does not exist and then
-- fire alert("Premium subscriptions are coming soon!"). It now records who
-- asked and which feature they were reaching for, so the sheet stops being a
-- dead end at the moment of highest intent.
--
-- RUN THIS BEFORE DEPLOYING the paywall change, or the button will report
-- "Could not add you to the list."

create table if not exists public.premium_waitlist (
  user_id    uuid primary key references public.users(id) on delete cascade,
  feature    text,          -- which locked feature they tapped, if any
  created_at timestamptz not null default now()
);

alter table public.premium_waitlist enable row level security;

-- A person may add themselves, see their own row, and change which feature it
-- records if they come back through a different locked feature.
create policy "insert own waitlist row"
  on public.premium_waitlist for insert
  with check (auth.uid() = user_id);

create policy "read own waitlist row"
  on public.premium_waitlist for select
  using (auth.uid() = user_id);

create policy "update own waitlist row"
  on public.premium_waitlist for update
  using (auth.uid() = user_id);

-- Reading the whole list is an admin job, done with the service role key from
-- a serverless function — deliberately not exposed to the client.
