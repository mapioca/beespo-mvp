import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Creating a Zoom meeting from Beespo | Beespo Documentation',
  description: 'How to easily create and link a Zoom meeting to any Beespo agenda.',
};

export default function CreatingZoomMeetingsDocs() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <div className="mb-10">
        <Link href="/docs" className="text-sm text-primary hover:underline underline-offset-4 flex items-center gap-1 mb-4">
          ← Back to Documentation
        </Link>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Creating a Zoom meeting from Beespo</h1>
        <p className="text-xl text-muted-foreground">
          Learn how to generate a video call directly from any meeting agenda.
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Overview</h2>
        <p className="text-muted-foreground">
          With a connected Zoom account, you can quickly link a new Zoom meeting to your Beespo agenda. Beespo will use the title, date, and duration you've already set for the meeting.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Steps</h2>
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-medium mb-2">1. Open Your Meeting</h3>
            <p className="text-muted-foreground">
              Navigate to the meeting you want to add Zoom to. Click the meeting title to open the details view.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2">2. Click "Add Zoom Meeting"</h3>
            <p className="text-muted-foreground">
              In the meeting details panel, you'll see an "Add Zoom Meeting" button. Click it to initiate the creation process.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2">3. Confirm Meeting Details</h3>
            <p className="text-muted-foreground">
              Beespo will pre-populate the meeting title, date, and time from your agenda. Review the details and click <strong>Create Meeting</strong> to proceed.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2">4. Meeting Created</h3>
            <p className="text-muted-foreground">
              Your Zoom meeting is now created and linked to your agenda. You'll see the join link and other details in the Zoom Meeting Sheet panel.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Next Steps</h2>
        <p className="text-muted-foreground">
          Once your meeting is created, you can manage it directly from Beespo. See <Link href="/docs/managing-zoom-meetings" className="text-primary underline">Managing Zoom meetings</Link> for details on sharing links, updating meeting info, and managing attendees.
        </p>
      </section>

      <hr className="my-10" />

      <footer className="text-muted-foreground text-sm">
        <p>Need help? Contact <a href="mailto:support@beespo.com" className="text-primary underline">support@beespo.com</a> or visit <Link href="/support" className="text-primary underline">beespo.com/support</Link>.</p>
      </footer>
    </article>
  );
}
