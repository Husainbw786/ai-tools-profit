# Business Buddy

A small, mobile-friendly tracker for a subscription reselling side business.

The idea is simple: subscriptions are bought from a dealer and resold to customers at
a cheaper rate than retail. Every sale records the product and plan (say *LinkedIn
Premium Career, 3 months*), the buy rate and the selling rate, the dealer and the
customer, and the warranty period it is covered for. Once a warranty ends the sale can
be archived. The dashboard adds it all up — net profit lifetime, for the current month,
and everything in between — so the whole business can be read off one screen.

## Design

The UI follows the ProfitAI v3 handoff (paper background, terracotta accent, Source Serif 4
display numerals, hairline rules instead of cards). Everything visual is driven by the CSS
variables in `src/styles.css`; dark mode is the `.dark` class on `<html>`, persisted under the
`profitai-theme` localStorage key by `src/hooks/use-theme.ts`. Shared layout idioms (text tabs,
chips, segmented pills, stat rules, underline search) live in `src/components/primitives.tsx`.
The dashboard is the one screen that uses filled surfaces: the net-profit card (`--surface-hero`,
`--surface-hero-chip`) and the 2×2 tile grid under it. WhatsApp actions use the brand green (`--whatsapp`).

### Expiring soon, and grouping active sales

The dashboard closes with **Expiring soon** (`src/components/ExpiringSoon.tsx`): warranties running
out, soonest first, inside a 7-day / 30-day / all-active window and bucketed into This week, Next
30 days and Later. Each row shows the days left as a countdown numeral (red inside three days,
amber inside a week) and a WhatsApp button that opens a renewal nudge (`buildRenewalMessage` in
`src/lib/sale-utils.ts`).

**Active sales** can be read as a flat list or folded by customer or by dealer
(`src/components/SalesGroups.tsx`). Grouped cards show the subscription count, the billed total and
anything still due; rows inside name the *other* party, since the card header already names one.

### Messaging a customer or dealer

Opening a sale and tapping **Message** shows a prefilled WhatsApp text with a
Customer / Dealer switch. The customer text is a personalised purchase confirmation
(product, plan, rate, paid or due, covered till when); the dealer text asks the dealer
to confirm supplying the item at the buy rate. Both can be edited before **Send on
WhatsApp** (opens `wa.me` with the saved number, or lets you pick the chat if none is
saved) or **Copy**. Right after a new sale is recorded, the toast offers **Confirm with
dealer**, which sends one message covering every product in that order. Templates live in
`src/lib/sale-utils.ts` (`buildCustomerConfirmationMessage`, `buildDealerOrderMessage`).

### Put the server next to the database

Server functions run as Vercel serverless functions in Vercel's default region (US East)
unless told otherwise. Check your Supabase region under **Project Settings → General →
Region** and add the matching Vercel region to `vercel.json`, for example Mumbai:

```json
{ "regions": ["bom1"] }
```

(Singapore is `sin1`, US East is `iad1`.) This removes an ocean round trip from every
request.

## Development

You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Deploy to Vercel

The app is a TanStack Start (Vite + Nitro) app. `vite.config.ts` builds it with the
Nitro `vercel` preset, so Vercel picks up the Build Output in `.vercel/output` with
no framework preset (`vercel.json` sets `framework: null`).

### Option A: Vercel dashboard (recommended)

1. In Vercel, **Add New > Project > Import** this GitHub repository.
2. Leave the framework preset as **Other**. Build command `npm run build` (from `vercel.json`).
3. Add these **Environment Variables** (Production and Preview):

   | Name                        | Value                                                        |
   | --------------------------- | ------------------------------------------------------------ |
   | `SUPABASE_URL`              | `https://<project-ref>.supabase.co`                          |
   | `SUPABASE_PUBLISHABLE_KEY`  | your `sb_publishable_...` key                                |
   | `SUPABASE_SERVICE_ROLE_KEY` | your Supabase **secret** (service role) key                  |
   | `ADMIN_USER_ID`             | (optional) your Supabase auth user id, unlocks admin actions |

   The browser-side values (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) are
   read from the committed `.env` at build time; override them in Vercel if you
   point the app at a different Supabase project.

4. Deploy. Every push to the connected branch redeploys.

### Option B: GitHub Actions

`.github/workflows/deploy-vercel.yml` deploys with the Vercel CLI. Add repository
secrets `VERCEL_TOKEN` (required) plus `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` (written to the Vercel project on each run), then run
the workflow from the Actions tab or push to `main`.

### Supabase setup

- Apply the schema: paste `supabase/scripts/schema.sql` (all migrations combined) into the
  SQL editor and run it once. Or use the Supabase CLI: `supabase db push`.
- Authentication > URL Configuration: set **Site URL** to your Vercel URL and add it
  to **Redirect URLs** so email confirmation links land on the deployed app.
- Google sign-in uses Supabase's own Google provider (Authentication > Providers).
  Email/password works out of the box.
- Restoring from the `*_backup` tables written by the old deployment's backup sync:
  create the user accounts, fill in the old-to-new id mapping at the top of
  `supabase/scripts/import_from_backup.sql`, and run it once in the SQL editor.
- Rows copied in some other way that still carry the old users' ids:
  `supabase/scripts/remap_user_ids.sql` rewrites them to the new ids.
