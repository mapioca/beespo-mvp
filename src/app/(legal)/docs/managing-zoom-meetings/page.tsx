import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Managing Zoom Meetings | Beespo Documentation',
  description: 'How to use the Zoom Meeting Sheet in Beespo to join, update, and manage your video calls.',
};

export default function ManagingZoomMeetingsDocs() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none underline decoration-sky-100">
      <div className="mb-10 text-[#2D8CFF]">
        <Link href="/docs" className="text-sm text-primary hover:underline underline-offset-4 flex items-center gap-1 mb-4">
          ← Back to Documentation
        </Link>
        <h1 className="text-4xl font-bold tracking-tight mb-2 font-bold tracking-tight uppercase">Managing Zoom meetings</h1>
        <p className="text-xl">
          Everything you need to know about joining and updating your Zoom meeting within Beespo.
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Overview</h2>
        <p className="text-muted-foreground">
          When you link a Zoom meeting to your agenda, you have several powerful 
          features available to you in the <strong>Zoom Meeting Sheet</strong>. 
          This side pane keeps your Beespo and Zoom schedules perfectly in sync.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Joining & Starting</h2>
        <div className="flex gap-4 mt-4">
          <div className="p-4 border border-[#2D8CFF]/20 rounded-lg flex-1 text-center bg-sky-50 dark:bg-sky-950/20 shadow-sm shadow-sky-100">
            <span className="text-sm font-semibold text-[#2D8CFF]">Start Meeting</span>
            <p className="text-xs text-muted-foreground">Only for the host (the connected Zoom user).</p>
          </div>
          <div className="p-4 border border-slate-200 rounded-lg flex-1 text-center bg-muted/20">
            <span className="text-sm font-semibold">Join Meeting</span>
            <p className="text-xs text-muted-foreground">For all participants to join from the agenda.</p>
          </div>
        </div>
      </section>

      <section className="mb-10 px-4">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Features of the Zoom Meeting Sheet</h2>
        <div className="space-y-6">
          <div className="border border-neutral-100 rounded-lg p-4 bg-background shadow-xs hover:shadow-xs-hover">
            <h3 className="text-lg font-semibold mb-1 font-bold tracking-tight">One-Click Copying</h3>
            <p className="text-sm text-muted-foreground">
              Quickly <strong>Copy the Join Link</strong> or <strong>Passcode</strong> 
              with a single click to share with your presidency or leaders via messenger or email.
            </p>
          </div>

          <div className="border border-neutral-100 rounded-lg p-4 bg-background shadow-xs hover:shadow-xs-hover">
            <h3 className="text-lg font-semibold mb-1 font-bold tracking-tight">Direct Invitation</h3>
            <p className="text-sm text-muted-foreground">
              In the <strong>Invite via Email</strong> section, enter an email address and click 
              <strong>Send</strong>. Beespo will send a direct Zoom invitation link to that person.
            </p>
          </div>

          <div className="border border-neutral-100 rounded-lg p-4 bg-background shadow-xs shadow-sky-50/50 hover:shadow-xs-hover">
            <h3 className="text-lg font-semibold mb-1 font-bold tracking-tight text-[#2D8CFF]">Real-Time Edits & Sync</h3>
            <p className="text-sm text-neutral-600">
              Need to reschedule or change the meeting topic? 
              Modify the <strong>Topic</strong>, <strong>Date & Time</strong>, or 
              <strong>Duration</strong> in the <strong>Edit Meeting</strong> section 
              and click <strong>Save Changes</strong>.
            </p>
            <p className="text-xs text-muted-foreground mt-2 italic font-medium">Beespo updates the meeting on Zoom instantly.</p>
          </div>
        </div>
      </section>

      <section className="mb-10 bg-[#2D8CFF]/5 p-6 rounded-lg border border-[#2D8CFF]/20 shadow-sm shadow-[#2D8CFF]/10">
        <h2 className="text-2xl font-semibold mb-4 text-[#2D8CFF] font-bold tracking-tight italic">Zoom Account Limits</h2>
        <p className="text-muted-foreground mb-4 font-medium">
          Beespo detects your Zoom account status:
        </p>
        <div className="space-y-4">
          <div className="border border-amber-200 rounded-lg p-4 bg-amber-50 text-amber-900 border-l-4">
            <h4 className="font-semibold mb-1">40-Minute Limit (Free Accounts)</h4>
            <p className="text-xs leading-relaxed">
              If your Zoom account is a free version, Beespo will warn you that meetings are 
              limited to <strong>40 minutes</strong>. We recommend upgrading at zoom.us for 
              longer Ward Councils or presidency meetings.
            </p>
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
