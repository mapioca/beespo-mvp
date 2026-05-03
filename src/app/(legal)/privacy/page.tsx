import { Metadata } from "next";
import { LegalPageShell, LegalSection } from "@/components/legal/legal-page-shell";

export const metadata: Metadata = {
  title: "Privacy Policy | Beespo",
  description: "Beespo Privacy Policy — how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      eyebrow="Legal"
      title="Privacy"
      accent="policy"
      description={
        <>
          <p>How Beespo collects, uses, and protects the information entrusted to the workspace.</p>
          <p className="mt-2 text-sm">Last updated: March 22, 2026</p>
        </>
      }
    >
      <LegalSection title="1. Information We Collect" kicker="Data handling">
        <p className="leading-relaxed" style={{ color: "color-mix(in srgb, var(--lp-ink) 78%, transparent)" }}>
          We collect information you provide directly, such as your name, email address, and
          workspace details when you create an account. We also collect information about how
          you use Beespo, including meeting agendas, templates, and integration data.
        </p>
        <p className="mt-4 leading-relaxed" style={{ color: "color-mix(in srgb, var(--lp-ink) 78%, transparent)" }}>
          When you connect Zoom, we store your Zoom OAuth access and refresh tokens, along with
          meeting metadata (meeting ID, join URL, start URL, passcode). These are stored
          encrypted at rest and are never shared with other users.
        </p>
      </LegalSection>

      <LegalSection title="2. How We Use Your Information">
        <p className="leading-relaxed" style={{ color: "color-mix(in srgb, var(--lp-ink) 78%, transparent)" }}>
          We use the information we collect to provide, maintain, and improve Beespo; to
          communicate with you; to process transactions; and to fulfill any other purpose for
          which you provide it.
        </p>
        <p className="mt-4 leading-relaxed" style={{ color: "color-mix(in srgb, var(--lp-ink) 78%, transparent)" }}>
          Zoom data is used exclusively to create, update, and delete Zoom meetings on your
          behalf within the Beespo platform. We do not access meeting recordings, participant
          data, or meeting content.
        </p>
      </LegalSection>

      <LegalSection title="3. Data Storage and Security">
        <p className="leading-relaxed" style={{ color: "color-mix(in srgb, var(--lp-ink) 78%, transparent)" }}>
          Your data is stored in a managed PostgreSQL database (Supabase) hosted on AWS.
          All data is encrypted at rest using AES-256 and in transit using TLS 1.2 or higher.
          Row-level security policies ensure each user can only access their own data.
        </p>
      </LegalSection>

      <LegalSection title="4. Data Sharing">
        <p className="leading-relaxed" style={{ color: "color-mix(in srgb, var(--lp-ink) 78%, transparent)" }}>
          We do not sell, trade, or otherwise transfer your personal information to outside
          parties. We may share data with trusted third-party services required to operate
          Beespo, including Supabase (database), Vercel (hosting), Zoom (meeting integration),
          and Resend (email delivery). Each of these services is bound by their own privacy
          policies and data processing agreements.
        </p>
      </LegalSection>

      <LegalSection title="5. Your Rights">
        <p className="leading-relaxed" style={{ color: "color-mix(in srgb, var(--lp-ink) 78%, transparent)" }}>
          You may request access to, correction of, or deletion of your personal data at any
          time. To exercise these rights, contact us at{" "}
          <a
            href="mailto:support@beespo.com"
            className="underline underline-offset-4"
            style={{ color: "var(--lp-accent)" }}
          >
            support@beespo.com
          </a>
          . You may also delete your account directly from the Settings page within the app,
          which will remove all associated data.
        </p>
        <p className="mt-4 leading-relaxed" style={{ color: "color-mix(in srgb, var(--lp-ink) 78%, transparent)" }}>
          If you have connected your Zoom account and wish to revoke access, you can disconnect
          Zoom from the Settings → Integrations page. Disconnecting removes your OAuth tokens
          from our system immediately.
        </p>
      </LegalSection>

      <LegalSection title="6. Cookies">
        <p className="leading-relaxed" style={{ color: "color-mix(in srgb, var(--lp-ink) 78%, transparent)" }}>
          Beespo uses session cookies to maintain your authentication state. We do not use
          tracking or advertising cookies.
        </p>
      </LegalSection>

      <LegalSection title="7. Children&apos;s Privacy">
        <p className="leading-relaxed" style={{ color: "color-mix(in srgb, var(--lp-ink) 78%, transparent)" }}>
          Beespo is not directed to children under 13. We do not knowingly collect personal
          information from children under 13.
        </p>
      </LegalSection>

      <LegalSection title="8. Changes to This Policy">
        <p className="leading-relaxed" style={{ color: "color-mix(in srgb, var(--lp-ink) 78%, transparent)" }}>
          We may update this Privacy Policy from time to time. We will notify you of significant
          changes by email or through a notice within the app.
        </p>
      </LegalSection>

      <LegalSection title="9. Contact Us">
        <p className="leading-relaxed" style={{ color: "color-mix(in srgb, var(--lp-ink) 78%, transparent)" }}>
          If you have questions about this Privacy Policy, please contact us at{" "}
          <a
            href="mailto:support@beespo.com"
            className="underline underline-offset-4"
            style={{ color: "var(--lp-accent)" }}
          >
            support@beespo.com
          </a>
          .
        </p>
        <p className="mt-4 text-sm" style={{ color: "color-mix(in srgb, var(--lp-ink) 62%, transparent)" }}>
          Bishopric Technologies LLC
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
