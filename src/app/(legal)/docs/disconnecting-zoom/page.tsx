import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Disconnecting Zoom | Beespo Documentation',
  description: 'How to safely disconnect your Zoom account from Beespo or remove individual Zoom meetings.',
};

export default function DisconnectingZoomDocs() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <div className="mb-10">
        <Link href="/docs" className="text-sm text-primary hover:underline underline-offset-4 flex items-center gap-1 mb-4">
          ← Back to Documentation
        </Link>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Disconnecting Zoom</h1>
        <p className="text-xl text-muted-foreground">
          Learn how to remove Zoom integration from your workspace or disconnect individual meetings from your agendas.
        </p>
      </div>

      <section className="mb-10 bg-muted/30 p-6 rounded-lg border border-slate-200">
        <h2 className="text-2xl font-semibold mb-4">Warning: Data Removal</h2>
        <p className="font-semibold text-lg mb-4">Disconnecting Zoom will:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Clear Integration:</strong> Beespo will no longer be able to manage meetings on your Zoom account.</li>
          <li><strong>Link Destruction:</strong> All current Zoom links in existing Beespo agendas will be broken.</li>
          <li><strong>Keep Zoom Meetings:</strong> Previous meetings created through Beespo will NOT be deleted from your Zoom account.</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Disconnecting Your Zoom Account</h2>
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-medium mb-2">Step 1: Open Integrations</h3>
            <p className="text-muted-foreground leading-relaxed">
              Navigate to <strong>Settings</strong>  <strong>Integrations</strong> from your dashboard.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2">Step 2: Click Disconnect</h3>
            <p className="text-muted-foreground leading-relaxed">
              Locate the Zoom integration card and click the <strong>Disconnect</strong> button. 
              Confirm your choice in the dialog that follows.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Disconnecting an individual meeting</h2>
        <p className="text-muted-foreground mb-4">
          Sometimes you only want to remove Zoom from a single agenda without disconnecting your 
          entire account.
        </p>
        <div className="space-y-4">
          <div className="border border-neutral-100 rounded-lg p-4 bg-background shadow-xs hover:shadow-xs-hover">
            <h4 className="font-semibold mb-1">Remove From Single Agenda</h4>
            <p className="text-sm leading-relaxed">
              Open the <strong>Zoom Meeting Sheet</strong> and find the <strong>Danger Zone</strong>. 
              Click <strong>Remove Zoom Meeting</strong>.
            </p>
            <p className="text-xs text-muted-foreground mt-2 italic font-medium">Beespo will cancel the linked meeting on Zoom and remove the link from the agenda.</p>
          </div>
        </div>
      </section>

      <hr className="my-10" />

      <footer className="text-muted-foreground text-sm">
        <p>Need help? Contact <a href="mailto:support@beespo.com" className="text-primary underline">support@beespo.com</a> or visit <Link href="/support" className="text-primary underline">beespo.com/support</Link>.</p>
      </footer>
    </article>
  );
}
