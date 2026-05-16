import { Metadata } from "next";
import { LegalPageShell, LegalSection } from "@/components/legal/legal-page-shell";
import { SupportForm } from "./support-form";

export const metadata: Metadata = {
  title: "Support | Beespo",
  description: "Get help with Beespo. Submit a support ticket or browse common questions.",
};

const faqs = [
  {
    q: "How do I submit a support ticket?",
    a: "Sign in, scroll to the Submit a Ticket section, choose the request type and priority, then add a clear subject and description before sending it.",
  },
  {
    q: "What should I include in a bug report?",
    a: "Include what you expected to happen, what actually happened, the page or feature involved, and the exact steps that reproduce the issue. The more specific the report, the faster we can investigate it.",
  },
  {
    q: "Do I need to sign in to contact support?",
    a: "You can always email support@beespo.com directly, or sign in to submit a ticket through the app. We'll reply by email either way.",
  },
  {
    q: "How do I invite team members to my workspace?",
    a: "Go to Settings → Team and click 'Invite Member'. Enter their email and they'll receive an invitation.",
  },
  {
    q: "How quickly will support respond?",
    a: "We typically respond within one business day. For urgent issues, include clear reproduction steps and relevant context so we can prioritize investigation quickly.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. All data is encrypted at rest (AES-256) and in transit (TLS 1.2+). OAuth tokens are stored securely and never exposed to other users.",
  },
];

export default function SupportPage() {
  return (
    <LegalPageShell
      eyebrow="Help"
      title="Support"
      accent="desk"
      description={
        <>
          Need help with Beespo? Browse common questions, contact the team directly, or file a
          support request from the same branded surface.
        </>
      }
    >
      <LegalSection title="Contact" kicker="Direct line">
        <p style={{ color: "color-mix(in srgb, var(--lp-ink) 78%, transparent)" }}>
          You can reach us directly at{" "}
          <a
            href="mailto:support@beespo.com"
            className="underline underline-offset-4"
            style={{ color: "var(--lp-accent)" }}
          >
            support@beespo.com
          </a>
          . We typically respond within one business day.
        </p>
      </LegalSection>

      <LegalSection title="Frequently Asked Questions" kicker="Common answers">
        <dl className="space-y-5">
          {faqs.map((faq) => (
            <div
              key={faq.q}
              className="rounded-[20px] px-5 py-5"
              style={{
                background: "color-mix(in srgb, var(--lp-bg) 84%, white 16%)",
                border: "1px solid color-mix(in srgb, var(--lp-ink) 10%, transparent)",
              }}
            >
              <dt className="font-serif text-[20px] leading-tight text-[var(--lp-ink)]">{faq.q}</dt>
              <dd
                className="mt-3 leading-relaxed"
                style={{ color: "color-mix(in srgb, var(--lp-ink) 76%, transparent)" }}
              >
                {faq.a}
              </dd>
            </div>
          ))}
        </dl>
      </LegalSection>

      <LegalSection title="Submit a Ticket" kicker="Workspace support">
        <div className="mb-6">
          <p
            className="text-sm"
            style={{ color: "color-mix(in srgb, var(--lp-ink) 68%, transparent)" }}
          >
            Sign in to submit a support ticket and track your requests.
          </p>
        </div>
        <SupportForm />
      </LegalSection>
    </LegalPageShell>
  );
}
