import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Setting Up Your Workspace | Beespo Documentation',
  description: 'Learn how to configure your workspace, manage your team members, and customize your profile settings.',
};

export default function SettingUpWorkspaceDocs() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <div className="mb-10">
        <Link 
          href="/docs" 
          className="text-sm text-primary hover:underline underline-offset-4 flex items-center gap-1 mb-4"
        >
          ← Back to Documentation
        </Link>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Setting up your workspace</h1>
        <p className="text-xl text-muted-foreground">
          Your workspace is the central hub where your team collaborates on meeting agendas, shares notes, and tracks tasks.
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Overview</h2>
        <p className="text-muted-foreground">
          When you first create an account on Beespo, you&#39;ll be guided through a workspace setup wizard. 
          This process tailors the platform to your specific church unit and organization, ensuring that 
          templates and roles match your day-to-day needs.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Initial Setup Steps</h2>
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-medium mb-2">1. Select Your Unit Type</h3>
            <p className="text-muted-foreground">
              Choose the type of unit you are serving in (e.g., Ward, Branch, Stake, or District). 
              This helps Beespo understand the structure of your organization.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2">2. Identify Your Organization</h3>
            <p className="text-muted-foreground">
              Select the specific organization you are part of, such as the Bishopric, Relief Society, 
              Elders Quorum, or Young Women.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2">3. Define Your Calling</h3>
            <p className="text-muted-foreground">
              Select your primary calling within that organization. This will be your default 
              title in meetings and on the team roster.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2">4. Name Your Unit</h3>
            <p className="text-muted-foreground">
              Enter the official name of your unit (e.g., &#34;Silvercreek Ward&#34;). Beespo will 
              automatically generate a workspace name for you based on your unit and organization.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Managing Your Workspace</h2>
        <p className="text-muted-foreground mb-6">
          Once your workspace is created, you can access advanced settings by clicking on 
          <strong> Settings</strong> in the sidebar.
        </p>
        
        <div className="space-y-6">
          <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Workspace Profile</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Administrators can update the Workspace Name at any time. This is useful if your 
              unit name changes or if you want to further specify the workspace purpose.
            </p>
          </div>

          <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Team Management</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Invite other presidency members or secretaries to your workspace. You can assign 
              roles such as <strong>Admin</strong> (full control), <strong>Leader</strong> (can create 
              and edit meetings), or <strong>Guest</strong> (view only).
            </p>
          </div>

          <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Integrations</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Connect your Zoom account to automatically create and manage video conference links 
              directly from your Beespo agendas.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10 bg-primary/5 p-6 rounded-lg border border-primary/10">
        <h2 className="text-2xl font-semibold mb-4">Notes / Tips</h2>
        <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
          <li>
            <strong className="text-foreground">Admins vs. Leaders:</strong> Only Admins can modify workspace-wide 
            settings and invite new members. Leaders can handle all meeting-related tasks.
          </li>
          <li>
            <strong className="text-foreground">Personal Profile:</strong> You can update your own name and role 
            title under the &#34;Account&#34; tab in Settings.
          </li>
          <li>
            <strong className="text-foreground">Switching Workspaces:</strong> If you serve in multiple callings, 
            you can belong to multiple workspaces and switch between them easily from the sidebar.
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
