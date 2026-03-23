import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Creating a Meeting | Beespo Documentation',
  description: 'Step-by-step guide to starting a new meeting agenda on Beespo.',
};

export default function CreatingAMeetingDocs() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <div className="mb-10">
        <Link href="/docs" className="text-sm text-primary hover:underline underline-offset-4 flex items-center gap-1 mb-4">
          ← Back to Documentation
        </Link>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Creating a meeting</h1>
        <p className="text-xl text-muted-foreground">
          Learn how to start a new meeting agenda and set the basic details for your organization&#39;s gathering.
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Overview</h2>
        <p className="text-muted-foreground">
          Creating a meeting is the first step in preparing for your team&#39;s collaboration. When you create a meeting, 
          you define the logistics (who, when, and where) and choose whether to start from scratch or use a 
          pre-defined template.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Steps</h2>
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-medium mb-2">1. Start the New Meeting Wizard</h3>
            <p className="text-muted-foreground">
              From your dashboard, click the <strong>Meetings</strong> tab in the sidebar, then click the 
              <strong>New Meeting</strong> button (or the <strong>+</strong> icon).
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2">2. Set Basic Information</h3>
            <p className="text-muted-foreground">
              Enter the meeting <strong>Title</strong> (e.g., &#34;Ward Council Meeting&#34;), select the 
              <strong>Date</strong>, and set the <strong>Time</strong>. By default, the title will automatically 
              update to include the meeting date if you use a template.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2">3. Select a Template (Optional)</h3>
            <p className="text-muted-foreground">
              You can choose from a variety of Beespo-official templates or your own custom templates. 
              Templates pre-populate your agenda with common items, saving you significant preparation time.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2">4. Assign Key Meeting Roles</h3>
            <p className="text-muted-foreground">
              Identify the leaders for the meeting:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground text-sm">
              <li><strong>Presiding:</strong> The highest-ranking leader attending the meeting.</li>
              <li><strong>Conducting:</strong> The leader who will guide the agenda.</li>
              <li><strong>Chorister & Pianist:</strong> (For sacramental or auxiliary meetings) The musical leaders for the day.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mb-10 bg-primary/5 p-6 rounded-lg border border-primary/10">
        <h2 className="text-2xl font-semibold mb-4">Pro Tips</h2>
        <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
          <li>
            <strong className="text-foreground">Recurring Meetings:</strong> If you meet every Sunday at 10:00 AM, 
            using a template ensures your roles and agenda structure stay consistent every week.
          </li>
          <li>
            <strong className="text-foreground">Draft Status:</strong> Meetings are saved as drafts until you 
            are ready to share them. You can always come back and edit the details later.
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
