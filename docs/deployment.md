# Deployment

Note Scribe is a server-rendered Next.js app. It needs a host that runs Node.js functions or a Node server; it cannot be exported as a static site. Everything else (database, auth, file storage) lives in Supabase, so the host only runs the app.

## What the host must provide

| Need | Why |
| --- | --- |
| Node.js 20+ runtime for server code | Server Components, Server Actions, the proxy and route handlers |
| Functions allowed to run up to **300 s** | AI generation of a note can take 20–90 s, longer when a model is overloaded and the app falls back to another (`maxDuration = 300` on the note pages) |
| Environment variables | All secrets come from the environment; none are in the repo |
| Outbound HTTPS | Supabase, Gemini, Cloudflare Turnstile |

Nothing is stored on the host's disk, so any number of instances can run.

## Before the first deploy

1. **Supabase** → Authentication → URL Configuration: set **Site URL** to your production address and add `https://<your-domain>/auth/callback` to **Redirect URLs** (keep the localhost entry for development).
2. **Turnstile** (Cloudflare dashboard → Turnstile → your widget): add the production hostname. Use a real widget, not the test keys.
3. **Gemini**: enable billing on the key (see [security.md §6a](./security.md#6a-provider-terms-that-affect-the-plan-checked-2026-10-05)); set a billing alert and cap in Google AI Studio.
4. **Database migrations**: run them against the production database **before** the new code goes live:
   ```bash
   DIRECT_URL="<production direct url>" DATABASE_URL="<production pooled url>" pnpm db:migrate
   DIRECT_URL="<production direct url>" pnpm db:storage   # first deploy, and after any change to prisma/storage.sql
   ```
   Do this from your machine or from CI. Do not put `migrate dev` or `db push` anywhere near production.

### Environment variables

Copy every value from `.env.example`. The ones that differ between development and production:

| Variable | Production value |
| --- | --- |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | The real widget's site key |
| `CSP_ENFORCE` | `false` for the first days, then `true` once no `[csp]` reports appear in the logs |
| `AI_DAILY_REQUEST_BUDGET`, `AI_MAX_CONCURRENT`, `STORAGE_QUOTA_MB` | Match the Gemini and Supabase plans you are on |
| `GEMINI_*_MODELS` | Optional; leave unset to use the defaults |

`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_URL` and `GEMINI_API_KEY` are secrets: enter them in the host's environment settings, never in files.

## Vercel (recommended)

Vercel runs Next.js natively, and its Hobby plan allows 300-second functions, which matches the app's needs.

1. Push the repository to GitHub, GitLab or Bitbucket.
2. In Vercel, **Add New → Project**, import the repository. Vercel detects Next.js and pnpm from `pnpm-lock.yaml`. Leave the build settings as detected (`pnpm install`, `next build`).
3. **Environment Variables**: add every variable from the table above for the Production environment (and Preview if you use preview deployments; previews should point at a separate Supabase project or they will share production data).
4. **Region**: `vercel.json` pins functions to `icn1` (Seoul), next to the Supabase project in `ap-northeast-2`. If the Supabase project ever moves, change the region there (Vercel's region list: https://vercel.com/docs/regions) so database round-trips stay short. Hobby projects run in one region.
5. Deploy. The first build takes a few minutes; `postinstall` runs `prisma generate` automatically.
6. Add your custom domain under **Settings → Domains**, then update the Supabase redirect URL and Turnstile hostname to match.

### Deploying from the CLI (no Git host yet)

The repository does not need to be on GitHub to deploy. The Vercel CLI uploads the working tree (respecting `.gitignore`) and builds it on Vercel:

```bash
pnpm dlx vercel login                      # opens the browser once
pnpm dlx vercel link                       # creates or picks the project; writes git-ignored .vercel/
pnpm dlx vercel env add DATABASE_URL production   # repeat for every variable in .env.example
pnpm dlx vercel --prod                     # build and deploy to production
```

`vercel env add` prompts for the value, so secrets never land in the shell history or a file. Later deploys are the last command again. When the repo gets a Git remote, import it in the Vercel dashboard (**Settings → Git**) and pushes to `main` deploy on their own.

Notes:
- Fluid compute is on by default for new projects; it is what gives Hobby the 300 s limit.
- The Hobby plan is for personal, non-commercial projects. When the app starts earning money, move to Pro (also lifts bandwidth and function limits).
- Vercel Cron Jobs can call a route on a schedule, but the storage clean-up is a script, not a route; see [Scheduled clean-up](#scheduled-clean-up).

## Netlify

Netlify supports Next.js 16 (App Router, Server Actions, the proxy) through its OpenNext adapter with no configuration.

1. **Add new project → Import an existing project**, pick the repository. Netlify detects Next.js; build command `pnpm build`, publish directory `.next` (the adapter overrides this correctly; leave as detected).
2. Add the environment variables under **Site configuration → Environment variables**.
3. Deploy, then add your domain and update Supabase and Turnstile as above.

The one limitation that matters: **Netlify synchronous functions stop after 60 seconds**, and this cannot be raised. Most generations finish in time, but a slow or overloaded model will hit the limit and the user sees a failed generation with a Retry button. If that happens often, use Vercel or a Node host instead.

## Any Node host (Railway, Render, Fly.io, a VPS)

These run the app as a long-lived server with no function time limits.

- **Build:** `pnpm install --frozen-lockfile && pnpm build`
- **Start:** `pnpm start` (listens on `PORT`, default 3000)
- Set the environment variables in the platform.
- Put it behind HTTPS (these platforms provide it); the app sends an HSTS header, which browsers ignore on plain HTTP.

Docker example (not checked into the repo; copy it if you need it):

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
COPY prisma7.config.ts ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY --from=build /app ./
EXPOSE 3000
CMD ["pnpm", "start"]
```

Pass the environment variables at run time (`docker run --env-file`), not at build time, so secrets are not baked into the image.

## Scheduled clean-up

`pnpm storage:cleanup` deletes uploaded files that no note refers to (abandoned uploads older than a day). Run it weekly from anywhere that has the environment variables, for example a GitHub Actions workflow:

```yaml
# .github/workflows/storage-cleanup.yml
name: Storage clean-up
on:
  schedule:
    - cron: "0 3 * * 0" # Sundays 03:00 UTC
  workflow_dispatch:
jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm storage:cleanup
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

The same pattern can run `pnpm db:migrate` on every push to `main` before the host deploys, if you prefer migrations in CI.

## After deploying

1. Sign up with a real email, confirm it, upload a file and generate a note, a quiz and flashcards.
2. Check the host's logs for `[csp]` lines over the first days; when there are none, set `CSP_ENFORCE=true` and redeploy.
3. Watch the `[ai]` lines (or the `ai_usage` table) to see real usage, and adjust `AI_DAILY_REQUEST_BUDGET`.
4. Turn on backups in Supabase (daily backups are included on Pro; the free plan has none, so export the database occasionally with `pg_dump` against `DIRECT_URL`).

## Keeping it free, and what changes when it earns money

| Service | Free tier | When to upgrade |
| --- | --- | --- |
| Vercel | Hobby: personal, non-commercial use; 300 s functions | Pro once the app is commercial or traffic grows |
| Supabase | 1 GB storage, 500 MB database, 5 GB egress, pauses after 7 days of inactivity | Pro ($25/mo) for backups, no pausing, 100 GB storage; then raise `STORAGE_QUOTA_MB` |
| Gemini | Free requests per model per day, but prompts may be used by Google | Enable billing before real users; raise `AI_DAILY_REQUEST_BUDGET` |
| Cloudflare Turnstile | Free | — |

On the free tiers the app is a complete portfolio piece. The upgrade path is three plan changes and three environment variables; no code changes are required.
