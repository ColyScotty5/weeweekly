# Deployment Guide

Deploy the Wee Weekly app (Vite + React + Supabase) as a static site. Production files live in `dist/` after `npm run build`.

Before deploying, apply the versioned Supabase migrations and follow the
administrator bootstrap/credential-rotation procedure in
[`SECURITY.md`](./SECURITY.md). The application must not be deployed while
anonymous database writes are still permitted.

## Recommended: GitHub Pages + custom domain

The repo includes [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml). Every push to `main` (or a manual **Run workflow**) builds the app and publishes it to GitHub Pages.

### 1. Add Supabase secrets

Vite embeds `VITE_*` values at **build** time, so GitHub Actions needs them as repository secrets.

1. Open the repo → **Settings → Secrets and variables → Actions**
2. Add:
   - `VITE_SUPABASE_URL` — e.g. `https://xxxx.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` — preferred (Supabase publishable / anon key)
   - *(optional)* `VITE_SUPABASE_ANON_KEY` — only if you still use the older name locally

Get values from Supabase → **Project Settings → API**.

### 2. Enable GitHub Pages (Actions)

1. Repo → **Settings → Pages**
2. **Build and deployment → Source**: **GitHub Actions** (not “Deploy from a branch”)
3. Push to `main`, or run **Actions → Deploy to GitHub Pages → Run workflow**
4. Confirm the workflow succeeds; the site will be at  
   `https://<user-or-org>.github.io/<repo-name>/` until a custom domain is set

### 3. Attach your custom domain

1. Still under **Settings → Pages**, set **Custom domain** to your domain (e.g. `weeweekly.example.com`) and save
2. At your DNS provider, point the domain at GitHub:

   | Host | Type | Value |
   |---|---|---|
   | `www` (or subdomain) | `CNAME` | `<user-or-org>.github.io` |
   | apex (`example.com`) | `A` / `AAAA` | Use the IPs GitHub shows on the Pages settings page |

3. Wait for DNS + GitHub’s certificate check, then enable **Enforce HTTPS**
4. With a custom domain, the app is served from `/` — no Vite `base` path change is required

### Local vs GitHub Pages base path

| Hosting | Vite `base` |
|---|---|
| Custom domain (recommended) | `/` (default — already correct) |
| Project URL only (`username.github.io/repo/`) | Set `base: '/repo/'` in `vite.config.js` |

## Other hosts (also Git-connected)

### Netlify

1. [netlify.com](https://netlify.com) → **Add new site → Import an existing project** → connect GitHub
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Site settings → **Environment variables**: same `VITE_SUPABASE_*` keys as above
5. Domain management → add your custom domain and follow DNS prompts

### Vercel

1. [vercel.com](https://vercel.com) → **Import** the GitHub repo (Vite is auto-detected)
2. Add the same `VITE_SUPABASE_*` environment variables
3. Deploy; attach the domain under **Project → Settings → Domains**

### Traditional web hosting

1. Run `npm run build` locally (with a production `.env` present)
2. Upload the contents of `dist/` to the web root
3. Configure the server to serve `index.html` for unknown paths (SPA fallback)

## Environment variables

### Local development

Create `.env` in the project root (gitignored):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
```

`VITE_SUPABASE_ANON_KEY` is still accepted as a fallback. Restart the dev server after changing `.env`.

### Production

| Platform | Where to set |
|---|---|
| GitHub Pages | Repo **Actions** secrets (see above) |
| Netlify / Vercel | Project environment variables, then redeploy |

**Security:** The publishable/anon key is meant for the browser and must be protected by Supabase **RLS**. Never commit `.env` or service-role keys.

For complete CSP, anti-framing, HSTS, referrer, and permissions headers, use a
host that supports custom response headers. `vercel.json` contains the required
header set. GitHub Pages cannot apply repository-defined response headers, so it
uses only the CSP and referrer policy embedded in `index.html`.

## SPA routing & HTTPS

- Serve `index.html` for client routes if you add path-based routing later (GitHub Pages serves the built `index.html` at `/` by default).
- Prefer HTTPS (GitHub Pages / Netlify / Vercel provide this). Needed for secure cookies and modern browser APIs when talking to Supabase.

## Test the production build locally

```bash
npm run build
npm run preview
```

## Troubleshooting

### White screen / failed API calls
- Confirm Actions secrets (or host env vars) are set and the workflow rebuilt after adding them
- Check the browser console for missing Supabase URL/key or RLS errors

### Custom domain not working
- DNS still propagating (can take minutes to hours)
- Pages custom domain must match the DNS name exactly
- Certificate pending until DNS validates — then turn on **Enforce HTTPS**

### 404 on refresh (other hosts)
- Enable SPA rewrite: all routes → `index.html`

### Build fails in Actions
- Run `npm run build` locally first
- Ensure `package-lock.json` is committed (`npm ci` needs it)
