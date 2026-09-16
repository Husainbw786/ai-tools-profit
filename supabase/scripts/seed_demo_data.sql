-- Demo data for ONE account — for showing the app to other people.
--
-- Fills the account below with ~13 months of made-up sales, their payments,
-- tagged contacts and a shared workspace, so every screen has something on it:
--
--   Dashboard    net profit + this month, Revenue/Cost/Sales, "to collect" banner,
--                six-month bar chart (every bar non-zero), Active list
--   Active       All / Paid / Partial / Unpaid tabs, warranties expiring in
--                3 days, ~3 weeks and months from now
--   Insights     13+ months of P&L (CSV + PDF export), Product / Customer / Dealer
--                breakdowns with real top earners and genuinely thin margins
--   Dues         unpaid and part-paid sales, oldest ~3 months old
--   Archive      expired warranties, incl. multi-month old ones
--   Customers    per-person revenue/profit/dues, tags (VIP, Wholesale, Slow-payer…)
--   Dealers      same, per dealer
--   Sale detail  quantities > 1, part-payment history, no-warranty sales,
--                a full refund and a partial refund
--   Shared links a workspace with links and a ledger that has a net balance
--
-- HOW TO RUN: Supabase dashboard > SQL Editor > paste this whole file > Run.
--   The account must already exist under Authentication > Users.
--
-- SAFE TO RE-RUN: every row written here carries a fixed id prefix
-- (d0000000-…, d0000001-…, …). Re-running deletes exactly those rows and
-- writes them again. Real sales, payments and contacts are never touched.
--
-- TO REMOVE THE DEMO DATA: set wipe_only := true below and run the file again.
--
-- The monthly goal on the dashboard is not stored in the database (it lives in
-- the browser), so tap "Set a goal ✎" once in the browser you demo from —
-- 10000 sits at roughly two-thirds of the profit this script generates for the
-- current month, so the progress bar reads well.

do $$
declare
  -- ── settings ────────────────────────────────────────────────────────────
  demo_email    text    := 'aitools0114@gmail.com';
  partner_email text    := '';     -- optional: a second signed-up account to share
                                   -- the workspace ledger with. Leave '' to skip;
                                   -- if the address has not signed up yet it is
                                   -- added as a pending invite instead.
  sale_count    int     := 70;     -- generated sales, on top of 12 hand-made ones
  wipe_only     boolean := false;  -- true = only delete the demo rows, write nothing
  -- ────────────────────────────────────────────────────────────────────────

  uid        uuid;
  partner_id uuid;
  ws_id      uuid;
  payer_b    uuid;
  n_sales    int;
  n_pays     int;
  n_contacts int;
begin
  select id into uid from auth.users where lower(email) = lower(demo_email);
  if uid is null then
    raise exception 'No auth user with email %. Create it under Authentication > Users first.', demo_email;
  end if;

  select id into ws_id from public.workspaces where owner_id = uid;

  -- ── 1. clear anything this script wrote before ──────────────────────────
  delete from public.sale_payments where user_id = uid and id::text like 'd0000001-%';
  delete from public.sales         where user_id = uid and id::text like 'd0000000-%';
  delete from public.contacts      where user_id = uid and id::text like 'd0000002-%';
  if ws_id is not null then
    delete from public.workspace_links           where workspace_id = ws_id and id::text like 'd0000003-%';
    delete from public.workspace_ledger_entries  where workspace_id = ws_id and id::text like 'd0000004-%';
    delete from public.workspace_invites         where workspace_id = ws_id and id::text like 'd0000005-%';
    delete from public.workspace_members         where workspace_id = ws_id and id::text like 'd0000006-%';
  end if;

  if wipe_only then
    raise notice 'Demo data removed for % — real data untouched.', demo_email;
    return;
  end if;

  -- ── 2. work out every sale first, so payments can follow the same plan ──
  create temp table demo_plan on commit drop as
  with catalog (p_idx, product, months, buy, sell) as (
    values
      (0,  'LinkedIn Premium Career',    3, 899::numeric,  1349::numeric),
      (1,  'Netflix Premium 4K',         1, 180::numeric,   299::numeric),
      (2,  'Spotify Premium',            6, 399::numeric,   699::numeric),
      (3,  'YouTube Premium',           12, 750::numeric,  1199::numeric),
      (4,  'Canva Pro',                 12, 550::numeric,   999::numeric),
      (5,  'ChatGPT Plus',               1, 1450::numeric, 1799::numeric),
      (6,  'Adobe Creative Cloud',      12, 4200::numeric, 5499::numeric),
      (7,  'Microsoft 365 Family',      12, 2900::numeric, 3799::numeric),
      (8,  'Perplexity Pro',            12, 350::numeric,   999::numeric),
      (9,  'Coursera Plus',             12, 2500::numeric, 3499::numeric),
      (10, 'Grammarly Premium',          3, 600::numeric,   999::numeric),
      (11, 'Prime Video',                6, 299::numeric,   449::numeric),
      (12, 'JioHotstar Super',          12, 899::numeric,  1199::numeric),
      (13, 'LinkedIn Premium Business',  1, 499::numeric,   799::numeric),
      (14, 'Zoom Pro',                   1, 900::numeric,  1049::numeric)
  ),
  buyers (c_idx, cname, cphone) as (
    values
      (0,  'Aarav Sharma',    '+919000000101'),
      (1,  'Priya Nair',      '+919000000102'),
      (2,  'Rohan Mehta',     '+919000000103'),
      (3,  'Sneha Iyer',      '+919000000104'),
      (4,  'Vikram Desai',    '+919000000105'),
      (5,  'Ananya Rao',      '+919000000106'),
      (6,  'Karan Malhotra',  '+919000000107'),
      (7,  'Ishita Banerjee', '+919000000108'),
      (8,  'Devansh Gupta',   '+919000000109'),
      (9,  'Meera Pillai',    '+919000000110'),
      (10, 'Farhan Qureshi',  '+919000000111'),
      (11, 'Tanvi Joshi',     '+919000000112')
  ),
  sellers (d_idx, dname, dphone) as (
    values
      (0, 'SubsMart Wholesale', '+919000000201'),
      (1, 'Ravi Digital Hub',   '+919000000202'),
      (2, 'CloudKart Dealer',   '+919000000203'),
      (3, 'PrimeBazaar',        '+919000000204'),
      (4, 'NexaSubs',           '+919000000205')
  ),
  seq as (
    select
      g.n,
      g.n % 13            as month_offset,
      ((g.n * 11) % 26)+1 as day_of_month,
      9 + ((g.n * 13)%10) as hour_of_day,
      (g.n * 7) % 15      as p_idx,
      (g.n * 5) % 12      as c_idx,
      (g.n * 3) % 5       as d_idx,
      (g.n * 37) % 100    as pay_roll
    from generate_series(1, sale_count) as g(n)
  ),
  generated as (
    select
      s.n,
      c.product, c.months, c.buy, c.sell,
      b.cname, b.cphone, d.dname, d.dphone,
      case when s.n % 17 = 0 then 5
           when s.n % 9  = 0 then 3
           when s.n % 5  = 0 then 2
           else 1 end                                                as qty,
      (s.n % 11) <> 0                                                as has_warranty,
      date_trunc('month', now())
        - make_interval(months => s.month_offset)
        + make_interval(days => least(
            s.day_of_month,
            case when s.month_offset = 0 then extract(day from now())::int else 28 end
          ) - 1)
        + make_interval(hours => s.hour_of_day)                      as warranty_start,
      -- older months are settled up; recent months carry the dues
      case when s.month_offset >= 4  then 'paid'
           when s.pay_roll     <  62 then 'paid'
           when s.pay_roll     <  84 then 'partial'
           else 'unpaid' end                                         as pay_plan,
      case when s.n % 4 = 0 then (array[
             'Renewal — same login as last time',
             'Shared plan, 4 profiles',
             'Invoice sent on WhatsApp',
             'Office team order'
           ])[((s.n / 4) % 4) + 1] end                               as notes,
      null::timestamptz as refunded_at,
      null::numeric     as refund_amount,
      null::text        as refund_reason
    from seq s
    join catalog c on c.p_idx = s.p_idx
    join buyers  b on b.c_idx = s.c_idx
    join sellers d on d.d_idx = s.d_idx
  ),
  -- Hand-made rows, one per state a demo should show on screen.
  showcase (n, product, months, buy, sell, cname, cphone, dname, dphone,
            qty, has_warranty, warranty_start, pay_plan, notes,
            refunded_at, refund_amount, refund_reason) as (
    values
      -- expires in 3 days — red "3d left" row at the top of Active
      (901, 'ChatGPT Plus', 1, 1450::numeric, 1799::numeric,
       'Aarav Sharma', '+919000000101', 'NexaSubs', '+919000000205',
       1, true, now() - interval '27 days', 'paid',
       'Wants auto-renew next month'::text,
       null::timestamptz, null::numeric, null::text),
      -- part-paid, two seats
      (902, 'Netflix Premium 4K', 1, 180::numeric, 299::numeric,
       'Priya Nair', '+919000000102', 'SubsMart Wholesale', '+919000000201',
       2, true, now() - interval '25 days', 'partial',
       'Paid half on delivery, rest promised on salary day', null, null, null),
      -- long warranty running out in ~3 weeks
      (903, 'Canva Pro', 12, 550::numeric, 999::numeric,
       'Vikram Desai', '+919000000105', 'CloudKart Dealer', '+919000000203',
       1, true, now() - interval '11 months 10 days', 'paid',
       'Renews in three weeks — offer the 2-year rate', null, null, null),
      -- long expired → Archive
      (904, 'Adobe Creative Cloud', 12, 4200::numeric, 5499::numeric,
       'Ishita Banerjee', '+919000000108', 'PrimeBazaar', '+919000000204',
       1, true, now() - interval '13 months', 'paid',
       'Student licence, renewed elsewhere', null, null, null),
      -- bulk order, paid in two instalments
      (905, 'YouTube Premium', 12, 750::numeric, 1199::numeric,
       'Karan Malhotra', '+919000000107', 'SubsMart Wholesale', '+919000000201',
       5, true, now() - interval '5 days', 'partial',
       'Office team of five — ₹2,000 advance', null, null, null),
      -- full refund
      (906, 'Coursera Plus', 12, 2500::numeric, 3499::numeric,
       'Devansh Gupta', '+919000000109', 'Ravi Digital Hub', '+919000000202',
       1, true, now() - interval '40 days', 'paid', 'Refunded in full',
       now() - interval '20 days', 3499::numeric, 'Login never activated — money returned'),
      -- partial refund
      (907, 'Microsoft 365 Family', 12, 2900::numeric, 3799::numeric,
       'Meera Pillai', '+919000000110', 'PrimeBazaar', '+919000000204',
       1, true, now() - interval '70 days', 'paid', 'Adjusted for two unused seats',
       now() - interval '35 days', 1200::numeric, 'Two of six seats never used — partial refund'),
      -- oldest due, drives "oldest N days" on the dashboard banner
      (908, 'Spotify Premium', 6, 399::numeric, 699::numeric,
       'Farhan Qureshi', '+919000000111', 'NexaSubs', '+919000000205',
       3, true, now() - interval '95 days', 'unpaid',
       'Says he will pay with the next order', null, null, null),
      -- sold without warranty
      (909, 'Prime Video', 6, 299::numeric, 449::numeric,
       'Tanvi Joshi', '+919000000112', 'CloudKart Dealer', '+919000000203',
       1, false, now() - interval '3 days', 'paid',
       'Sold as-is, no replacement promised', null, null, null),
      -- fat margin, this month, quantity 3 → top of the Insights leaderboard
      (910, 'Perplexity Pro', 12, 350::numeric, 999::numeric,
       'Sneha Iyer', '+919000000104', 'Ravi Digital Hub', '+919000000202',
       3, true, now() - interval '9 days', 'paid',
       'Friends of a friend, referred', null, null, null),
      -- thin margin → "Lowest margins" on Insights
      (911, 'Zoom Pro', 1, 900::numeric, 1049::numeric,
       'Rohan Mehta', '+919000000103', 'PrimeBazaar', '+919000000204',
       2, true, now() - interval '16 days', 'paid',
       'Barely worth it at this rate', null, null, null),
      -- sold today
      (912, 'LinkedIn Premium Career', 3, 899::numeric, 1349::numeric,
       'Ananya Rao', '+919000000106', 'SubsMart Wholesale', '+919000000201',
       1, true, now() - interval '2 hours', 'paid',
       'Job hunting — may extend to 6 months', null, null, null)
  )
  select n, product, months, buy, sell, cname, cphone, dname, dphone,
         qty, has_warranty, warranty_start, pay_plan, notes,
         refunded_at, refund_amount, refund_reason
  from generated
  union all
  select n, product, months, buy, sell, cname, cphone, dname, dphone,
         qty, has_warranty, warranty_start, pay_plan, notes,
         refunded_at, refund_amount, refund_reason
  from showcase;

  -- ── 3. sales ────────────────────────────────────────────────────────────
  insert into public.sales (
    id, user_id, product_name, duration_months, quantity,
    buyer_name, customer_name, customer_number, dealer_number,
    buy_price, sell_price, warranty_start, notes, has_warranty,
    payment_status, refunded_at, refund_amount, refund_reason,
    created_at, updated_at)
  select
    ('d0000000-0000-4000-8000-' || lpad(p.n::text, 12, '0'))::uuid,
    uid, p.product, p.months, p.qty,
    p.dname, p.cname, p.cphone, p.dphone,
    p.buy, p.sell, p.warranty_start, p.notes, p.has_warranty,
    p.pay_plan, p.refunded_at, p.refund_amount, p.refund_reason,
    p.warranty_start, p.warranty_start
  from demo_plan p;
  get diagnostics n_sales = row_count;

  -- ── 4. payments (the trigger re-derives payment_status from these) ──────
  insert into public.sale_payments (id, user_id, sale_id, amount, paid_at, method, note)
  select
    ('d0000001-0000-4000-8000-' || lpad((p.n * 10 + pay.k)::text, 12, '0'))::uuid,
    uid,
    ('d0000000-0000-4000-8000-' || lpad(p.n::text, 12, '0'))::uuid,
    pay.amount,
    least(p.warranty_start + make_interval(days => pay.day_offset, hours => 5), now()),
    pay.method,
    pay.note
  from demo_plan p
  cross join lateral (
    values
      (1,
       case when p.pay_plan = 'paid'                          then round(p.sell * p.qty)
            when p.pay_plan = 'partial' and p.n % 3 = 0       then round(p.sell * p.qty * 0.35)
            when p.pay_plan = 'partial'                       then round(p.sell * p.qty * 0.45)
       end,
       0, 'UPI', 'Paid on handover'),
      (2,
       case when p.pay_plan = 'partial' and p.n % 3 = 0       then round(p.sell * p.qty * 0.25)
       end,
       6, 'Cash', 'Second instalment')
  ) as pay(k, amount, day_offset, method, note)
  where pay.amount is not null and pay.amount > 0;
  get diagnostics n_pays = row_count;

  -- The sale_payments trigger compares the paid total against the PER-UNIT
  -- price, so a part-paid multi-seat sale ends up labelled "Paid" while the
  -- app still shows a balance for it. Re-state the status from the line total
  -- (price x quantity), which is what the app itself uses.
  update public.sales s
     set payment_status = case
           when coalesce(pp.paid, 0) >= s.sell_price * s.quantity then 'paid'
           when coalesce(pp.paid, 0) >  0                         then 'partial'
           else 'unpaid' end
    from demo_plan p
    left join lateral (
      select sum(sp.amount) as paid
      from public.sale_payments sp
      where sp.sale_id = ('d0000000-0000-4000-8000-' || lpad(p.n::text, 12, '0'))::uuid
    ) pp on true
   where s.id = ('d0000000-0000-4000-8000-' || lpad(p.n::text, 12, '0'))::uuid;

  -- ── 5. contacts (tags + notes shown on Customers / Dealers) ─────────────
  insert into public.contacts (id, user_id, kind, name_key, display_name, tags, notes)
  select
    ('d0000002-0000-4000-8000-' || lpad(c.idx::text, 12, '0'))::uuid,
    uid, c.kind, lower(c.display_name), c.display_name, c.tags, c.notes
  from (values
    (1,  'customer', 'Aarav Sharma',       array['VIP'],                  'Buys every quarter, pays the same day.'),
    (2,  'customer', 'Priya Nair',         array['Wholesale'],            'Resells to her college group — always asks for 5+ seats.'),
    (3,  'customer', 'Rohan Mehta',        array['Friend'],               'Cost price only. No haggling, no dues.'),
    (4,  'customer', 'Sneha Iyer',         array['VIP','Friend'],         'Sends the most referrals. Worth keeping happy.'),
    (5,  'customer', 'Vikram Desai',       array['Slow-payer'],           'Pays eventually, but needs two reminders.'),
    (6,  'customer', 'Ananya Rao',         array[]::text[],               'Found us through Sneha. First order this month.'),
    (7,  'customer', 'Karan Malhotra',     array['Wholesale','VIP'],      'Buys for his office team — 5 seats at a time.'),
    (8,  'customer', 'Ishita Banerjee',    array['Friend'],               'Student rate. Renews every semester.'),
    (9,  'customer', 'Devansh Gupta',      array['Slow-payer'],           'One refund already. Take payment upfront.'),
    (10, 'customer', 'Meera Pillai',       array['VIP'],                  'Biggest single order so far.'),
    (11, 'customer', 'Farhan Qureshi',     array['Slow-payer','Blocked'], 'Dues pending 3 months. No new orders until cleared.'),
    (12, 'customer', 'Tanvi Joshi',        array[]::text[],               'Prefers no-warranty items at a lower rate.'),
    (13, 'dealer',   'SubsMart Wholesale', array['Wholesale','VIP'],      'Cheapest on Netflix and YouTube. Stock most days.'),
    (14, 'dealer',   'Ravi Digital Hub',   array['Friend'],               'Slow to reply but never sends a dead account.'),
    (15, 'dealer',   'CloudKart Dealer',   array['Wholesale'],            'Good on Canva and Prime. Ask for bulk rate above 5.'),
    (16, 'dealer',   'PrimeBazaar',        array['Slow-payer'],           'Thin margins on Zoom and Microsoft. Use as backup.'),
    (17, 'dealer',   'NexaSubs',           array['VIP'],                  'Only dealer with same-day ChatGPT Plus.')
  ) as c(idx, kind, display_name, tags, notes)
  on conflict (user_id, kind, name_key) do nothing;
  get diagnostics n_contacts = row_count;

  -- ── 6. shared workspace: links + ledger ─────────────────────────────────
  if ws_id is null then
    insert into public.workspaces (owner_id, name)
    values (uid, split_part(demo_email, '@', 1) || '''s space')
    returning id into ws_id;
  end if;
  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws_id, uid, 'owner')
  on conflict (workspace_id, user_id) do nothing;

  if partner_email <> '' then
    select id into partner_id from auth.users where lower(email) = lower(partner_email);
    if partner_id is not null then
      insert into public.workspace_members (id, workspace_id, user_id, role)
      values ('d0000006-0000-4000-8000-000000000001', ws_id, partner_id, 'editor')
      on conflict (workspace_id, user_id) do nothing;
    else
      insert into public.workspace_invites (id, workspace_id, email, role, invited_by)
      values ('d0000005-0000-4000-8000-000000000001', ws_id, partner_email, 'editor', uid)
      on conflict (workspace_id, email) do nothing;
    end if;
  end if;

  -- Entries the partner paid for; falls back to the demo account when there is
  -- no partner, so the ledger still shows a balance and a history.
  payer_b := coalesce(partner_id, uid);

  insert into public.workspace_links (id, workspace_id, title, url, note, created_by, created_at)
  select
    ('d0000003-0000-4000-8000-' || lpad(l.idx::text, 12, '0'))::uuid,
    ws_id, l.title, l.url, l.note, uid, now() - make_interval(days => l.idx * 3)
  from (values
    (1, 'Dealer price list — this month', 'https://example.com/demo/dealer-price-list',
        'SubsMart rates. Re-check before quoting anything above 3 seats.'),
    (2, 'Stock tracker sheet',            'https://example.com/demo/stock-tracker',
        'Which Netflix and YouTube seats are free right now.'),
    (3, 'Payment QR',                     'https://example.com/demo/upi-qr',
        'Send this to customers instead of typing the UPI id.'),
    (4, 'Refund policy note',             'https://example.com/demo/refund-policy',
        'What we promise on warranty and what we do not.'),
    (5, 'WhatsApp broadcast draft',       'https://example.com/demo/broadcast-draft',
        'Month-end offer message. Edit the discount before sending.')
  ) as l(idx, title, url, note);

  insert into public.workspace_ledger_entries
    (id, workspace_id, created_by, payer_user_id, amount_cents, kind, note, entry_date, created_at)
  select
    ('d0000004-0000-4000-8000-' || lpad(e.idx::text, 12, '0'))::uuid,
    ws_id, uid,
    case when e.paid_by_me then uid else payer_b end,
    e.amount_cents, e.kind, e.note,
    (current_date - e.days_ago),
    now() - make_interval(days => e.days_ago)
  from (values
    (1, 1250000, 'entry',      'Netflix stock — 10 seats from SubsMart',  true,  38),
    (2,  435000, 'entry',      'ChatGPT Plus × 3 from NexaSubs',          false, 31),
    (3,  680000, 'entry',      'Canva Pro yearly bundle',                 true,  24),
    (4,  500000, 'settlement', 'UPI settlement',                          false, 18),
    (5,  289000, 'entry',      'Spotify 6-month packs',                   false, 11),
    (6,  150000, 'entry',      'Domain + WhatsApp Business setup',        true,   4)
  ) as e(idx, amount_cents, kind, note, paid_by_me, days_ago);

  raise notice 'Demo data ready for %: % sales, % payments, % contacts, workspace %.',
    demo_email, n_sales, n_pays, n_contacts, ws_id;
end $$;
