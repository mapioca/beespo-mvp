import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Managing Zoom meetings | Beespo Documentation',
  description: 'How to use the Zoom Meeting Sheet in Beespo to join, update, and manage your video calls.',
};

export default function ManagingZoomMeetingsDocs() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <div className="mb-10">
        <Link href="/docs" className="text-sm text-primary hover:underline underline-offset-4 flex items-center gap-1 mb-4">
          ← Back to Documentation
        </Link>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Managing Zoom meetings</h1>
        <p className="text-xl text-muted-foreground">
          Everything you need to know about joining and updating your Zoom meeting within Beespo.
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Overview</h2>
        <p className="text-muted-foreground">
          When you link a Zoom meeting to your agenda, you have several powerful features available to you in the <strong>Zoom Meeting Sheet</strong>. This side pane keeps your Beespo and Zoom schedules perfectly in sync.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Joining & Starting</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="p-4 border rounded-lg bg-muted/30">
            <h4 className="font-semibold mb-1">Start Meeting</h4>
            <p className="text-sm text-muted-foreground">Only for the host (the connected Zoom user).</p>
          </div>
          <div className="p-4 border rounded-lg bg-muted/30">
            <h4 className="font-semibold mb-1">Join Meeting</h4>
            <p className="text-sm text-muted-foreground">For all participants to join from the agenda.</p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Features of the Zoom Meeting Sheet</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">One-Click Copying</h3>
            <p className="text-muted-foreground">
              Quickly copy the <strong>Join Link</strong> or <strong>Passcode</strong> with a single click to share with your presidency or leaders via messenger or email.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Direct Invitation</h3>
            <p className="text-muted-foreground">
              In the <strong>Invite via Email</strong> section, enter an email address and click <strong>Send</strong>. Beespo will send a direct Zoom invitation link to that person.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Real-Time Edits & Sync</h3>
            <p className="text-muted-foreground">
              Need to reschedule or change the meeting topic? Modify the <strong>Topic</strong>, <strong>Date & Time</strong>, or <strong>Duration</strong> in the <strong>Edit Meeting</strong> section and click <strong>Save Changes</strong>. Beespo updates the meeting on Zoom instantly.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Zoom Account Limits</h2>
        <p className="text-muted-foreground mb-4">
          Beespo detects your Zoom account status and displays any applicable limits:
        </p>
        <div className="p-4 border rounded-lg bg-muted/30">
          <h3 className="font-semibold mb-2">40-Minute Limit (Free Accounts)</h3>
          <p className="text-muted-foreground text-sm">
            If your Zoom account is a free version, Beespo will warn you that meetings are limited to 40 minutes. We recommend upgrading at zoom.us for longer Ward Councils or presidency meetings.
          </p>
        </div>
      </section>

      <hr className="my-10" />

      <footer className="text-muted-foreground text-sm">
        <p>Need help? Contact <a href="mailto:support@beespo.com" className="text-primary underline">support@beespo.com</a> or visit <Link href="/support" className="text-primary underline">beespo.com/support</Link>.</p>
      </footer>
    </article>
  );
}
