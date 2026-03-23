import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Managing Your Profile | Beespo Documentation',
  description: 'Update your personal details, role, and calling description on Beespo.',
};

export default function ManagingYourProfileDocs() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <div className="mb-10">
        <Link href="/docs" className="text-sm text-primary hover:underline underline-offset-4 flex items-center gap-1 mb-4">
          ← Back to Documentation
        </Link>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Managing your profile</h1>
        <p className="text-xl text-muted-foreground">
          Keep your professional profile up to date to ensure your team knows who to contact.
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Overview</h2>
        <p className="text-muted-foreground">
          Each person on Beespo has its own personal profile. This allows team members to know 
          your name, see your role title (like &#34;Relief Society President&#34;), and contact you 
          via email. Keeping this current ensures that agendas and emails correctly identify you.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Steps</h2>
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-medium mb-2">1. Access Personal Account Settings</h3>
            <p className="text-muted-foreground">
              Click on <strong>Settings</strong> in the left-hand sidebar. This will open the 
              <strong>Account</strong> tab by default.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2">2. Update Your Information</h3>
            <p className="text-muted-foreground mb-4">
              From the <strong>Profile Settings</strong> card, you can update:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Full Name:</strong> Your name as you want it to appear to your team and church leaders.</li>
              <li><strong>Role / Calling:</strong> Your specific title in the organization (e.g., Bishop, Elders Quorum Secretary, Primary President).</li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2">3. Save Your Changes</h3>
            <p className="text-muted-foreground">
              After updating your details, click the <strong>Save Changes</strong> button to apply updates to your account.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10 bg-primary/5 p-6 rounded-lg border border-primary/10">
        <h2 className="text-2xl font-semibold mb-4">Security Features</h2>
        <p className="text-muted-foreground mb-4">
          The Account settings page is also where you manage your security.
        </p>
        <div className="space-y-4">
          <div className="border rounded-lg p-4 bg-background">
            <h4 className="font-semibold mb-1">Changing Your Password</h4>
            <p className="text-sm text-muted-foreground">
              Use the <strong>Change Password</strong> form to update your security credentials. Ensure you choose 
              a password that at least 8 characters and is not easy to guess.
            </p>
          </div>
          <div className="border border-destructive/20 rounded-lg p-4 bg-destructive/5 text-destructive">
            <h4 className="font-semibold mb-1">Deleting Your Account</h4>
            <p className="text-sm">
              In the <strong>Danger Zone</strong>, you can permanently delete your account. This will remove your personal 
              data, but your workspace content will remain visible with an attribution to &#34;Former Member.&#34; 
              THIS ACTION CANNOT BE UNDONE.
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
