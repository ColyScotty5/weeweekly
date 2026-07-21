# Security Operations

## Production rollout order

1. Back up the Supabase database and confirm the target project identifier.
2. Apply `supabase/migrations/20260721120000_initial_schema.sql`, followed by
   `20260721130000_secure_auth_and_rls.sql`.
3. Run `supabase/tests/rls_security.sql` against a non-production database, then
   verify the same policy metadata in production.
4. In Supabase Auth URL Configuration, set the Site URL to
   `https://www.weeweekly.com` and allow `https://www.weeweekly.com/**` as a
   redirect URL.
5. Create administrator identities in Supabase Auth. Do not store temporary
   passwords in source, chat, tickets, or email.
6. Bootstrap the first profile through the SQL editor using the Auth user's UUID:

   ```sql
   insert into public.admin_profiles (user_id, display_name, role)
   values ('AUTH_USER_UUID', 'DISPLAY_NAME', 'super_admin');
   ```

7. Require MFA for every administrator in Supabase Auth.
8. Deploy the application only after anonymous writes have been shown to fail.

## Credential incident response

The repository historically contained plaintext passwords. Treat every password
that appeared in source or fixture data as compromised:

- reset it at the identity provider and invalidate active sessions;
- advise affected people to change the password anywhere it was reused;
- remove any legacy local-only accounts after Supabase Auth accounts are active;
- review old Supabase projects found in Git history and deactivate unused projects.

A Supabase publishable key is intentionally public. Security must come from RLS;
rotating a publishable key is not a substitute for correcting policies.

## Access model

- Anonymous visitors can read approved tournament, bracket, and leaderboard data.
- Authenticated users without an `admin_profiles` row have no mutation access.
- Administrators can manage normal tournament operations.
- Super Administrators can delete tournaments/players/events and reset draws.
- Player email addresses are not part of public or administrator data queries.

## Deployment headers

`vercel.json` defines CSP, HSTS, anti-framing, referrer, MIME-sniffing, and
permissions headers. GitHub Pages does not support repository-defined response
headers; it receives the in-document CSP and referrer policy only. Use Vercel,
Netlify, Cloudflare, or another configurable edge host when full response-header
enforcement is required.

## Required checks

Run before every deployment:

```sh
npm ci
npm run check
npm audit --audit-level=high
```

Enable the hosting provider's secret scanning and dependency alerts. Never put a
service-role key in a `VITE_*` variable or any browser bundle.

## Git history rewrite

After password rotation and a clean deployment, coordinate a maintenance window
before rewriting history. Purge historical `.env` files, `dist/`, and the removed
credential-bearing JSON files from all branches and tags. Force-pushing rewritten
`main` invalidates existing clones; every collaborator must delete or archive the
old clone and clone the repository again.

Forks and downloaded copies cannot be recalled. Credential rotation remains
mandatory even after a successful rewrite.
