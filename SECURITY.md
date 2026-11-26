# Security

The app is a static site with no backend, database, accounts, or secrets. It
downloads the public Wee Weekly rankings sheet as CSV in the browser and builds
draws locally. Nothing is stored or sent anywhere else.

## Controls

- The Content-Security-Policy (`index.html`, `vercel.json`) allows network
  requests only to the site itself, `docs.google.com`, and
  `*.googleusercontent.com` (where Google redirects CSV exports).
- Sheet data is rendered as plain text through Material UI. Raw HTML injection
  (`dangerouslySetInnerHTML`) is blocked by the regression tests.
- Schedule notes go through the allowlisted rich-text parser in
  `src/lib/richText.js`.

## Required checks

Run before every deployment:

```sh
npm ci
npm run check
npm audit --audit-level=high
```

## Retired Supabase project

The app no longer uses Supabase. Pause or delete the old Supabase project and
remove the `VITE_SUPABASE_*` repository secrets from GitHub Actions. Any old
publishable or service-role keys should be revoked once the project is gone.
