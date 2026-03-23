import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Workspace Settings | Beespo Documentation',
  description: 'Learn how to manage your workspace name, organization type, and unit details.',
};

export default function WorkspaceSettingsDocs() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <div className="mb-10">
        <Link href="/docs" className="text-sm text-primary hover:underline underline-offset-4 flex items-center gap-1 mb-4">
          ← Back to Documentation
        </Link>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Workspace settings</h1>
        <p className="text-xl text-muted-foreground">
          Configure your workspace specifically for your church unit to ensure seamless organization and cooperation.
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Overview</h2>
        <p className="text-muted-foreground">
          A workspace represents a unique church unit organization (e.g., of a Ward Bishopric). 
          Administrators can manage the overarching workspace settings to ensure the identity and 
          structure are correct for all members.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Steps</h2>
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-medium mb-2">1. Access Workspace Settings</h3>
            <p className="text-muted-foreground">
              Click on <strong>Settings</strong> in the left-hand sidebar, then select the 
              <strong>Workspace</strong> tab.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2">2. Update Your Workspace Information</h3>
            <p className="text-muted-foreground mb-4">
              From the <strong>Workspace Details</strong> card, you can update:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Workspace Name:</strong> The name that appears at the top of your dashboard (e.g., &#34;Silvercreek Ward Bishopric&#34;).</li>
              <li><strong>Workspace Type:</strong> This represents your unit type (Ward, Branch, Stake, or District). 
              Changing this can update the structure of templates you see.</li>
              <li><strong>Organization Type:</strong> The specific group (Bishopric, Elders Quorum, etc.).</li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2">3. Save Your Changes</h3>
            <p className="text-muted-foreground">
              After updating your details, click the <strong>Save</strong> button to apply updates to your workspace.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10 bg-primary/5 p-6 rounded-lg border border-primary/10">
        <h2 className="text-2xl font-semibold mb-4">Permissions and Admin Rights</h2>
        <p className="text-muted-foreground mb-4">
          Workspace-wide settings are restricted to ensure consistency across the organization.
        </p>
        <div className="space-y-4">
          <div className="border border-primary/20 rounded-lg p-4 bg-background">
            <h4 className="font-semibold mb-1 text-primary">Administrator Required</h4>
            <p className="text-sm text-neutral-600">
              Only workspace <strong>Admins</strong> have the permission to change the workspace name or modify 
              the core structure. If you are a <strong>Leader</strong> or <strong>Guest</strong>, you 
              can view these settings but cannot save changes.
            </p>
          </div>
          <div className="border border-amber-200 rounded-lg p-4 bg-amber-50 text-amber-900">
            <h4 className="font-semibold mb-1">Consistency Matters</h4>
            <p className="text-sm">
              Keep your workspace name clear and consistent with your official church unit naming to prevent 
              confusion when members are added or when collaborating on multiple workspaces.
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
