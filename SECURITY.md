# Beespo Security

**Last updated**: 2026-05-08
**Owner**: Bishopric Technologies LLC
**Contact**: security@beespo.com (general: support@beespo.com)

This document describes Beespo's security posture, controls, and operational
practices. It is intended to give partners (Zoom, Google, integrators), enterprise
prospects, and our own engineers a single, accurate picture of how we protect
customer data.

We are **not** SOC 2 certified. Where industry-standard practices apply, we
follow them and document them here. Where we have known gaps, they are listed in
the [Roadmap](#16-roadmap--known-gaps) — we believe transparency about gaps is
itself a security control.

---

## Table of Contents

1.  [Overview & Threat Model](#1-overview--threat-model)
2.  [Security Architecture](#2-security-architecture)
3.  [Authentication & Identity](#3-authentication--identity)
4.  [Authorization & Access Control](#4-authorization--access-control)
5.  [Data Protection](#5-data-protection)
6.  [Input Validation & Injection Prevention](#6-input-validation--injection-prevention)
7.  [API & Network Security](#7-api--network-security)
8.  [Third-Party Integrations (Zoom, Google, etc.)](#8-third-party-integrations-zoom-google-etc)
9.  [Dependency & Supply Chain Security](#9-dependency--supply-chain-security)
10. [Logging, Monitoring & Incident Response](#10-logging-monitoring--incident-response)
11. [Vulnerability Management](#11-vulnerability-management)
12. [Privacy & Data Subject Rights](#12-privacy--data-subject-rights)
13. [Subprocessors](#13-subprocessors)
14. [Secure SDLC](#14-secure-sdlc)
15. [OWASP Top 10 (2021) Self-Assessment](#15-owasp-top-10-2021-self-assessment)
16. [Roadmap & Known Gaps](#16-roadmap--known-gaps)
17. [Reporting Vulnerabilities](#17-reporting-vulnerabilities)
18. [Appendix A — Zoom Marketplace Pre-Integration Checklist](#appendix-a--zoom-marketplace-pre-integration-checklist)
19. [Appendix B — Google OAuth Verification Pre-Integration Checklist](#appendix-b--google-oauth-verification-pre-integration-checklist)

---

## 1. Overview & Threat Model

**What Beespo does**: Beespo is a workspace for ward bishopric leadership to
plan sacrament meetings, manage callings, run discussions, and assign tasks.

**Sensitive data we handle**:

- User identity (name, email, password hash, MFA secret).
- Workspace / organization data (members, roles, calling assignments).
- Meeting agendas, business items, announcements, speaker assignments.
- Free-text notes that may include sensitive pastoral information about
  individuals (e.g., calling discussions, personal circumstances).
- OAuth tokens for third-party integrations *(reserved for future Zoom / Google
  integrations; not currently in scope — see §8)*.

**Threats we explicitly defend against**:

- Account takeover (credential stuffing, password reuse, phishing of session
  tokens, weak passwords).
- Cross-tenant data leakage (one workspace reading another's data).
- Privilege escalation within a workspace (viewer → admin).
- Injection (SQL, XSS, command, SSRF, open-redirect).
- Brute-forcing of invite codes (Beespo is invite-only).
- Token theft via insecure storage or transit.
- Supply-chain compromise via dependencies.
- Denial-of-service against authentication and invite endpoints.

**Threats outside our current scope** (handled by infrastructure providers, see
§13):

- L3/L4 DDoS — Vercel edge + planned Cloudflare.
- Database-level encryption at rest — Supabase / AWS managed.
- Physical / hardware security — AWS, Vercel, Upstash data centers.

---

## 2. Security Architecture

```
                   ┌────────────────────────────────────────────┐
                   │             End user (browser)              │
                   └──────────────────┬─────────────────────────┘
                                      │ HTTPS only (TLS 1.2+, HSTS-eligible)
                                      ▼
                   ┌────────────────────────────────────────────┐
                   │     Vercel Edge (DDoS, edge cache, CSP)     │
                   └──────────────────┬─────────────────────────┘
                                      │
                                      ▼
   ┌──────────────────────────────────────────────────────────────┐
   │  Next.js 15 App Router (server components, API routes)        │
   │  - Middleware: session refresh + route guards                 │
   │  - Sentry instrumentation (server + edge + client)             │
   └────────┬───────────────────┬───────────────────┬──────────────┘
            │                   │                   │
            ▼                   ▼                   ▼
   ┌────────────────┐  ┌──────────────┐  ┌────────────────────┐
   │   Supabase     │  │   Resend     │  │   Upstash Redis    │
   │  Postgres+Auth │  │  (email)     │  │  (rate limiting)   │
   │  RLS on every  │  │  TLS, DKIM   │  │  Distributed       │
   │  table         │  │  pending     │  │  fixed-window      │
   └────────────────┘  └──────────────┘  └────────────────────┘
```

**Key design properties**:

- The browser never sees a Supabase service-role key. Service-role usage is
  confined to specific server-side admin paths (`src/lib/supabase/admin.ts`).
- All cross-tenant access control is enforced in the database via Postgres
  Row-Level Security (RLS), not in application code. RLS is on by default; a
  developer cannot accidentally write a query that crosses tenants.
- Authentication state is in HTTP-only, secure, SameSite cookies managed by
  `@supabase/ssr`, refreshed on every request via middleware
  (`src/lib/supabase/middleware.ts`).

---

## 3. Authentication & Identity

### 3.1 Sign-up

- **Invite-only**. New accounts require a valid `BEE-XXXXXX` platform invite
  code, validated and atomically consumed via the Postgres RPC
  `validate_and_consume_invite_code`. See `src/app/api/platform-invitations/`.
- Email confirmation is required before sign-in (`/auth/confirm` route).
- Workspace invitations use single-use, expiring tokens stored in
  `workspace_invitations` (status: `pending` / `accepted` / `expired` /
  `revoked`).

### 3.2 Sign-in

- Email + password (Supabase Auth) and optional Google OAuth (gated behind
  `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` flag).
- Password storage is delegated to Supabase Auth — bcrypt-hashed, never in
  plaintext, never in our application logs.
- **Password policy**: minimum 8 characters at the application layer
  (`src/app/(auth)/signup/page.tsx`, `reset-password/page.tsx`). Supabase
  enforces additional checks server-side. Common-password / breach-corpus
  enforcement is on the [Roadmap](#16-roadmap--known-gaps).
- **Server-side wrapping** (`src/lib/actions/auth-actions.ts`): the form
  submits to a Next.js server action that verifies a Cloudflare Turnstile
  token, applies per-IP and per-email rate limits via Upstash Redis, then
  calls Supabase Auth. The browser does not call Supabase Auth directly.
- **Generic errors**: invalid-credentials and rate-limit responses use
  identical messages to defeat email enumeration (a different message would
  let an attacker probe for valid emails).
- **Failed-login security notice**: when a sign-in attempt fails, we send
  the address-of-record a "suspicious sign-in attempts" email pointing at
  the password reset flow and recommending MFA. Debounced via Upstash to
  one email per address per hour so a sustained attack does not spam the
  legitimate user.
- Failed sign-in attempts are throttled by Supabase Auth, by Upstash Redis
  (per-IP + per-email), and by Cloudflare's edge rate-limit rule.

### 3.2.1 Account Enumeration Defenses

These three flows return identical responses regardless of whether the
queried email is registered, so an attacker cannot use them to probe the
user list:

- **Login**: invalid email and invalid password produce the same error
  message and same status code.
- **Signup**: an existing email returns the same "check your email"
  response a fresh signup would; the legitimate owner of an existing
  address can recover via the forgot-password flow.
- **Forgot password**: always returns success regardless of whether the
  email exists. UI message reads "If an account exists for that email, a
  reset link has been sent."

### 3.3 Multi-Factor Authentication

- TOTP-based MFA via Supabase Auth (`src/lib/mfa.ts`,
  `src/app/(auth)/mfa/{setup,verify}`).
- AAL2 (Authentication Assurance Level 2) is enforced at the dashboard layout
  for any user enrolled in MFA, including users in workspaces that require MFA
  workspace-wide.
- "Trusted device" cookies expire and are signed; revocation is immediate via
  `revokeTrustedDevice()`.

### 3.4 Session Management

- Session tokens issued by Supabase Auth. Stored in HTTP-only, Secure,
  SameSite=Lax cookies.
- Refreshed on every server request via Next.js middleware
  (`src/middleware.ts` → `updateSession`).
- Session timeouts: configurable in Supabase project (default 1 hour access
  token, 7-day refresh token rotation).
- Sign-out clears local session immediately; server invalidation via
  `supabase.auth.signOut()`.

### 3.5 Password Reset

- Reset links generated by Supabase admin client, delivered via Resend.
- One-time-use tokens, time-limited.
- Reset page (`/reset-password`) verifies session before allowing password
  update.
- Open-redirect protection: any `next` parameter is validated through
  `safeInternalPath()` (`src/app/auth/callback/route.ts`,
  `src/app/auth/confirm/route.ts`).

### 3.6 Account Deletion / Soft-Delete

- Profiles carry an `is_deleted` flag. Deleted accounts are blocked at sign-in
  (`src/app/(auth)/login/login-client.tsx`) and at the auth callback
  (`src/app/auth/callback/route.ts`).
- Hard-delete on user request: see [§12 Privacy](#12-privacy--data-subject-rights).

---

## 4. Authorization & Access Control

### 4.1 Roles

Five roles, defined in `src/lib/auth/role-permissions.ts`:

| Role        | Edit | Manage | Owner | Notes                              |
|-------------|:----:|:------:|:-----:|------------------------------------|
| `owner`     |  ✓   |   ✓    |   ✓   | One per workspace                  |
| `admin`     |  ✓   |   ✓    |       | Full workspace admin               |
| `editor`    |  ✓   |        |       | Can edit content                   |
| `commenter` |      |        |       | Read + comment only                |
| `viewer`    |      |        |       | Read only                          |

Role checks centralized via `canEdit()` and `canManage()` helpers — application
code never inlines string comparisons against role names.

### 4.2 Row-Level Security (RLS)

- **RLS is enabled on every table** in the production schema (verified at the
  baseline migration `supabase/migrations/0000_production_baseline.sql`: 63
  tables, 63 RLS-enabled).
- Policies enforce: a user can only read/write rows belonging to their own
  workspace, with role-appropriate operations.
- The Supabase service-role key bypasses RLS and is **never** exposed to the
  browser. Server-side use is limited to admin operations (invite handling,
  user creation flows) in `src/lib/supabase/admin.ts`.

### 4.3 Server-Side Action Guards

- Every server action under `src/lib/actions/*` calls `supabase.auth.getUser()`
  and rejects unauthenticated callers before performing work.
- Mutations check workspace membership and role via the RLS policies that
  back the underlying tables.

### 4.4 System Administrator Role (`is_sys_admin`)

- A separate boolean on `profiles` for platform-level operators.
- The dedicated admin console UI was descoped from v1; the role itself is
  retained for future use and is gated behind MFA + AAL2 by design.

---

## 5. Data Protection

### 5.1 Encryption in Transit

- **All client traffic over HTTPS**. TLS terminated at Vercel edge. Vercel
  enforces TLS 1.2+ by default. HSTS recommended at DNS + edge layer
  ([roadmap](#16-roadmap--known-gaps) — currently relying on browser HSTS
  preload list via Vercel hostnames).
- Internal traffic (Vercel ↔ Supabase, Vercel ↔ Resend, Vercel ↔ Upstash) is
  TLS by default; we do not disable certificate verification anywhere.

### 5.2 Encryption at Rest

- **Database**: Supabase Postgres on AWS RDS — AES-256 at rest by AWS managed
  keys.
- **Backups**: Supabase automated daily backups, retained per Supabase plan
  policy. Encrypted at rest.
- **Application secrets**: stored in Vercel environment variables, encrypted at
  rest. Never committed to git (verified by `.gitignore` for `.env*`).
- **Future OAuth tokens** (Zoom / Google integrations): when re-introduced, will
  be encrypted application-side with AES-256-GCM before storage. The encryption
  utility (`src/lib/encryption.ts`) was removed from v1 alongside the Zoom
  integration; it must be reinstated as a precondition of those integrations
  shipping. See [Appendix A](#appendix-a--zoom-marketplace-pre-integration-checklist).

### 5.3 Secrets Management

- Production secrets live exclusively in Vercel environment variables, scoped
  by environment (Production / Preview / Development).
- No secret is stored in the repo, logs, or client bundle.
- Public Supabase anon/publishable key is browser-safe by Supabase design (RLS
  enforces all access).
- Service-role key, Resend API key, encryption keys, OAuth client secrets,
  webhook secrets: server-side only.
- Secret rotation cadence: documented at minimum annually and immediately on
  suspected exposure ([roadmap](#16-roadmap--known-gaps) for automation).

### 5.4 Data Classification & Retention

| Class                  | Examples                                  | Retention                              |
|------------------------|-------------------------------------------|----------------------------------------|
| Authentication         | password hash, MFA secret, session tokens | Lifetime of account; deleted on close  |
| Identity               | email, name, role                         | Lifetime of account                    |
| Workspace content      | meetings, callings, announcements, tasks  | Lifetime of workspace                  |
| Logs (Sentry)          | stack traces, request metadata            | 90 days (Sentry retention)             |
| Logs (Vercel)          | request logs                              | Per Vercel plan (typically 1–30 days)  |
| Email logs (Resend)    | delivery metadata                         | Per Resend retention policy            |
| Backups                | Postgres snapshots                        | Per Supabase plan                      |

PII is **not** logged in application logs by design. `sendDefaultPii: false` is
set in all Sentry configs (`sentry.server.config.ts`, `sentry.edge.config.ts`,
`src/instrumentation-client.ts`).

---

## 6. Input Validation & Injection Prevention

### 6.1 SQL Injection

- **All database access goes through the Supabase JS client**, which uses
  parameterized queries via PostgREST. We do not concatenate strings into SQL.
- Where raw RPCs are used (`validate_and_consume_invite_code`), the Postgres
  function takes typed parameters; the call site never interpolates user input
  into SQL.
- Periodic grep audit: searches for `.raw(`, template-string SQL, and
  `supabase.rpc` confirm no unsafe patterns at this writing.

### 6.2 Cross-Site Scripting (XSS)

- React's default rendering escapes all string output.
- We do **not** use `dangerouslySetInnerHTML` for user-provided content. The
  one rich-text surface (TipTap-based note editing) sanitizes via TipTap's
  built-in schema enforcement; output is rendered as React tree, never raw HTML.
- Email templates that interpolate user input (e.g., inviter name, workspace
  name) HTML-escape the values before insertion. *(Verify pre-launch:
  `src/lib/email/send-invite-email.ts` — currently template-literal-based;
  recommend explicit escape function.)*
- **Content Security Policy** (`next.config.ts`):
  - `default-src 'self'`
  - `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.vercel.com https://*.sentry.io`
  - `style-src 'self' 'unsafe-inline'`
  - `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io`
  - `object-src 'none'`, `base-uri 'self'`
  - **Known limitation**: `'unsafe-inline'` and `'unsafe-eval'` are required
    for Next.js dev/runtime; tightening to nonce-based CSP is on the
    [roadmap](#16-roadmap--known-gaps).

### 6.3 Cross-Site Request Forgery (CSRF)

- Auth cookies are `SameSite=Lax`, which blocks cross-origin POST cookies on
  default form submissions.
- State-changing API routes require an authenticated session; an attacker
  cannot forge a request from another origin without the user's cookie.
- For especially sensitive operations (account deletion, workspace ownership
  transfer), explicit re-authentication is on the [roadmap](#16-roadmap--known-gaps).

### 6.4 Server-Side Request Forgery (SSRF)

- The only server-side outbound fetch driven by user input is the link-preview
  endpoint (`src/app/api/link-preview/route.ts`). It is **hard-locked to a
  single allow-listed host** (`www.churchofjesuschrist.org`), HTTPS-only, with
  a 6-second timeout and 200 KB response cap.
- Webhook receivers (planned for Zoom integration re-introduction) will require
  signature verification before any outbound call — see [§8](#8-third-party-integrations-zoom-google-etc).

### 6.5 Open Redirect

- Any `next` / `redirect` query parameter that influences a `Location` header is
  validated through `safeInternalPath()` (defined in `src/app/auth/callback/route.ts`,
  `src/app/auth/confirm/route.ts`, `src/app/(auth)/login/login-client.tsx`,
  `src/app/(auth)/signup/page.tsx`). The validator rejects:
  - Non-string / empty values
  - Values not starting with `/`
  - Protocol-relative URLs (`//evil.com`)
  - Backslash-prefixed URLs (`/\evil.com`)

### 6.6 File Upload

- Beespo does **not** currently accept file uploads from end users. PDF
  generation is server-side via `@react-pdf/renderer`; no user-supplied bytes
  are processed.
- When file upload is added, expected controls: MIME sniffing, size limits,
  virus scanning, Supabase Storage with RLS, signed URLs only.

### 6.7 Mass Assignment

- Server actions explicitly destructure expected fields; we do not pass full
  request bodies into Supabase inserts/updates.
- Database columns considered sensitive (`is_sys_admin`, `is_deleted`,
  `workspace_id`, `role`) are **not** writable from any client-side form path —
  RLS policies block writes that would change them.

### 6.8 IDOR (Insecure Direct Object Reference)

- All resource lookups by ID go through Supabase queries that are filtered by
  RLS to the user's own workspace. An attacker substituting a different ID
  receives an empty result, not someone else's data.

---

## 7. API & Network Security

### 7.1 HTTP Headers

Set globally via `next.config.ts`:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy: …` (see §6.2)

Set at the Cloudflare edge:

- `Strict-Transport-Security: max-age=15552000; includeSubDomains` (HSTS)
- `Always Use HTTPS` redirect
- TLS 1.2 minimum

[Roadmap](#16-roadmap--known-gaps): add `Permissions-Policy`,
`X-Frame-Options: DENY`, and `Cross-Origin-Opener-Policy: same-origin`.

### 7.2 CORS

- Supabase enforces CORS at its API gateway based on configured allowed
  origins.
- Our own API routes are same-origin only — there is no `Access-Control-Allow-*`
  header set on any `src/app/api/*` route, which means cross-origin browsers
  cannot read responses.

### 7.3 Rate Limiting

Layered: Cloudflare edge → Upstash application layer.

**Cloudflare edge** (`security/cloudflare-rules.md`):

- One rate-limit rule covering all auth + invite paths: 20 req/min/IP, block 10 min.
- Five custom WAF rules: scanner block, non-app path block, empty-UA-on-auth block, bot challenge on auth, hosting-ASN challenge on auth.

**Upstash Redis application layer** (`src/lib/rate-limiter.ts`):

| Endpoint | Per-IP limit | Per-email limit |
|---|---|---|
| `loginAction` | 10 / 1 min | 5 / 15 min |
| `signupAction` | 5 / 1 min | 3 / 60 min |
| `forgotPasswordAction` | 5 / 1 min | 3 / 60 min |
| `POST /api/platform-invitations/validate` | 10 / 1 min | — |
| `POST /api/platform-invitations/consume` | 5 / 1 min | — |
| `POST /api/workspace-invitations/validate` | 10 / 1 min | — |
| `POST /api/invitations/accept` | 10 / 1 min | — |

The per-email axis is the key defense against rotating-IP credential stuffing
that would otherwise slip past per-IP-only rate limiting.

Falls back to per-instance in-memory limiter (with prod warning) when Upstash
credentials are not configured. Cloudflare protections continue to apply
regardless.

### 7.4 Authentication on API Routes

- Every API route under `src/app/api/*` that mutates state calls
  `supabase.auth.getUser()` and returns 401 if unauthenticated.
- Public endpoints (`/api/platform-invitations/validate`, `/api/health`) are
  unauthenticated by design and rate-limited.

### 7.5 Health Endpoint

- `GET /api/health` returns `{ status: "ok", timestamp }`. No internal state,
  no DB query, no PII. Cache-Control: `no-store`. Suitable for uptime monitors
  and load-balancer health checks.

---

## 8. Third-Party Integrations (Zoom, Google, etc.)

> **Status**: Zoom and Google Calendar integrations are **descoped from v1** and
> have been removed from the codebase. This section describes the security
> requirements that **must be re-implemented** before re-introducing those
> integrations, and the contractual commitments we will make to those partners.

### 8.1 OAuth Token Handling

When integrations are re-introduced:

- Tokens (access + refresh) **must** be encrypted with AES-256-GCM before
  storage, using a key from `ENCRYPTION_KEY` env var. The encryption module
  (`src/lib/encryption.ts`, removed in cleanup) must be reinstated and verified.
- Tokens **must not** appear in any log, Sentry breadcrumb, or error message.
- Refresh tokens rotate on every refresh; old refresh tokens are explicitly
  invalidated.
- Tokens are **never** sent to the browser. All third-party API calls happen
  server-side.

### 8.2 OAuth Scope Minimization

- Beespo will request the **narrowest scopes** that satisfy each user-facing
  feature, and document each scope's justification per Google CASA / Zoom
  Marketplace requirements.
- Scope expansion requires re-consent.
- "Limited Use" disclosure for Google (where applicable) will be added to the
  privacy policy and OAuth consent screen.

### 8.3 Webhook Security

- All inbound webhooks (Zoom event callbacks, Google push notifications) **must**
  verify provider signatures before any side-effect:
  - Zoom: HMAC-SHA256 of payload using `ZOOM_WEBHOOK_SECRET_TOKEN`, compared
    constant-time against `x-zm-signature` header. Plus URL-validation challenge
    response per Zoom's spec.
  - Google: validate JWT signature against Google's public keys for push
    notifications.
- Reject requests older than 5 minutes (replay protection).

### 8.4 Disconnect / Token Revocation

- Users will be able to disconnect any integration from Settings →
  Integrations. Disconnect:
  - Calls the provider's token revocation endpoint.
  - Deletes the encrypted token row from our database immediately.
  - Records the revocation in our audit log.

### 8.5 Data Use Disclosure

The privacy policy (`src/app/(legal)/privacy/page.tsx`) will be updated **before**
any integration ships to disclose:

- What provider data we receive.
- What we use it for.
- That we do **not** sell or transfer it.
- That we delete it on disconnect.
- The Limited Use commitment (Google) where applicable.

---

## 9. Dependency & Supply Chain Security

### 9.1 Dependency Pinning

- All direct dependencies pinned to caret-major versions in `package.json`.
- `package-lock.json` committed and required for reproducible installs.
- Notable explicit overrides for security:
  - `postcss >= 8.5.10` (resolves GHSA-qx2v-qp2m-jg93 XSS).

### 9.2 Vulnerability Scanning

- `npm audit` is run on every dependency change; current state: **0
  vulnerabilities**.
- GitHub Dependabot is enabled for the repository (security + version updates)
  *(verify enabled before partner submission)*.
- `npm audit fix` is the first response to any new advisory; manual
  verification before merge.

### 9.3 Build & Deploy

- Production builds run on Vercel with isolated build containers.
- Source maps uploaded to Sentry only (not exposed publicly via static asset
  routes).
- No `postinstall` scripts execute untrusted code.

### 9.4 Code Provenance

- Single repository, single source of truth.
- All commits signed-off; PR-based merges.
- Co-authored commits acknowledge AI assistance per organizational policy.

---

## 10. Logging, Monitoring & Incident Response

### 10.1 Application Logs

- Errors captured by Sentry (server, edge, client) — see
  `sentry.server.config.ts`, `sentry.edge.config.ts`,
  `src/instrumentation-client.ts`, `src/app/global-error.tsx`,
  `src/app/error.tsx`, `src/app/(dashboard)/error.tsx`.
- `sendDefaultPii: false` across all Sentry configs.
- `tracesSampleRate: 0.05` (5% performance sampling) keeps cost contained
  while preserving incident-detection signal.
- `replaysSessionSampleRate: 0.1` (10% session replays) — review pre-launch:
  whether session replay introduces privacy concerns we need to disclose.

### 10.2 Audit Logs

- The `share_activity_log` table records share-related state changes.
- A general-purpose audit log for security-relevant events (sign-in success/fail,
  MFA enroll/disable, role changes, invitation accept/revoke, token
  revocation) is on the [roadmap](#16-roadmap--known-gaps) — **required before
  partner submission** for full traceability.

### 10.3 Infrastructure Logs

- Vercel: access logs and function logs available via the Vercel dashboard.
- Supabase: query logs and auth logs available via the Supabase dashboard.
- Resend: email delivery logs available via the Resend dashboard.

### 10.4 Incident Response

**Detection**: Sentry alerts on error-rate spikes; Upstash console alerts on
quota; Vercel observability for traffic anomalies.

**Triage tiers**:

- **P0** (data exposure, account takeover, integrity loss): immediate response,
  customer notification within 24 hours, post-mortem within 7 days.
- **P1** (degraded service, suspected breach, suspected misuse): response
  within 4 business hours.
- **P2** (vulnerability disclosure, low-impact bug): response within 5 business
  days.

**Roles**: as a small team, the on-call engineer is the incident commander.
External counsel is engaged for any incident with regulatory implications.

**Customer notification**: any confirmed unauthorized access to customer data
triggers individual notification to affected users via email within 72 hours,
in line with GDPR Article 33/34 timing where applicable.

A formal incident response runbook with tabletop exercises is on the
[roadmap](#16-roadmap--known-gaps).

### 10.5 Backup & Recovery

- Supabase performs automated daily backups of the production database.
- Recovery procedure: documented at <https://supabase.com/docs/guides/platform/backups>;
  point-in-time recovery available on Pro plan.
- Backup restoration is tested ad-hoc; quarterly drills are on the
  [roadmap](#16-roadmap--known-gaps).
- RPO target: 24 hours. RTO target: 4 hours. *(These are aspirational targets;
  actual measured values will be added after the first DR drill.)*

---

## 11. Vulnerability Management

- **Patching SLA**: Critical CVEs in dependencies are patched within 7 days of
  public disclosure. High within 30 days. Medium / Low at the next regular
  release cycle.
- `npm audit` runs locally and in CI before any merge.
- Dependabot PRs are reviewed weekly.
- **Pre-launch security review**: a documented review combining automated
  tooling (OWASP ZAP, Snyk, Semgrep, Mozilla Observatory, SSL Labs, Supabase
  Security Advisor) and a focused external reviewer engagement (4–8 hours,
  OWASP ASVS Level 1 scope). Reports archived under `security/audits/`.
  This is the appropriate level of assurance for an app at our stage and
  satisfies Zoom self-attestation and Google CASA Tier 1/2 requirements.
- **Full third-party penetration test**: deferred until revenue or enterprise
  customer commitments justify the spend ($8K–15K). Tracked in [§16](#16-roadmap--known-gaps).
- Bug bounty / vulnerability disclosure: see [§17](#17-reporting-vulnerabilities).

---

## 12. Privacy & Data Subject Rights

- Privacy Policy: `src/app/(legal)/privacy/page.tsx`, public at
  <https://beespo.com/privacy>.
- Terms of Use: `src/app/(legal)/terms/page.tsx`, public at
  <https://beespo.com/terms>.

### 12.1 Data Subject Requests

A user may request the following by emailing **support@beespo.com** with their
account email:

- **Access**: a copy of their personal data we hold.
- **Correction**: changes to inaccurate data (most fields self-serve in
  Settings).
- **Deletion**: full removal of their account and associated personal data.
  Soft-delete is performed immediately (`is_deleted = true`); hard-delete
  follows within 30 days, subject to legal retention requirements.
- **Portability**: export of their data in machine-readable form.

A self-serve "Download my data" / "Delete my account" flow in Settings is on
the [roadmap](#16-roadmap--known-gaps).

### 12.2 Cookies

Beespo uses session cookies for authentication only. No tracking, advertising,
or analytics cookies are used. (See `/privacy` §6.)

### 12.3 Children's Data

Beespo is not directed to children under 13. We do not knowingly collect
personal information from children under 13.

### 12.4 International Transfers

Data is stored in AWS regions selected by Supabase and Vercel — primarily
`us-east-1`. Customers outside the US should review the Privacy Policy and
contact us with specific data-residency requirements.

---

## 13. Subprocessors

The following third parties process customer data on our behalf:

| Subprocessor      | Purpose                          | Region(s)   | DPA / Privacy                                                           |
|-------------------|----------------------------------|-------------|-------------------------------------------------------------------------|
| Vercel, Inc.      | Application hosting, edge, logs  | US          | <https://vercel.com/legal/privacy-policy> · DPA on request               |
| Supabase, Inc.    | Database, authentication, storage| US (AWS)    | <https://supabase.com/privacy> · <https://supabase.com/legal/dpa>        |
| Functional Software, Inc. (Sentry) | Error monitoring | US          | <https://sentry.io/legal/privacy/>                                      |
| Resend, Inc.      | Transactional email delivery     | US          | <https://resend.com/legal/privacy-policy>                               |
| Upstash, Inc.     | Rate-limiting Redis (no PII)     | US (AWS)    | <https://upstash.com/trust/privacy.pdf>                                 |
| Atlassian, Inc.   | Support ticketing (Jira)         | US          | <https://www.atlassian.com/legal/privacy-policy>                         |

We will publish a current subprocessor list at <https://beespo.com/subprocessors>
and notify customers in advance of any new subprocessor that processes personal
data ([roadmap](#16-roadmap--known-gaps)).

---

## 14. Secure SDLC

- **Source control**: GitHub, branch protection on `main`, all changes via PR.
- **Code review**: every PR reviewed before merge.
- **Type safety**: TypeScript strict mode (`tsconfig.json`); `tsc --noEmit`
  must pass before merge.
- **Linting**: ESLint via `next lint`; must pass with zero warnings.
- **Pre-merge checks** (currently manual; CI codification on the
  [roadmap](#16-roadmap--known-gaps)):
  - `npm run type-check`
  - `npm run lint`
  - `npm run build`
  - `npm audit`
- **Secret scanning**: GitHub native secret scanning + push protection
  *(verify enabled before partner submission)*.
- **Branch protection**: signed commits required, force-push disabled on
  `main`.

---

## 15. OWASP Top 10 (2021) Self-Assessment

| ID    | Category                                            | Status     | Notes                                                                                   |
|-------|-----------------------------------------------------|------------|-----------------------------------------------------------------------------------------|
| A01   | Broken Access Control                               | Mitigated  | RLS on every table; centralized role helpers; server-side auth checks. §4.              |
| A02   | Cryptographic Failures                              | Mitigated  | TLS 1.2+ in transit; AES-256 at rest; bcrypt passwords. §5.                             |
| A03   | Injection                                           | Mitigated  | Parameterized queries via Supabase client; no string concat. §6.1.                      |
| A04   | Insecure Design                                     | Partial    | Threat model documented (§1); design reviews informal — codify in SDLC.                 |
| A05   | Security Misconfiguration                           | Mitigated  | CSP, security headers, no debug surfaces in prod, secrets out of code. §7.1.            |
| A06   | Vulnerable & Outdated Components                    | Mitigated  | `npm audit` clean; Dependabot enabled; postcss override applied. §9.                    |
| A07   | Identification & Authentication Failures            | Mitigated  | MFA TOTP, session refresh, password min 8, invite-only. §3.                             |
| A08   | Software & Data Integrity Failures                  | Partial    | No SRI on script tags; CI enforcement of integrity checks on roadmap.                   |
| A09   | Security Logging & Monitoring Failures              | Partial    | Sentry in place; **dedicated security audit log on roadmap** (§10.2).                   |
| A10   | Server-Side Request Forgery                         | Mitigated  | Single allow-listed host on the only user-driven outbound fetch. §6.4.                  |

---

## 16. Roadmap & Known Gaps

Items below are **known security work**, ordered by priority. Items marked
**[partner-blocking]** must be complete before submitting Zoom Marketplace or
Google OAuth verification reviews.

### Critical (pre-launch)

- [x] **[partner-blocking]** Verify `beespo.com` domain in Resend (DKIM/SPF/DMARC). Verified 2026-05-08; TLS set to Enforced.
- [x] **[partner-blocking]** Provision Upstash Redis for production
      (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`). Set in Vercel 2026-05-08.
- [x] **[partner-blocking]** Stand up `security@beespo.com` mailbox and publish
      `/.well-known/security.txt`. Mailbox live; security.txt at `public/.well-known/security.txt`.
- [x] **[partner-blocking]** Cloudflare in front of beespo.com (free tier);
      DDoS, Free Managed Ruleset, Bot Fight Mode, HSTS configured. 5 custom WAF
      rules + 1 rate-limit rule deployed. Source-of-truth at `security/cloudflare-rules.md`.
- [x] **[partner-blocking]** Cloudflare Turnstile widget configured (Managed mode,
      Managed pre-clearance) and wired into login, signup, and forgot-password
      flows; tokens verified server-side via `src/lib/security/turnstile.ts`.
- [ ] Wrap `checkRateLimit()` in try/catch; on Upstash error, fall back to a
      stricter in-memory cap and alert via Sentry.
- [ ] Add `Permissions-Policy`, `X-Frame-Options: DENY`,
      `Cross-Origin-Opener-Policy: same-origin` headers (`next.config.ts`).
      *(HSTS now provided by Cloudflare edge.)*
- [ ] Tighten CSP: replace `'unsafe-inline'` / `'unsafe-eval'` with
      nonce-based script-src.
- [ ] Implement security audit log table + write events on: sign-in
      success/fail, MFA changes, role changes, invitation accept/revoke,
      OAuth token issuance/revocation.
- [ ] Self-serve account deletion + data export in Settings.

### High (within 60 days of launch)

- [ ] **[partner-blocking]** Run the free security tooling pass (OWASP ZAP,
      Snyk, Semgrep, Mozilla Observatory, SSL Labs, Supabase Security
      Advisor); archive reports under `security/audits/`. Remediate
      Critical/High findings before partner submission.
- [ ] **[partner-blocking]** Engage one external reviewer for a focused
      4–8 hour OWASP ASVS Level 1 assessment (target budget: $300–800 via
      Upwork / Toptal / a boutique consultancy). Archive the deliverable in
      `security/audits/`.
- [ ] **[partner-blocking]** Stand up a public vulnerability disclosure
      program (HackerOne or Bugcrowd; both have free public-program tiers).
      Even with zero researcher activity, the existence of the program ticks
      a box on partner security questionnaires.
- [ ] Enable GitHub Dependabot, secret scanning, push protection, code
      scanning (CodeQL).
- [ ] Codify SDLC checks in CI: `type-check`, `lint`, `build`, `audit`, secret
      scan must pass for any PR to merge.
- [ ] Publish subprocessor list at `/subprocessors` and notification policy.
- [ ] Document and dry-run the incident response playbook (tabletop exercise).
- [ ] Quarterly secret rotation runbook + Vercel project secret rotation.
- [ ] Document and test backup/restore (RPO/RTO measurement).

### Medium (90+ days)

- [ ] Brute-force lockout per invite code (3 strikes → code disabled).
- [ ] Honey-token invite codes that auto-block IP on submission.
- [ ] Step-up re-authentication for high-risk actions (delete account,
      transfer ownership, view audit log).
- [ ] Common-password / breach-corpus check on password creation
      (e.g., HIBP `k-anonymity` API).
- [ ] Move from sandbox Resend sender to verified `beespo.com` domain across
      all environments.
- [ ] Add automated DAST scanning (e.g., OWASP ZAP) against staging.
- [ ] Vulnerability disclosure / bug bounty program.

### Future (post-revenue / enterprise readiness)

- [ ] SOC 2 Type I assessment.
- [ ] Annual third-party penetration test (full engagement, target: once
      revenue or enterprise customers justify the spend; expect $8K–15K).
- [ ] Formal vendor risk assessment process.

---

## 17. Reporting Vulnerabilities

We welcome reports of security vulnerabilities from researchers, customers, and
partners.

- **Email**: security@beespo.com
- **Subject prefix**: `[SECURITY]`
- **Encrypt sensitive details with PGP** if available (key publication on the
  [roadmap](#16-roadmap--known-gaps)).

**What to include**:

- A clear description of the vulnerability, including affected URLs / endpoints.
- Steps to reproduce.
- Potential impact.
- Your contact information and any handle / name you'd like credit under.

**Our commitment**:

- Acknowledge receipt within **2 business days**.
- Provide an initial assessment within **5 business days**.
- Keep you updated until resolution.
- Credit you publicly on resolution if you wish.

**Safe harbor**: research conducted in good faith under this policy will not
result in legal action by Beespo. Please:

- Avoid privacy violations of other users.
- Avoid degrading service for others.
- Do not exfiltrate data beyond what is necessary to demonstrate the issue.
- Give us a reasonable time to respond before public disclosure.

A `/.well-known/security.txt` file with this contact information is on the
[roadmap](#16-roadmap--known-gaps).

---

## Appendix A — Zoom Marketplace Pre-Integration Checklist

Items required before re-introducing Zoom integration and submitting for Zoom
Marketplace review. References Zoom App Submission Requirements as of 2026.

### Application

- [ ] Production HTTPS endpoints only.
- [ ] OAuth: Authorization Code grant (no Implicit, no Password).
- [ ] OAuth scopes scoped to minimum required (`meeting:write`, `user:read` —
      no `recording:*`, no `webinar:*` unless used).
- [ ] Tokens encrypted at rest (AES-256-GCM) — reinstate `src/lib/encryption.ts`.
- [ ] Refresh tokens rotated on use; expired tokens deleted.
- [ ] Disconnect flow calls Zoom token revocation endpoint and deletes local
      token row.
- [ ] No tokens in logs, Sentry breadcrumbs, error messages, or URL parameters.
- [ ] Webhook signature verification (HMAC-SHA256 against
      `ZOOM_WEBHOOK_SECRET_TOKEN`, constant-time compare, ≤5-minute window).
- [ ] Webhook URL-validation challenge handled per Zoom spec.
- [ ] Deauthorization Notification endpoint implemented.

### Documentation

- [ ] Privacy Policy section explicitly covers Zoom data collected, usage, and
      deletion on disconnect.
- [ ] In-app description of what Zoom permissions we request and why.
- [ ] Marketplace listing: support contact, terms link, privacy link, security
      contact (security@beespo.com).
- [ ] Walkthrough video / screenshots demonstrating connect → use →
      disconnect.

### Security Posture

- [ ] This `SECURITY.md` published at <https://github.com/...> and referenced
      in the Marketplace submission.
- [ ] Documented security review completed: automated tool reports (ZAP,
      Snyk, Semgrep, Mozilla Observatory, SSL Labs) plus an external
      reviewer's written assessment, archived under `security/audits/` and
      available to Zoom on request.
- [ ] Public vulnerability disclosure program live (HackerOne or Bugcrowd).
- [ ] Vulnerability disclosure process operational (security@beespo.com
      monitored).
- [ ] Incident response runbook documented.

---

## Appendix B — Google OAuth Verification Pre-Integration Checklist

Items required before adding Google OAuth scopes (Calendar, Drive, etc.) and
submitting for Google's verification process.

### Application

- [ ] Authorized redirect URIs limited to production domain(s).
- [ ] Authorized JavaScript origins limited to production domain(s).
- [ ] OAuth consent screen: production status (not testing).
- [ ] App branding: verified domain ownership, logo, support email, privacy +
      terms URLs.
- [ ] Scopes used = scopes requested = scopes documented. No "phantom" scopes
      requested but unused.
- [ ] Tokens encrypted at rest, never in client.

### Sensitive vs. Restricted Scope Requirements

Google CASA tiering, simplified:

- **Tier 1** — basic scopes (`profile`, `email`): self-assessment only.
- **Tier 2** — sensitive scopes (Calendar, Drive metadata, Contacts, etc.):
  **self-assessment**. The free + low-cost review described in §11 satisfies
  this — no third-party assessor required. **This is the tier Beespo's
  planned Calendar integration falls into.**
- **Tier 3** — restricted scopes (Gmail content, full Drive content, etc.):
  third-party CASA assessor required ($10K+). We do not currently plan to
  request any Tier-3 scope.

If we ever request a restricted scope:

- [ ] Limited Use disclosure published in Privacy Policy and on a dedicated
      page; verbatim language per Google's User Data Policy.
- [ ] Third-party Tier 3 CASA assessor engaged 2–3 months before launch
      window.
- [ ] No selling, transferring, or using restricted-scope data for
      advertising.
- [ ] No human reading of restricted-scope data except with explicit user
      consent or for narrow, documented operational reasons.

### Documentation

- [ ] Privacy Policy section explicitly covers Google data collected, usage,
      Limited Use commitment, and deletion on disconnect.
- [ ] Demo video showing the OAuth consent flow and feature usage.
- [ ] Security posture documentation (this file).

### Security Posture

- [ ] Same as Zoom Appendix A.
- [ ] CASA Letter of Validation if restricted scopes are in use.

---

*End of document.*
