import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Beespo",
  description: "Beespo Privacy Policy — how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="text-muted-foreground mt-2">Last updated: March 22, 2026</p>
        <p className="text-muted-foreground mt-1">Bishopric Technologies LLC (&quot;Beespo&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;)</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">1. Information We Collect</h2>
        <p className="text-muted-foreground leading-relaxed">
          We collect information you provide directly, such as your name, email address, and
          workspace details when you create an account. We also collect information about how
          you use Beespo, including meeting agendas, templates, and integration data.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          When you connect Zoom, we store your Zoom OAuth access and refresh tokens, along with
          meeting metadata (meeting ID, join URL, start URL, passcode). These are stored
          encrypted at rest and are never shared with other users.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">2. How We Use Your Information</h2>
        <p className="text-muted-foreground leading-relaxed">
          We use the information we collect to provide, maintain, and improve Beespo; to
          communicate with you; to process transactions; and to fulfill any other purpose for
          which you provide it.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Zoom data is used exclusively to create, update, and delete Zoom meetings on your
          behalf within the Beespo platform. We do not access meeting recordings, participant
          data, or meeting content.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">3. Data Storage and Security</h2>
        <p className="text-muted-foreground leading-relaxed">
          Your data is stored in a managed PostgreSQL database (Supabase) hosted on AWS.
          All data is encrypted at rest using AES-256 and in transit using TLS 1.2 or higher.
          Row-level security policies ensure each user can only access their own data.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">4. Data Sharing</h2>
        <p className="text-muted-foreground leading-relaxed">
          We do not sell, trade, or otherwise transfer your personal information to outside
          parties. We may share data with trusted third-party services required to operate
          Beespo, including Supabase (database), Vercel (hosting), Zoom (meeting integration),
          and Resend (email delivery). Each of these services is bound by their own privacy
          policies and data processing agreements.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">5. Your Rights</h2>
        <p className="text-muted-foreground leading-relaxed">
          You may request access to, correction of, or deletion of your personal data at any
          time. To exercise these rights, contact us at{" "}
          <a href="mailto:support@beespo.com" className="text-primary underline underline-offset-4">
            support@beespo.com
          </a>
          . You may also delete your account directly from the Settings page within the app,
          which will remove all associated data.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          If you have connected your Zoom account and wish to revoke access, you can disconnect
          Zoom from the Settings → Integrations page. Disconnecting removes your OAuth tokens
          from our system immediately.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">6. Cookies</h2>
        <p className="text-muted-foreground leading-relaxed">
          Beespo uses session cookies to maintain your authentication state. We do not use
          tracking or advertising cookies.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">7. Children&apos;s Privacy</h2>
        <p className="text-muted-foreground leading-relaxed">
          Beespo is not directed to children under 13. We do not knowingly collect personal
          information from children under 13.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">8. Changes to This Policy</h2>
        <p className="text-muted-foreground leading-relaxed">
          We may update this Privacy Policy from time to time. We will notify you of significant
          changes by email or through a notice within the app.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">9. Contact Us</h2>
        <p className="text-muted-foreground leading-relaxed">
          If you have questions about this Privacy Policy, please contact us at{" "}
          <a href="mailto:support@beespo.com" className="text-primary underline underline-offset-4">
            support@beespo.com
          </a>
          .
        </p>
        <p className="text-muted-foreground">
          Bishopric Technologies LLC
        </p>
      </section>
    </div>
  );
}
