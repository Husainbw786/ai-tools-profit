-- Re-point data copied from the old (Lovable) Supabase project at the user
-- accounts in this project.
--
-- Background: every row in sales / sale_payments / contacts (and the workspace
-- tables) carries the auth user's UUID. Rows copied from the old project still
-- hold the OLD ids, so freshly created users see an empty app until the ids are
-- swapped.
--
-- How to use (Supabase dashboard > SQL Editor):
--   1. Find the old ids and who they belong to:
--        select user_id, count(*) as sales, min(created_at) as first_sale,
--               string_agg(distinct customer_name, ', ') as customers
--        from public.sales group by user_id;
--   2. Find the new ids (after both people have signed up / been created):
--        select id, email from auth.users;
--   3. Fill in the four values below and run the whole file once.
--      Leave old_b / new_b as-is if there is only one person to remap.

do $$
declare
  old_a uuid := '00000000-0000-0000-0000-000000000000';  -- old id, person A
  new_a uuid := '00000000-0000-0000-0000-000000000000';  -- new id, person A
  old_b uuid := '00000000-0000-0000-0000-000000000000';  -- old id, person B
  new_b uuid := '00000000-0000-0000-0000-000000000000';  -- new id, person B
  pair record;
begin
  for pair in
    select * from (values (old_a, new_a), (old_b, new_b)) as v(old_id, new_id)
    where old_id <> new_id
      and old_id <> '00000000-0000-0000-0000-000000000000'
  loop
    if not exists (select 1 from auth.users where id = pair.new_id) then
      raise exception 'new id % does not exist in auth.users', pair.new_id;
    end if;

    update public.sales                   set user_id       = pair.new_id where user_id       = pair.old_id;
    update public.sale_payments           set user_id       = pair.new_id where user_id       = pair.old_id;
    update public.contacts                set user_id       = pair.new_id where user_id       = pair.old_id;

    update public.workspaces              set owner_id      = pair.new_id where owner_id      = pair.old_id;
    update public.workspace_members       set user_id       = pair.new_id where user_id       = pair.old_id;
    update public.workspace_invites       set invited_by    = pair.new_id where invited_by    = pair.old_id;
    update public.workspace_links         set created_by    = pair.new_id where created_by    = pair.old_id;
    update public.workspace_ledger_entries set created_by   = pair.new_id where created_by    = pair.old_id;
    update public.workspace_ledger_entries set payer_user_id = pair.new_id where payer_user_id = pair.old_id;

    raise notice 'remapped % -> %', pair.old_id, pair.new_id;
  end loop;
end $$;

-- Verify: every user_id in sales should now be a real auth user.
select s.user_id, count(*) as sales, u.email
from public.sales s
left join auth.users u on u.id = s.user_id
group by s.user_id, u.email;
