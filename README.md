# Business Buddy

i want to built a very small product that help me to save the my side bussiness records.
my side bussiness is like
i sell premium subscrintion to my customer at cheap rates .
i buy from i buyer and sell to my customer so what i am thinking is why dont we create a website mobile friendly where can i add my selling deatils
like
suppose i sell linkedin premium carrier 3 month than if the product is under warrenty than we can save all the deils by price selling price buyer nameand customer name
waarenty preiod
and simply i can that so this will help me to track everything.
also after the waarenty ends i can archive it and also the website home page should have a metrics where profit is been shown lifetime current month and everything.
lets plan a very simple and easy UI and than we will do backend

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ai-tools-profit.lovable.app

## Design

The UI follows the ProfitAI v3 handoff (paper background, terracotta accent, Source Serif 4
display numerals, hairline rules instead of cards). Everything visual is driven by the CSS
variables in `src/styles.css`; dark mode is the `.dark` class on `<html>`, persisted under the
`profitai-theme` localStorage key by `src/hooks/use-theme.ts`. Shared layout idioms (text tabs,
chips, segmented pills, stat rules, underline search) live in `src/components/primitives.tsx`.

### Put the server next to the database

Server functions run as Vercel serverless functions in Vercel's default region (US East)
unless told otherwise. Check your Supabase region under **Project Settings → General →
Region** and add the matching Vercel region to `vercel.json`, for example Mumbai:

```json
{ "regions": ["bom1"] }
```

(Singapore is `sin1`, US East is `iad1`.) This removes an ocean round trip from every
request.

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1a7e79b8-dadd-4434-9814-51f040fb5abe).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

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
