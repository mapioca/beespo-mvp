import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Creating a Zoom Meeting from Beespo | Beespo Documentation',
  description: 'How to easily create and link a Zoom meeting to any Beespo agenda.',
};

export default function CreatingZoomMeetingsDocs() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <div className="mb-10 text-[#2D8CFF]">
        <Link href="/docs" className="text-sm text-primary hover:underline underline-offset-4 flex items-center gap-1 mb-4">
          ← Back to Documentation
        </Link>
        <h1 className="text-4xl font-bold tracking-tight mb-2 font-bold tracking-tight uppercase">Creating a Zoom meeting from Beespo</h1>
        <p className="text-xl">
          Learn how to generate a video call directly from any meeting agenda.
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Overview</h2>
        <p className="text-muted-foreground">
          With a connected Zoom account, you can quickly link a new Zoom meeting 
          to your Beespo agenda. Beespo will use the title, date, and duration 
          you&#39;ve already set for the meeting.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Steps to Create</h2>
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-medium mb-2 font-bold tracking-tight">Step 1: Open an Agenda</h3>
            <p className="text-muted-foreground leading-relaxed">
              Open the <strong>Agenda Builder</strong> for any meeting you want to conduct.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2 font-bold tracking-tight">Step 2: Find the Zoom Icon</h3>
            <p className="text-muted-foreground leading-relaxed">
              Look for the <strong>Zoom Icon</strong> at the bottom of the left-hand sidebar 
              (if in builder) or at the top of the meeting details page.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2 font-bold tracking-tight text-[#2D8CFF]">Step 3: Click &#34;Create Zoom Meeting&#34;</h3>
            <p className="text-muted-foreground leading-relaxed">
              In the dialog that appears, click the <strong>Create Zoom Meeting</strong> button. 
              Beespo will instantly create a meeting on your Zoom account and link it 
              to this agenda.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2 font-bold tracking-tight">Step 4: Success!</h3>
            <p className="text-muted-foreground leading-relaxed">
              The join link and passcode will be automatically saved to your Beespo agenda. 
              The <strong>Zoom Meeting Sheet</strong> will open from the right to show you 
              the linked details and join options.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10 bg-[#2D8CFF]/5 p-6 rounded-lg border border-[#2D8CFF]/20 shadow-sm shadow-[#2D8CFF]/10">
        <h2 className="text-2xl font-semibold mb-4 text-[#2D8CFF] font-bold tracking-tight underline-offset-4 decoration-current underline">Automatic Information Mapping</h2>
        <p className="text-muted-foreground mb-4">
          Beespo ensures your Zoom and Beespo meetings stay in sync:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground text-sm font-medium">
          <li><strong>Topic:</strong> Beespo uses your meeting title for the Zoom topic.</li>
          <li><strong>Start Time:</strong> Beespo uses the scheduled date and time from your agenda.</li>
          <li><strong>Duration:</strong> Beespo calculates the total agenda duration and uses that for your Zoom meeting length.</li>
        </ul>
      </section>

      <hr className="my-10" />

      <footer className="text-muted-foreground text-sm">
        <p>Need help? Contact <a href="mailto:support@beespo.com" className="text-primary underline">support@beespo.com</a> or visit <Link href="/support" className="text-primary underline">beespo.com/support</Link>.</p>
      </footer>
    </article>
  );
}
