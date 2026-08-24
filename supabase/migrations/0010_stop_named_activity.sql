-- Stop the named-account like/watch job. The people rows stay.
-- Run this in the Supabase SQL editor after 0009 if that job is already scheduled.

do $$
begin
  perform cron.unschedule('clips-named-activity');
exception when others then
  null;
end $$;

do $$
begin
  revoke execute on function public.run_named_activity(integer) from public;
  revoke execute on function public.run_named_activity(integer) from anon;
  revoke execute on function public.run_named_activity(integer) from authenticated;
exception when others then
  null;
end $$;
