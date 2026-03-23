import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Inviting Team Members | Beespo Documentation',
  description: 'Learn how to invite other presidency members and leaders to collaborate in your Beespo workspace.',
};

export default function InvitingTeamMembersDocs() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <div className="mb-10">
        <Link href="/docs" className="text-sm text-primary hover:underline underline-offset-4 flex items-center gap-1 mb-4">
          ← Back to Documentation
        </Link>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Inviting team members</h1>
        <p className="text-xl text-muted-foreground">
          Collaboration is at the heart of Beespo. Invite your presidency and secretaries to streamline your meeting preparation.
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Overview</h2>
        <p className="text-muted-foreground">
          Beespo workspaces allow multiple users to work together on the same agendas, tasks, and notes. 
          As an administrator, you can invite others via email and assign them specific roles based on their 
          responsibilities in the organization.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Steps</h2>
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-medium mb-2">1. Open Team Settings</h3>
            <p className="text-muted-foreground">
              From your dashboard, click on <strong>Settings</strong> in the left-hand sidebar, then navigate to the <strong>Team</strong> tab.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2">2. Click &#34;Invite Member&#34;</h3>
            <p className="text-muted-foreground">
              Click the <strong>Invite Member</strong> button to open the invitation dialog.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2">3. Enter Member Details</h3>
            <p className="text-muted-foreground">
              Enter the email address of the person you want to invite and select their role:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
              <li><strong>Admin:</strong> Can manage settings, invites, and all meeting content.</li>
              <li><strong>Leader:</strong> Can create, edit, and conduct meetings.</li>
              <li><strong>Guest:</strong> Can view agendas and notes but cannot make changes.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2">4. Send the Invitation</h3>
            <p className="text-muted-foreground">
              Click <strong>Send Invitation</strong>. The recipient will receive an email with a unique link 
              to join your workspace.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10 bg-primary/5 p-6 rounded-lg border border-primary/10">
        <h2 className="text-2xl font-semibold mb-4">Notes / Tips</h2>
        <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
          <li>
            <strong className="text-foreground">Pending Invites:</strong> You can track, resend, or cancel 
            invitations that haven&#39;t been accepted yet from the <strong>Pending Invitations</strong> section.
          </li>
          <li>
            <strong className="text-foreground">Role Hierarchy:</strong> Only Admins can invite or remove other members.
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
