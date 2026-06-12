
# Visual redesign to match reference

The screenshots show a polished mobile-first design with a consistent visual language. I'll keep all existing features and data wiring — this is purely a presentation refresh.

## 1. Bottom navigation (mobile)

Replace the current 4-items-plus-sheet bar with a 5-slot bar matching the screenshots:

```
[ Home ]  [ Sales ]  [ + FAB ]  [ Insights ]  [ More ]
```

- Center slot = large circular green "+" FAB that opens the New Sale dialog (currently triggered from Sales page). Floats slightly above the bar.
- Active item: icon + label in primary green (no filled pill background — matches screenshots).
- Bar: white/dark card, soft shadow, rounded, safe-area padding.

## 2. New "/more" route (replaces the bottom sheet)

A real page listing tools & settings, styled as the screenshot:
- Appearance card with Light / Dark segmented toggle (new `useTheme` hook writing `class="dark"` on `<html>` + localStorage).
- List rows with colored circular icons: Customers (count), Dealers (count), Dues (₹ outstanding), Shared links, Archive, Sync to Sheet.
- Sign out button (destructive text).
- Footer: "ProfitAI · Resale Ledger · v2.0".

Header theme toggle (moon/sun pill) stays in `AppLayout` header on all pages, matching screenshots 1, 2, 4.

## 3. Dashboard (/) polish

- Hero "Net Profit" card: dark gradient card with subtle radial green glow, large display number, dotted divider, 3-col REV / COST / SALES stats.
- "₹X to collect" alert row → soft red-tinted card linking to /collections.
- Profit Trend card with "PEAK ₹X" pill in top-right.
- Monthly goal card with progress bar + "70% there — ₹X to go in <Month>" caption.
- Lifetime / period selector in header (already exists, restyle as pill).

## 4. Active sales (/sales)

- Big "Active sales" title + subtitle "N subscriptions under warranty".
- "+ Add" green pill button in header area.
- Search input (rounded, icon).
- Filter tabs: All / Paid / Partial / Unpaid (pill segmented).
- Cards: avatar with initials (color-coded), product + duration, customer + months, price + profit %, status pill (PAID green / PARTIAL amber / UNPAID red) + "₹X DUE" + "N D LEFT" pill.

## 5. New sale sheet

- "New sale / Record a subscription resale" header.
- Grouped fields card, Under-warranty toggle row inside.
- TOTAL / PROFIT side-by-side summary tiles (profit tile green-tinted).
- "WARRANTY & PARTIES" section.
- Sticky bottom "Save sale" full-width green button + floating note/chat helper button.

## 6. Insights (/insights)

- 2×2 KPI grid: Revenue, Cost, Profit (green), Unpaid (red).
- Monthly P&L card with CSV / PDF export buttons, per-month REV/COST/PROFIT/UNPAID rows + "N SALES" pill.
- Profit breakdown segmented tabs: Product / Customer / Dealer with ranked list ("TOP EARNERS").

## 7. Theme system

- Add `useTheme` hook + small inline script in `__root.tsx` to apply saved theme before hydration (avoids flash).
- Verify `src/styles.css` tokens render correctly in both modes for the new card surfaces and accent green.

## Technical notes

- Files touched: `AppLayout.tsx` (nav rebuild), new `src/routes/more.tsx`, new `src/hooks/use-theme.ts`, restyle `src/routes/index.tsx`, `src/routes/sales.tsx`, `src/routes/insights.tsx`, `src/components/SalesList.tsx`, `src/components/SaleDialog.tsx`, `src/components/ProfitTrendChart.tsx`, tweaks to `src/styles.css` for gradient/glow tokens.
- No DB / server-function changes. All hooks (`use-sales`, `use-payments`, `use-contacts`, `use-goal`) stay the same.
- The center "+" FAB lifts the New Sale dialog into `AppLayout` so it's reachable from every screen (matches screenshots).
- Mobile-first; desktop keeps the existing top nav.

## Out of scope

- No new features, no schema changes, no auth/data changes.
- Existing routes `/customers`, `/dealers`, `/collections`, `/archive`, `/links` keep their current pages — only accessed via the new More page on mobile.

Shall I proceed?
