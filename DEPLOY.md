# Deploying to Vercel (via GitHub)

This app is a Vite + React SPA whose data lives in Convex. The web app deploys
to Vercel as static files; Convex runs separately at convex.cloud and the web
app talks to it over `VITE_CONVEX_URL`.

## 1. Push the project to GitHub

Vly manages version control — export/sync the project to a GitHub repository
from the Vly project page (Publish → GitHub). Make sure the repo includes
`src/convex/_generated/` (it is no longer gitignored) since the Vercel build
runs `tsc -b` before `vite build` and needs those generated types.

## 2. Import the repo into Vercel

1. Go to vercel.com → **Add New… → Project** and pick the GitHub repo.
2. Vercel auto-detects Vite via `vercel.json` (framework: `vite`,
   install: `bun install`, build: `bun run build`, output: `dist`).
3. Do **not** deploy yet — set the environment variables first.

## 3. Create a production Convex deployment

```bash
bunx convex deploy --prod --yes
```

This provisions a production backend at `https://<name>.convex.cloud` and
prints the URL. Note the `VITE_CONVEX_URL` value it outputs.

## 4. Set environment variables in Vercel

Project → Settings → Environment Variables (Production and Preview):

| Variable          | Value                                   |
| ----------------- | --------------------------------------- |
| `VITE_CONVEX_URL` | `https://<your-prod-deployment>.convex.cloud` |

Optional backend keys (Stripe payments) are set on the **Convex** side, not
Vercel:

```bash
bunx convex env set STRIPE_SECRET_KEY sk_test_... --prod
```

## 5. Point Convex Auth at the Vercel domain

The auth config reads the app origin from `CONVEX_SITE_URL` (a Convex env
var). Set it to your Vercel URL so sign-in works from production:

```bash
bunx convex env set CONVEX_SITE_URL https://your-app.vercel.app --prod
bunx convex deploy --prod --yes   # re-push so the new value takes effect
```

If you add a custom domain in Vercel later, update `CONVEX_SITE_URL` again.

## 6. Deploy

Click **Deploy** in Vercel (or push to the connected branch). Every push
rebuilds and redeploys automatically.

## Notes

- **SPA routing** — `vercel.json` rewrites all paths to `/index.html`, so
  `/dashboard`, `/checkout/return`, etc. resolve correctly on refresh.
- **Caching** — hashed `/assets/*` get immutable long-term caching; `sw.js`
  is always revalidated so PWA updates land promptly.
- **Preview code** — the Vly toolbar/dev overlay and route-sync bridge only
  activate inside the preview iframe (`window.parent !== window`, `.vly.sh`
  hosts); they are inert on Vercel.
- **Service worker** — registered only in production builds
  (`import.meta.env.PROD`), including on Vercel.
- If sign-in loops on production, the usual cause is a stale
  `CONVEX_SITE_URL` (step 5) not matching the deployed origin.
