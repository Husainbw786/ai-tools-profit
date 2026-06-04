## Goal

Mirror every sale to **one Google Sheet you own**, with **one tab per user** (so your data and your friend's data stay in separate tabs but live in the same spreadsheet). Also backfill all existing sales from the database into the sheet on first run.

DB stays the source of truth — Sheets is a best-effort backup.

## Setup steps

1. **Connect Google Sheets** — link the Google Sheets connector to this project (one-time, uses your Google account).
2. **You create one empty Google Sheet** in your Drive (any name, e.g. "AI Tools Sales Backup"). Leave the default `Sheet1` tab — the code will create per-user tabs as needed.
3. **You paste the spreadsheet ID** (the long string in the sheet URL). I'll store it as a project secret `SALES_SHEET_ID`.

## Per-user tab convention

- Tab name = the user's email (e.g. `alice@gmail.com`). Falls back to user id if email is missing.
- Each tab gets a header row on creation:
  `id | product_name | duration_months | buyer_name | customer_name | customer_number | dealer_number | buy_price | sell_price | warranty_start | has_warranty | notes | created_at | updated_at`
- The code auto-creates the tab + headers the first time it sees a new user.

## What I'll build

- `src/lib/sheets.server.ts` — server-only helper hitting the Lovable connector gateway:
  - `ensureUserTab(email)` — checks spreadsheet metadata, creates a tab + header row if missing (cached in-memory per request)
  - `appendSaleRow(email, sale)` — append on create
  - `upsertSaleRow(email, sale)` — find row by `id` in column A, update if found, else append (used on edit)
  - `deleteSaleRow(email, id)` — find row by `id` and clear it
  - All wrapped in try/catch — Sheet failures log a warning but never fail the DB write.
- `src/lib/sales.functions.ts` — after each successful `createSale` / `updateSale` / `deleteSale`, look up the user's email via `supabaseAdmin.auth.admin.getUserById(userId)` and call the matching sheet helper.
- **Backfill server fn** `backfillSalesToSheet`:
  - Admin-only (gated by your user id, hardcoded for now — tell me if you want a roles table instead).
  - Reads all sales grouped by `user_id`, looks up each user's email, creates a tab per user, writes all their rows in one batch.
  - Exposed via a small "Sync existing data to Google Sheet" button on the Sales page (visible only to you). Safe to run multiple times — re-run replaces tab contents.

## Technical details

- Connector: `google_sheets` (gateway, no per-user OAuth needed since it's your sheet)
- Headers: `Authorization: Bearer ${LOVABLE_API_KEY}` + `X-Connection-Api-Key: ${GOOGLE_SHEETS_API_KEY}`
- Endpoints:
  - `GET /v4/spreadsheets/{id}` — list existing tabs
  - `POST /v4/spreadsheets/{id}:batchUpdate` — add new tab (`addSheet` request)
  - `GET /v4/spreadsheets/{id}/values/{tab}!A:A` — locate row by id
  - `POST .../values/{tab}:append?valueInputOption=USER_ENTERED` — append
  - `PUT .../values/{tab}!A{row}:N{row}?valueInputOption=USER_ENTERED` — update
- No DB schema changes.

## What you get

- One spreadsheet, multiple tabs (one per user), real-time mirrored.
- Existing data backfilled on demand via a button.
- App keeps working even if Google is unreachable.

## Out of scope (ask if you want later)

- Two-way sync (sheet edits → DB).
- Per-user separate spreadsheets (would need per-user Google OAuth).
- A proper admin role system (we'll hardcode your user id for the backfill button — say the word and I'll add a `user_roles` table instead).
