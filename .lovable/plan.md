## Scope
Ship 6 features across the existing ProfitAI UI without changing how sales are saved (except adding a `payment_status` column).

## 1. Expiry urgency badges
Update `SalesList.tsx` so the right-side chip uses three tiers based on `daysRemaining`:
- ≤ 7 days → red (`bg-destructive/10 text-destructive`)
- ≤ 30 days → orange (new `--warning` token in `styles.css`)
- > 30 days → green (existing `accent`)
- expired → muted
Left accent bar follows the same color.

## 2. Profit margin % per row
In `SalesList.tsx`, compute `margin = (profit / buyPrice) * 100` and render a small `+45%` chip under the absolute profit. Color-code: positive → accent, negative → destructive. Add `marginPct()` helper to `sale-utils.ts`.

## 3. Customer detail page
- New route `src/routes/_authenticated/customer.$name.tsx` (lazy: create `_authenticated/route.tsx` only if not present — it already is, given login flow). Actually the project uses top-level routes with a login route, so add a regular route `src/routes/customer.$name.tsx`.
- Page shows: customer name, phone, totals (orders, revenue, profit, avg margin), and full `SalesList` for that customer.
- In `SalesList.tsx`, wrap the customer name in a `<Link to="/customer/$name" params={{ name }}>` (stopPropagation to keep row click working).

## 4. Payment status tracking
- DB migration: add `payment_status text not null default 'paid'` to `public.sales` (values: `paid`, `unpaid`, `partial`).
- Extend `SaleDTO`, `Sale`, server validators, create/update/list mappers, and Google Sheets column (append `payment_status` as column O, update `HEADERS`/`rowFor`/range `A:N`→`A:O`).
- `SaleDialog`: add a 3-button toggle (paid/unpaid/partial).
- `SalesList`: show a colored pill (paid → green, partial → orange, unpaid → red) next to product name.
- Dashboard: add an "Unpaid" stat tile + filter chip that, when active, narrows `activeSales` / `inRange` to non-paid rows.

## 5. WhatsApp quick-share
- Add helper `buildWhatsAppMessage(sale)` in `sale-utils.ts` producing a clean multi-line invoice (product, duration, dates, amount, payment status, your name).
- In `SaleDialog` (edit mode) and in `SalesList` row swipe/menu, add a "Share on WhatsApp" button that opens `https://wa.me/<customerNumber?>?text=<encoded>` in a new tab.

## 6. Trend chart on dashboard
- Add `recharts` (already common dep — install if missing).
- New `components/ProfitTrendChart.tsx`: bar chart of last 6 months' profit, derived from `sales` via `date-fns` month bucketing.
- Insert between hero card and the 3 stat tiles on `index.tsx`. Mobile-friendly height (~160px), uses semantic tokens.

## Technical notes
- Migration is the only schema change; everything else is frontend + small server-fn additions.
- Add `--warning` HSL token in `src/styles.css` (orange tuned to Navy Trust palette).
- All numeric formatting reuses `formatMoney`; new `formatPct`.
- No changes to auth, routing shell, or Sheets connector behavior beyond the extra column.

## Files touched
- `supabase/migrations/<new>.sql` (add `payment_status`)
- `src/lib/sale-utils.ts` (helpers, WA message, types)
- `src/lib/sales.functions.ts` (validator, mappers)
- `src/lib/sheets.server.ts` (column O)
- `src/hooks/use-sales.ts` (type passthrough)
- `src/components/SalesList.tsx` (badges, margin, link, payment pill, WA button)
- `src/components/SaleDialog.tsx` (payment toggle, WA button)
- `src/components/ProfitTrendChart.tsx` (new)
- `src/routes/index.tsx` (chart + unpaid stat/filter)
- `src/routes/customer.$name.tsx` (new)
- `src/styles.css` (warning token)
