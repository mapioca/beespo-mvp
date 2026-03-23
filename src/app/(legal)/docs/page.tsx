import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Documentation | Beespo",
  description: "Beespo documentation — learn how to use Beespo and integrate with Zoom.",
};

const sections = [
  {
    title: "Getting Started",
    items: [
      { label: "Creating your account", href: "/docs/creating-your-account" },
      { label: "Setting up your workspace", href: "/docs/setting-up-your-workspace" },
      { label: "Inviting team members", href: "#" },
    ],
  },
  {
    title: "Meetings & Agendas",
    items: [
      { label: "Creating a meeting", href: "#" },
      { label: "Building an agenda", href: "#" },
      { label: "Using templates", href: "#" },
      { label: "Sharing your agenda", href: "#" },
    ],
  },
  {
    title: "Zoom Integration",
    items: [
      { label: "Connecting your Zoom account", href: "#" },
      { label: "Creating a Zoom meeting from Beespo", href: "#" },
      { label: "Managing Zoom meetings", href: "#" },
      { label: "Disconnecting Zoom", href: "#" },
    ],
  },
  {
    title: "Account & Settings",
    items: [
      { label: "Managing your profile", href: "#" },
      { label: "Workspace settings", href: "#" },
      { label: "Billing and plans", href: "#" },
      { label: "Deleting your account", href: "#" },
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documentation</h1>
        <p className="text-muted-foreground mt-2">
          Learn how to get the most out of Beespo. Full documentation is coming soon.
          In the meantime, browse the topics below or{" "}
          <Link href="/support" className="text-primary underline underline-offset-4">
            contact support
          </Link>{" "}
          for help.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        {sections.map((section) => (
          <section key={section.title} className="space-y-4">
            <h2 className="font-semibold text-lg border-b pb-2">{section.title}</h2>
            <ul className="space-y-2">
              {section.items.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="border rounded-lg p-6 bg-muted/30 space-y-2">
        <h2 className="font-semibold">Can&apos;t find what you&apos;re looking for?</h2>
        <p className="text-muted-foreground text-sm">
          Our support team is here to help. Submit a ticket at{" "}
          <Link href="/support" className="text-primary underline underline-offset-4">
            beespo.com/support
          </Link>{" "}
          or email us at{" "}
          <a href="mailto:support@beespo.com" className="text-primary underline underline-offset-4">
            support@beespo.com
          </a>
          .
        </p>
      </section>
    </div>
  );
}
