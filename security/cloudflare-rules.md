# Cloudflare Edge Rules — Source of Truth

This document is the canonical version of every WAF rule, custom rule, and
rate-limiting rule deployed on `beespo.com` via Cloudflare.

**Why version-control these?** Cloudflare's UI is the deployment target, but
the dashboard has no diff history that survives accidental edits, no review
workflow, and no recovery path if a rule is deleted. Keeping the expressions
here means we can always re-deploy a known-good configuration.

When you change a rule in Cloudflare, also update the corresponding section
here and commit.

---

## Plan

`beespo.com` is on **Cloudflare Free**. Available limits at the time of writing:

- **DDoS protection** (L3/L4): unlimited, automatic
- **Free Managed Ruleset**: enabled
- **Bot Fight Mode**: enabled
- **Custom rules**: 5 slots — all 5 used
- **Rate limiting rules**: 1 slot — used
- **WAF Pro Managed Ruleset (Cloudflare + OWASP CRS)**: not available on Free
  (deferred per `SECURITY.md` §16; revisit when revenue or partner requirement justifies $20/mo)

---

## Custom Rules

Rules execute top-to-bottom; first match terminates. Order is significant:
**block rules first, challenge rules last** so a request matching multiple rules
is blocked rather than just challenged.

### Order in dashboard

1. `block-scanners` (Block)
2. `block-non-app-paths` (Block)
3. `block-empty-ua-on-auth` (Block)
4. `challenge-bots-on-auth` (Managed Challenge)
5. `challenge-hosting-asns-on-auth` (Managed Challenge)

---

### 1. `block-scanners`
**Action**: Block
**Why**: Common reconnaissance and exploitation tools self-identify in their User-Agent. Zero false-positive cost.

```
(lower(http.user_agent) contains "sqlmap") or (lower(http.user_agent) contains "nikto") or (lower(http.user_agent) contains "nmap") or (lower(http.user_agent) contains "masscan") or (lower(http.user_agent) contains "wpscan") or (lower(http.user_agent) contains "havij") or (lower(http.user_agent) contains "fimap") or (lower(http.user_agent) contains "acunetix") or (lower(http.user_agent) contains "dirbuster") or (lower(http.user_agent) contains "gobuster") or (lower(http.user_agent) contains "ffuf") or (lower(http.user_agent) contains "nuclei") or (lower(http.user_agent) contains "zgrab") or (lower(http.user_agent) contains "shodan")
```

---

### 2. `block-non-app-paths`
**Action**: Block
**Why**: Beespo is a Next.js app — nothing legitimate ever requests WordPress, PHP, or shell paths. Blocks the noisiest portion of automated reconnaissance.

```
(http.request.uri.path contains "/wp-admin") or (http.request.uri.path contains "/wp-login") or (http.request.uri.path contains "/wp-content") or (http.request.uri.path contains "/wp-includes") or (http.request.uri.path contains "/xmlrpc.php") or (http.request.uri.path contains "/phpmyadmin") or (http.request.uri.path contains "/.env") or (http.request.uri.path contains "/.git/") or (http.request.uri.path contains "/.aws/") or (http.request.uri.path contains "/.ssh/") or (ends_with(http.request.uri.path, ".php")) or (ends_with(http.request.uri.path, ".asp")) or (ends_with(http.request.uri.path, ".aspx")) or (ends_with(http.request.uri.path, ".jsp")) or (ends_with(http.request.uri.path, ".cgi"))
```

---

### 3. `block-empty-ua-on-auth`
**Action**: Block
**Why**: Real browsers always send a substantial User-Agent (typically 100+ chars). Empty or trivially-short UA on an auth endpoint is almost certainly a script. Scoped to auth paths only to avoid breaking legitimate health-monitor traffic on `/api/health`.

```
((http.user_agent eq "") or (len(http.user_agent) lt 10)) and ((http.request.uri.path contains "/api/platform-invitations/") or (http.request.uri.path contains "/api/workspace-invitations/") or (http.request.uri.path contains "/api/auth/") or (http.request.uri.path eq "/login") or (http.request.uri.path eq "/signup") or (http.request.uri.path eq "/forgot-password"))
```

---

### 4. `challenge-bots-on-auth`
**Action**: Managed Challenge
**Why**: `cf.client.bot` is true for unverified bots only — Googlebot, Bingbot, Slackbot, Discordbot, etc. are on Cloudflare's verified-bot allowlist and excluded automatically. Challenges scraping/credential-stuffing bots without breaking SEO crawlers or social-link previews.

```
(cf.client.bot) and ((http.request.uri.path contains "/api/platform-invitations/") or (http.request.uri.path contains "/api/workspace-invitations/") or (http.request.uri.path contains "/api/auth/") or (http.request.uri.path eq "/login") or (http.request.uri.path eq "/signup") or (http.request.uri.path eq "/forgot-password") or (http.request.uri.path eq "/accept-invite"))
```

---

### 5. `challenge-hosting-asns-on-auth`
**Action**: Managed Challenge
**Why**: Replaces the deprecated `cf.threat_score` field. Most credential-stuffing botnets run on cheap VPS providers; legitimate users on those same networks (corporate egress, VPN) get a one-click Turnstile challenge instead of a block.

ASNs covered:
| ASN | Provider |
|---|---|
| 14061 | DigitalOcean |
| 16276 | OVH |
| 24940 | Hetzner |
| 20473 | The Constant Company / Vultr |
| 63949 | Akamai / Linode |
| 36352 | ColoCrossing |

Deliberately excluded: AWS (16509) and Azure / Microsoft (8075) — too much legitimate corporate egress on those networks. Add later if abuse data warrants.

```
(ip.geoip.asnum in {14061 16276 24940 20473 63949 36352}) and ((http.request.uri.path contains "/api/platform-invitations/") or (http.request.uri.path contains "/api/workspace-invitations/") or (http.request.uri.path contains "/api/auth/") or (http.request.uri.path eq "/login") or (http.request.uri.path eq "/signup") or (http.request.uri.path eq "/forgot-password") or (http.request.uri.path eq "/accept-invite"))
```

---

## Rate Limiting Rule

### `auth-and-invite-throttle`
**Counter**: 20 requests per 1 minute, characterized by IP
**Action**: Block, mitigation timeout 10 minutes
**Why**: One slot, broad coverage. Edge-block before any request reaches Vercel + Upstash. Application-layer rate limit (Upstash) is per-IP **and** per-email, which catches the cross-IP credential-stuffing case Cloudflare can't see.

```
(http.request.uri.path contains "/api/platform-invitations/") or (http.request.uri.path contains "/api/workspace-invitations/") or (http.request.uri.path contains "/api/auth/") or (http.request.uri.path eq "/login") or (http.request.uri.path eq "/signup") or (http.request.uri.path eq "/forgot-password") or (http.request.uri.path eq "/reset-password") or (http.request.uri.path eq "/accept-invite") or (http.request.uri.path contains "/api/invitations/accept")
```

> **Note**: when adding `/accept-invite` and `/api/invitations/accept` to the
> existing rule, edit the rule's expression in the Cloudflare dashboard and
> save. The rule is the same; only the OR list grows.

---

## Settings (Security → Settings)

These are dashboard toggles, not expressions:

- **Bot Fight Mode**: ON
- **Security Level**: Medium
- **Browser Integrity Check**: ON
- **Challenge Passage**: 30 minutes (default)

## SSL/TLS

- **Mode**: Full (strict)
- **Always Use HTTPS**: ON
- **Automatic HTTPS Rewrites**: ON
- **Min TLS Version**: TLS 1.2
- **HSTS**: enabled, max-age 6 months, includeSubDomains ON, preload OFF

## Turnstile

- Widget: `beespo.com`
- Mode: Managed (Cloudflare picks challenge difficulty per request)
- Pre-clearance: Managed (medium) — bypasses our `Managed Challenge` rules after verification
- Site key → `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (Vercel env)
- Secret key → `TURNSTILE_SECRET_KEY` (Vercel env)

---

## Maintenance

- **When changing a Cloudflare rule**: update this file in the same commit.
- **Quarterly**: review Security → Events for false positives and rule effectiveness.
- **On partner request**: this file is shareable as evidence of edge controls.
