# Subscription Resale Tracker — Plan

A mobile-friendly single-user app to log subscription resales (LinkedIn Premium, etc.), track warranty periods, and view profit metrics.

## Pages

1. **Home / Dashboard** (`/`)
   - Big profit metric card (Lifetime by default)
   - Date range switcher: Lifetime · This month · Last month · Custom range (date picker)
   - Secondary stats: total sales count, total revenue, total cost
   - Quick "Add Sale" button
   - Recent active sales (last 5)

2. **Active Sales** (`/sales`)
   - List/table of all sales currently under warranty
   - Each row: product, customer, sell price, profit, warranty start → end, days remaining
   - Filter / search by product or customer
   - "Add Sale" button (opens form/dialog)
   - Click row → edit/delete

3. **Expired / Archive** (`/archive`)
   - Sales whose warranty has ended
   - Rendered in **lighter/muted color** to visually distinguish
   - Same columns as active, plus "expired on" date

4. **Add / Edit Sale** (dialog from any page)
   - Product name (e.g. "LinkedIn Premium Career")
   - Duration (e.g. 3 months) — drives warranty end date
   - Buyer name (where you sourced it)
   - Customer name (who you sold to)
   - Buy price, Sell price → profit shown live
   - Warranty start date (default: today)
   - Notes (optional)

## Behavior

- A sale is **Active** if `today < warranty_start + duration`, otherwise **Expired** — derived, not stored. No manual archive needed; expired sales automatically move to the Archive section and active list dims them out.
- Profit = sell_price − buy_price, computed on the fly.
- Date-range metrics filter sales by `warranty_start` (sale date).

## UI / Design

- Clean, mobile-first. Single-column on phone, comfortable table on desktop.
- Dashboard hero = one large profit number with the period selector right beside it.
- Active rows: full color. Expired rows: muted/grayed (lower opacity, muted text).
- shadcn components: Card, Table, Dialog, Button, Input, Calendar (date picker), Select, Tabs.
- Navigation: simple top bar with Dashboard · Active · Archive.

## Tech (backend phase — after UI approval)

- **Lovable Cloud** enabled for persistence.
- Single table `sales`:
  - `id`, `product_name`, `duration_months`, `buyer_name`, `customer_name`, `buy_price`, `sell_price`, `warranty_start`, `notes`, `created_at`
- Since "just me", auth can be a single email/password login (or we can skip auth entirely if you prefer — your call when we wire backend).
- All profit/expiry logic derived client-side from the row.

## Build Order

1. UI scaffold with mock data — dashboard, active list, archive, add/edit dialog
2. Polish mobile responsiveness + expired-row styling
3. Enable Lovable Cloud, create `sales` table, wire CRUD
4. Hook up real metrics with date filtering

Stage 1 (UI with mock data) is what we'll do first so you can click through and approve the flow before any backend work.
