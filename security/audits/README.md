# Security Audit Artifacts

This directory archives the artifacts of every security review performed
against Beespo. Partners (Zoom, Google, integrators) and prospective
enterprise customers may request a subset of these on demand.

See `SECURITY.md` at the repo root for the full security posture document.

## Layout

```
security/audits/
├── README.md                   ← this file
├── 2026-Q2/                    ← one folder per audit cycle
│   ├── owasp-zap.html          ← automated DAST scan output
│   ├── snyk-report.json
│   ├── semgrep-findings.json
│   ├── mozilla-observatory.png ← screenshot of grade
│   ├── ssl-labs.png            ← screenshot of grade
│   ├── supabase-advisor.md     ← summary of Supabase Security Advisor findings
│   ├── asvs-l1-checklist.md    ← OWASP ASVS Level 1 self-assessment
│   ├── external-review-2026-Q2.pdf  ← report from paid external reviewer
│   └── remediation-log.md      ← what we found, what we fixed, when
└── …
```

## Cadence

- **Pre-launch audit**: complete the full set of automated tooling + one
  external reviewer engagement before submitting to any partner for review.
- **Quarterly automated re-scan**: re-run the free tooling each quarter.
- **Annual external review**: schedule one paid review per year, scope
  scaling with revenue.
- **On material change**: re-run automated tooling whenever auth, OAuth,
  or any third-party integration meaningfully changes.

## Free tooling — how to run each

| Tool                         | Cost  | Where                                                        | Output to capture          |
|------------------------------|-------|--------------------------------------------------------------|----------------------------|
| OWASP ZAP                    | Free  | <https://www.zaproxy.org/download/>                          | HTML report                |
| Snyk                         | Free* | <https://snyk.io/> (CLI: `npx snyk test`)                    | JSON / dashboard export    |
| Semgrep                      | Free  | <https://semgrep.dev/> (CLI: `semgrep --config auto`)        | JSON / SARIF               |
| Mozilla Observatory          | Free  | <https://observatory.mozilla.org/>                           | Grade screenshot           |
| SSL Labs                     | Free  | <https://www.ssllabs.com/ssltest/>                           | Grade screenshot           |
| Supabase Security Advisor    | Free  | Supabase Dashboard → Database → Advisors                     | Markdown summary           |
| GitHub CodeQL                | Free* | GitHub repo → Settings → Code security                       | Findings list              |
| OWASP ASVS Level 1           | Free  | <https://owasp.org/www-project-application-security-verification-standard/> | Filled-in checklist (md)   |

\* Free tier limits apply. For private repos check the org tier.

## External reviewer engagement template

When hiring an external reviewer (Upwork / Toptal / boutique consultancy),
the scope of work should ask for:

1. **Walkthrough against OWASP ASVS Level 1** for the specified surface area
   (auth, RLS, API routes, integrations).
2. **Manual testing** of the auth flow, MFA setup, invitation acceptance,
   and (when re-introduced) OAuth integrations.
3. **Written deliverable** including:
   - Methodology and tooling used.
   - Findings ranked by severity (Critical / High / Medium / Low / Info).
   - Reproduction steps for each finding.
   - Recommended remediation.
   - Re-test invitation if remediation is performed.
4. **Format**: PDF + Markdown summary.

Target budget: $300–800 for a 4–8 hour focused engagement at this stage.

## Triage SLA after each audit

- **Critical**: hotfix within 7 days of confirmation.
- **High**: fix within 30 days.
- **Medium**: fix at next regular release cycle (target 60 days).
- **Low / Info**: capture in the issue tracker; address opportunistically.

Every audit ends with a `remediation-log.md` in the audit folder noting:
finding ID, severity, fix commit / PR, date closed.
