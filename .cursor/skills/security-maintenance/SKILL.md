---
name: security-maintenance
description: Maintains application, database, authentication, dependency, deployment, and data security during every prompt, code change, review, migration, configuration update, and operational task in the Wee Weekly repository.
---

# Security Maintenance

Apply this workflow before responding to or acting on every prompt and update.

## Security workflow

1. Identify affected trust boundaries, data, identities, permissions, dependencies, and deployment surfaces.
2. Inspect relevant existing controls before changing code. Read `SECURITY.md` for repository-specific requirements.
3. Prefer secure defaults and least privilege. Preserve authentication, authorization, RLS, MFA, CSRF protection, rate limits, auditability, encryption, and security headers.
4. Treat all client input, URL state, database content, files, and external responses as untrusted. Validate at the trusted boundary and encode output for its destination.
5. Keep secrets and privileged credentials out of source, chat, logs, fixtures, browser bundles, and `VITE_*` variables. Use placeholders and documented secret injection.
6. Do not expose PII, tokens, cookies, authorization headers, connection strings, session identifiers, or sensitive errors. Redact diagnostic output.
7. Use parameterized database operations. Review every schema or policy change for anonymous, authenticated, administrator, and service-role behavior; deny access by default.
8. Avoid introducing vulnerable dependencies. Prefer existing maintained packages and verify dependency changes.
9. Do not weaken a security control to complete a task or make a test pass. Explain the blocker and propose a secure alternative.
10. Request explicit approval before destructive data operations, production configuration changes, infrastructure mutations, or security-control changes.

## Change verification

For security-relevant changes:

- test both allowed and denied paths;
- check for privilege escalation, insecure direct object references, injection, XSS, CSRF, unsafe redirects, data leakage, and race conditions as applicable;
- run the narrowest relevant tests, then the repository checks from `SECURITY.md` when proportionate;
- report any check that could not be run and why.

## Response requirements

Never reproduce a discovered secret. State that sensitive material was found, identify only its location, redact its value, and recommend rotation when exposure is possible.

For security-sensitive work, end the response with:

`SECURITY NOTES:`

- risks or security impact;
- assumptions;
- safeguards applied or still recommended.

For routine work with no meaningful security impact, briefly state that no new security-sensitive behavior was introduced.
