import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Deleting Your Account | Beespo Documentation',
  description: 'How to permanently delete your personal Beespo account and manage your data deletion.',
};

export default function DeletingYourAccountDocs() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <div className="mb-10">
        <Link href="/docs" className="text-sm text-primary hover:underline underline-offset-4 flex items-center gap-1 mb-4">
          ← Back to Documentation
        </Link>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Deleting your account</h1>
        <p className="text-xl text-muted-foreground">
          Permanently delete your account and personal information from the Beespo platform.
        </p>
      </div>

      <section className="mb-10 bg-muted/30 p-6 rounded-lg border border-slate-200">
        <h2 className="text-2xl font-semibold mb-4">Warning: Irreversible Action</h2>
        <p className="text-muted-foreground mb-4">Proceeding with account deletion will:</p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li><strong>Permanently remove:</strong> Your name, email address, password, and profile preferences from our servers.</li>
          <li><strong>Detach:</strong> Your workspace membership and any roles you currently hold.</li>
          <li><strong>Leave content intact:</strong> Meetings, agendas, notes, and tasks you created will remain in the workspace, with your name attributed to them or replaced by &#34;Former Member&#34; for privacy and workspace continuity.</li>
        </ul>
        <p className="mt-4 text-muted-foreground font-semibold">THIS ACTION CANNOT BE UNDONE.</p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Steps to Delete Your Account</h2>
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-medium mb-2">1. Access Settings</h3>
            <p className="text-muted-foreground leading-relaxed">
              Log in to your Beespo account and click on <strong>Settings</strong> at the bottom of the left-hand sidebar.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2">2. Navigate to the Account Tab</h3>
            <p className="text-muted-foreground leading-relaxed">
              Stay on the default <strong>Account</strong> tab and scroll down to the bottom of the page.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2">3. Open the Danger Zone</h3>
            <p className="text-muted-foreground leading-relaxed">
              Find the <strong>Danger Zone</strong> section and click the <strong>Delete Account</strong> button.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2">4. Confirm Deletion</h3>
            <p className="text-muted-foreground leading-relaxed">
              A confirmation dialog will appear. You will need to type your account email address to confirm 
              your identity and finalize the deletion of your account.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10 bg-primary/5 p-6 rounded-lg border border-primary/10">
        <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
        <div className="space-y-6">
          <div>
            <h4 className="font-bold mb-1">Will my team lose work?</h4>
            <p className="text-sm text-neutral-600">
              No. All collaborative work (agendas, shared notes) resides in the common workspace. 
              Only your personal user profile is removed.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-1">What if I change my mind?</h4>
            <p className="text-sm text-neutral-600">
              You cannot restore a deleted account. You would need to be invited back to Beespo 
              and follow the onboarding process again to rejoin your team and organizations.
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
