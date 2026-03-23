import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Creating Your Account | Beespo Documentation',
  description: 'Learn how to create your Beespo account and set up your workspace.',
};

export default function CreatingAccountDocs() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <div className="mb-10">
        <Link 
          href="/docs" 
          className="text-sm text-primary hover:underline underline-offset-4 flex items-center gap-1 mb-4"
        >
          ← Back to Documentation
        </Link>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Creating your account</h1>
        <p className="text-xl text-muted-foreground">
          Everything you need to know about joining Beespo and setting up your workspace.
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Overview</h2>
        <p className="text-muted-foreground">
          Beespo is currently in invitation-only early access. To join the platform, you will need either a personal 
          invite code or an invitation link from a workspace administrator. This ensure we can provide the best 
          experience for all our users during this phase.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Steps</h2>
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-medium mb-2">1. Access the Sign-Up Page</h3>
            <p className="text-muted-foreground">
              Go to <Link href="/signup" className="text-primary underline">beespo.com/signup</Link> or follow the 
              specific invitation link sent to your email.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2">2. Verify Your Invite</h3>
            <p className="text-muted-foreground mb-2">
              Before the sign-up form is revealed, we need to verify your access:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>
                <strong>Invite Codes:</strong> If you have an invite code, enter it into the verification box.
              </li>
              <li>
                <strong>Email Invitations:</strong> If you received an email invitation, your access is automatically 
                verified, and your email address will be pre-filled.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2">3. Choose Your Sign-Up Method</h3>
            <p className="text-muted-foreground mb-4">
              You can create an account using one of two methods:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg bg-muted/30">
                <h4 className="font-semibold mb-1">Google Account</h4>
                <p className="text-sm">The fastest way to get started. Link your existing Google account for instant access.</p>
              </div>
              <div className="p-4 border rounded-lg bg-muted/30">
                <h4 className="font-semibold mb-1">Email & Password</h4>
                <p className="text-sm">Enter your name, email, and a secure password (minimum 6 characters).</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2">4. Finalize Account Setup</h3>
            <p className="text-muted-foreground">
              Check the box to agree to our Terms of Service and Privacy Policy, then click &#34;Create account.&#34;
              If you used the email method, check your inbox for a confirmation link to verify your email address.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2">5. Complete Onboarding</h3>
            <p className="text-muted-foreground">
              Once signed in, Beespo will guide you through a short setup process:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
              <li>
                <strong>Administrators:</strong> You&#39;ll set up your organization (e.g., your Ward or Stake),
                select your calling, and create your workspace.
              </li>
              <li>
                <strong>Team Members:</strong> You&#39;ll confirm your calling title and join your existing workspace
                immediately.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mb-10 bg-primary/5 p-6 rounded-lg border border-primary/10">
        <h2 className="text-2xl font-semibold mb-4">Notes / Tips</h2>
        <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
          <li>
            <strong className="text-foreground">Use the correct email:</strong> If you were invited, you must sign up 
            with the exact email address the invitation was sent to.
          </li>
          <li>
            <strong className="text-foreground">Need Access?</strong> If you don&#39;t have an invite code, reach out
            to your unit leader or email <a href="mailto:support@beespo.com" className="text-primary underline">support@beespo.com</a>.
          </li>
          <li>
            <strong className="text-foreground">Passwords:</strong> Ensure your password is easy for you to remember 
            but difficult for others to guess.
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
