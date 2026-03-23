import { Metadata } from "next";
import { SupportForm } from "./support-form";

export const metadata: Metadata = {
  title: "Support | Beespo",
  description: "Get help with Beespo. Submit a support ticket or browse common questions.",
};

const faqs = [
  {
    q: "How do I connect my Zoom account?",
    a: "Go to Settings → Integrations and click 'Connect Zoom'. You'll be redirected to Zoom to authorize Beespo.",
  },
  {
    q: "How do I create a meeting with Zoom?",
    a: "Open a meeting in Beespo, click 'Add Zoom Meeting', and Beespo will create the meeting in your Zoom account automatically.",
  },
  {
    q: "Can I use Beespo without Zoom?",
    a: "Yes. Zoom is an optional integration. You can create and manage meeting agendas without connecting Zoom.",
  },
  {
    q: "How do I invite team members to my workspace?",
    a: "Go to Settings → Team and click 'Invite Member'. Enter their email and they'll receive an invitation.",
  },
  {
    q: "How do I delete my account?",
    a: "Go to Settings → Account and scroll to the bottom. Click 'Delete Account' and follow the confirmation steps.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. All data is encrypted at rest (AES-256) and in transit (TLS 1.2+). OAuth tokens are stored securely and never exposed to other users.",
  },
];

export default function SupportPage() {
  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Support</h1>
        <p className="text-muted-foreground mt-2">
          Need help? Browse common questions below or submit a support ticket.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Contact</h2>
        <p className="text-muted-foreground">
          You can reach us directly at{" "}
          <a href="mailto:support@beespo.com" className="text-primary underline underline-offset-4">
            support@beespo.com
          </a>
          . We typically respond within one business day.
        </p>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold">Frequently Asked Questions</h2>
        <dl className="space-y-6">
          {faqs.map((faq) => (
            <div key={faq.q} className="border-b pb-6 last:border-0 last:pb-0">
              <dt className="font-medium mb-2">{faq.q}</dt>
              <dd className="text-muted-foreground leading-relaxed">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Submit a Ticket</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Sign in to submit a support ticket and track your requests.
          </p>
        </div>
        <SupportForm />
      </section>
    </div>
  );
}
