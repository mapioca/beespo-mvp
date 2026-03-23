import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sharing Your Agenda | Beespo Documentation',
  description: 'How to share your agendas with your team, presidency, and church leaders on Beespo.',
};

export default function SharingYourAgendaDocs() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <div className="mb-10 text-primary/80">
        <Link href="/docs" className="text-sm text-primary hover:underline underline-offset-4 flex items-center gap-1 mb-4">
          ← Back to Documentation
        </Link>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Sharing your agenda</h1>
        <p className="text-xl">
          Get your meeting plans into the hands of your leaders and team members quickly and efficiently.
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Overview</h2>
        <p className="text-muted-foreground">
          Sharing is easy on Beespo. Each agenda you build can be shared privately with individual workspace members 
          or broadcasted to the whole organization. You can choose to share a direct link or export the agenda for 
          offline use.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Sharing Your Agenda</h2>
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-medium mb-2 font-bold tracking-tight">Step 1: Open the Share Dialog</h3>
            <p className="text-muted-foreground">
              From the <strong>Agenda Builder</strong> (or the meeting details page), click the 
              <strong>Share</strong> button (or the <strong>Share Link</strong> icon).
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2 font-bold tracking-tight">Step 2: Copy the Link</h3>
            <p className="text-muted-foreground">
              Beespo creates a secure, unique URL for each meeting. Click <strong>Copy Link</strong> to 
              share it via email, WhatsApp, or any other messenger your team uses.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2 font-bold tracking-tight">Step 3: Export Options</h3>
            <p className="text-muted-foreground mr-4">
              Need a physical copy? Beespo allows you to export your agenda to multiple formats:
            </p>
            <div className="flex gap-4 mt-4">
              <div className="p-4 border rounded-lg flex-1 text-center bg-muted/20">
                <span className="text-sm font-semibold">PDF</span>
                <p className="text-[10px] text-muted-foreground">Highest printing quality</p>
              </div>
              <div className="p-4 border rounded-lg flex-1 text-center bg-muted/20">
                <span className="text-sm font-semibold">Markdown</span>
                <p className="text-[10px] text-muted-foreground">Professional document format</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-10 bg-primary/5 p-6 rounded-lg border border-primary/10">
        <h2 className="text-2xl font-semibold mb-4 italic decoration-primary/30 underline-offset-4">Privacy & Access</h2>
        <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
          <li>
            <strong className="text-foreground">Authentication Required:</strong> Most shared agendas require 
            the recipient to be logged in to your workspace. 
          </li>
          <li>
            <strong className="text-foreground">Permissions:</strong> Only members with <strong>Leader</strong> 
            or <strong>Admin</strong> roles can edit an agenda. Other workspace members will see it in <strong>View Only</strong> mode.
          </li>
        </ul>
      </section>

      <hr className="my-10" />

      <footer className="text-muted-foreground text-sm">
        <p>Need help? Contact <a href="mailto:support@beespo.com" className="text-primary underline">support@beespo.com</a> or visit <Link href="/support" className="text-primary underline">beespo.com/support</Link>.</p>
      </footer>
    </article>
  );
}
