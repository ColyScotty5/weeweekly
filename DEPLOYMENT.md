# Deployment Guide

Deploy the Wee Weekly app (Vite + React) as a static site. Production files live in `dist/` after `npm run build`.

The app has no backend and needs no secrets. It reads rankings straight from the
public Google Sheet in the browser.

## Recommended: GitHub Pages + custom domain

The repo includes [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml). Every push to `main` (or a manual **Run workflow**) builds the app and publishes it to GitHub Pages.

### 1. Enable GitHub Pages (Actions)

1. Repo → **Settings → Pages**
2. **Build and deployment → Source**: **GitHub Actions** (not “Deploy from a branch”)
3. Push to `main`, or run **Actions → Deploy to GitHub Pages → Run workflow**
4. Confirm the workflow succeeds; the site will be at  
   `https://<user-or-org>.github.io/<repo-name>/` until a custom domain is set

### 2. Attach your custom domain

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
4. Domain management → add your custom domain and follow DNS prompts

### Vercel

1. [vercel.com](https://vercel.com) → **Import** the GitHub repo (Vite is auto-detected)
2. Deploy; attach the domain under **Project → Settings → Domains**

### Traditional web hosting

1. Run `npm run build` locally
2. Upload the contents of `dist/` to the web root
3. Configure the server to serve `index.html` for unknown paths (SPA fallback)

## Security headers

For complete CSP, anti-framing, HSTS, referrer, and permissions headers, use a
host that supports custom response headers. `vercel.json` contains the required
header set. GitHub Pages cannot apply repository-defined response headers, so it
uses only the CSP and referrer policy embedded in `index.html`.

## SPA routing & HTTPS

- Serve `index.html` for client routes if you add path-based routing later (GitHub Pages serves the built `index.html` at `/` by default).
- Prefer HTTPS (GitHub Pages / Netlify / Vercel provide this).

## Test the production build locally

```bash
npm run build
npm run preview
```

## Troubleshooting

### Rankings fail to load
- Confirm the Google Sheet is still shared as "Anyone with the link can view"
- The Content-Security-Policy in `index.html` and `vercel.json` must allow
  `https://docs.google.com` and `https://*.googleusercontent.com` in `connect-src`

### Custom domain not working
- DNS still propagating (can take minutes to hours)
- Pages custom domain must match the DNS name exactly
- Certificate pending until DNS validates — then turn on **Enforce HTTPS**

### 404 on refresh (other hosts)
- Enable SPA rewrite: all routes → `index.html`

### Build fails in Actions
- Run `npm run build` locally first
- Ensure `package-lock.json` is committed (`npm ci` needs it)
