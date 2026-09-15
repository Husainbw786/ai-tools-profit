-- Import the app's data from the *_backup tables (written by the old
-- deployment's backup sync) into the real tables the app reads, swapping the
-- old auth user ids for the users that exist in THIS project.
--
-- Prerequisites, in order:
--   1. Run supabase/scripts/schema.sql once (creates sales, sale_payments, contacts, ...).
--   2. Create the user accounts (Authentication > Users > Add user, "Auto Confirm").
--   3. Look up the ids:
--        select user_id, count(*), string_agg(distinct customer_name, ', ')
--        from public.sales_backup group by user_id;          -- old ids
--        select id, email from auth.users;                    -- new ids
--   4. Fill in the mapping below and run this whole file once.
--
-- Safe to re-run: rows already imported are skipped (ON CONFLICT DO NOTHING).

do $$
declare
  -- old id (from *_backup.user_id)              -> new id (auth.users.id)
  mapping jsonb := '{
    "00000000-0000-0000-0000-00000000000a": "00000000-0000-0000-0000-0000000000a1",
    "00000000-0000-0000-0000-00000000000b": "00000000-0000-0000-0000-0000000000b1"
  }';
  missing text;
  n_sales int; n_pay int; n_contacts int := 0;
begin
  -- Every user id present in the backups must be covered by the mapping.
  select string_agg(distinct b.user_id::text, ', ') into missing
  from (
    select user_id from public.sales_backup
    union select user_id from public.sale_payments_backup
    union select user_id from public.contacts_backup where to_regclass('public.contacts_backup') is not null
  ) b
  where not (mapping ? b.user_id::text);
  if missing is not null then
    raise exception 'mapping is missing these old user ids: %', missing;
  end if;

  -- Every new id must exist in auth.users.
  select string_agg(v, ', ') into missing
  from jsonb_each_text(mapping) m(k, v)
  where not exists (select 1 from auth.users u where u.id = v::uuid);
  if missing is not null then
    raise exception 'these new ids do not exist in auth.users: %', missing;
  end if;

  insert into public.sales (
    id, user_id, product_name, duration_months, quantity, buyer_name, customer_name,
    customer_number, dealer_number, buy_price, sell_price, warranty_start, notes,
    has_warranty, payment_status, refunded_at, refund_amount, refund_reason,
    created_at, updated_at)
  select
    id, (mapping ->> user_id::text)::uuid, product_name, duration_months,
    coalesce(quantity, 1), coalesce(buyer_name, ''), coalesce(customer_name, ''),
    customer_number, dealer_number, buy_price, sell_price, warranty_start, notes,
    coalesce(has_warranty, true), coalesce(payment_status, 'paid'),
    refunded_at, refund_amount, refund_reason, created_at, updated_at
  from public.sales_backup
  on conflict (id) do nothing;
  get diagnostics n_sales = row_count;

  insert into public.sale_payments (id, user_id, sale_id, amount, paid_at, method, note, created_at, updated_at)
  select id, (mapping ->> user_id::text)::uuid, sale_id, amount, paid_at, method, note, created_at, updated_at
  from public.sale_payments_backup
  where sale_id in (select id from public.sales)
  on conflict (id) do nothing;
  get diagnostics n_pay = row_count;

  if to_regclass('public.contacts_backup') is not null then
    insert into public.contacts (id, user_id, kind, name_key, display_name, tags, notes, created_at, updated_at)
    select id, (mapping ->> user_id::text)::uuid, kind, name_key, display_name,
           coalesce(tags, '{}'), notes, created_at, updated_at
    from public.contacts_backup
    on conflict (id) do nothing;
    get diagnostics n_contacts = row_count;
  end if;

  raise notice 'imported % sales, % payments, % contacts', n_sales, n_pay, n_contacts;
end $$;

-- Verify: each user should now see their sales under their new account.
select u.email, count(s.id) as sales
from public.sales s join auth.users u on u.id = s.user_id
group by u.email;
