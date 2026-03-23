import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Connecting Your Zoom Account | Beespo Documentation',
  description: 'How to link your Zoom account to Beespo for easy meeting management.',
};

export default function ConnectingZoomDocs() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <div className="mb-10 text-[#2D8CFF]">
        <Link href="/docs" className="text-sm text-primary hover:underline underline-offset-4 flex items-center gap-1 mb-4">
          ← Back to Documentation
        </Link>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Connecting your Zoom account</h1>
        <p className="text-xl">
          Integrate Zoom with Beespo to automatically schedule, manage, and start video calls directly from your agendas.
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Overview</h2>
        <p className="text-muted-foreground">
          Beespo identifies that many church meetings happen remotely or in a hybrid format. 
          By connecting your Zoom account, you eliminate the need to manually create meetings, 
          copy-paste links, and manage two separate schedules.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Steps to Connect</h2>
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-medium mb-2 font-bold tracking-tight">Step 1: Navigate to Integrations</h3>
            <p className="text-muted-foreground leading-relaxed">
              Click on <strong>Settings</strong> in the left-hand sidebar, then select the 
              <strong>Integrations</strong> tab.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2 font-bold tracking-tight">Step 2: Sign in with Zoom</h3>
            <p className="text-muted-foreground leading-relaxed">
              Find the Zoom card and click the <strong>Connect Zoom</strong> button. This will redirect 
              you to the official Zoom authorization page.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2 font-bold tracking-tight">Step 3: Authorize Beespo</h3>
            <p className="text-muted-foreground leading-relaxed">
              Review the permissions and click <strong>Authorize</strong>. Beespo requires permission 
              to create and edit meetings on your behalf.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2 font-bold tracking-tight">Step 4: Verify Connection</h3>
            <p className="text-muted-foreground leading-relaxed">
              You will be returned to the Beespo settings page. If successful, you will see your 
              Zoom account email listed as &#34;Connected.&#34;
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10 bg-[#2D8CFF]/5 p-6 rounded-lg border border-[#2D8CFF]/20 shadow-sm shadow-[#2D8CFF]/10">
        <h2 className="text-2xl font-semibold mb-4 text-[#2D8CFF] font-bold tracking-tight">Why connect Zoom?</h2>
        <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
          <li>
            <strong className="text-foreground">One-Click Scheduling:</strong> Create a Zoom meeting instantly 
            when you build an agenda.
          </li>
          <li>
            <strong className="text-foreground">Automatic Sync:</strong> Change the meeting time in Beespo, 
            and it updates on Zoom automatically.
          </li>
          <li>
            <strong className="text-foreground">Integrated Experience:</strong> Participants can join directly 
            from the shared Beespo agenda link.
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
