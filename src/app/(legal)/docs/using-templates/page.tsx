import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Using Templates | Beespo Documentation',
  description: 'Learn how to use, manage, and create agenda templates to speed up your meeting preparation.',
};

export default function UsingTemplatesDocs() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <div className="mb-10">
        <Link href="/docs" className="text-sm text-primary hover:underline underline-offset-4 flex items-center gap-1 mb-4">
          ← Back to Documentation
        </Link>
        <h1 className="text-4xl font-bold tracking-tight mb-2 font-bold tracking-tight">Using templates</h1>
        <p className="text-xl text-muted-foreground">
          Agenda templates save you time and keep your meetings consistent across your entire organization.
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Overview</h2>
        <p className="text-muted-foreground">
          Think of a template as a blueprint for your meeting. Instead of manually adding 
          the opening prayer, hymns, and business items every week, you can use a template 
          that pre-populates your agenda in seconds.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Types of Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
          <div className="p-6 border rounded-xl bg-primary/5 border-primary/20 shadow-sm shadow-primary/10">
            <h3 className="font-bold text-lg mb-2 text-primary">Beespo Official Templates</h3>
            <p className="text-sm text-muted-foreground">
              These are standard templates verified by Beespo for common church meetings:
            </p>
            <ul className="list-disc pl-6 text-xs text-muted-foreground space-y-1 mt-2 font-medium">
              <li>Sacrament Meeting</li>
              <li>Ward Council</li>
              <li>Bishopric Meeting</li>
              <li>Relief Society / Elders Quorum</li>
              <li>Aaronic Priesthood / Young Women</li>
            </ul>
          </div>
          <div className="p-6 border rounded-xl bg-background border-slate-200">
            <h3 className="font-bold text-lg mb-2">Custom Workspace Templates</h3>
            <p className="text-sm text-neutral-600">
              Templates specific to your unit (e.g., Ward Missionary coordination). Your 
              team can create and manage their own library of custom templates.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Using Templates</h2>
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-medium mb-2 font-bold tracking-tight">Step 1: Choose a Template</h3>
            <p className="text-muted-foreground">
              When creating a <strong>New Meeting</strong>, choose a template from the 
              <strong> Template Library</strong> dropdown. This will pre-fill your agenda items 
              based on that blueprint.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2 font-bold tracking-tight">Step 2: Save as Template</h3>
            <p className="text-muted-foreground">
              Built an agenda that you want to reuse? Click the <strong>Save as Template</strong> icon 
              at the top of the <strong>Agenda Builder</strong>. 
              Give your new template a unique name and it will be saved for all members of 
              your workspace.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2 font-bold tracking-tight text-destructive-700">Step 3: Manage Template Library</h3>
            <p className="text-muted-foreground">
              Navigate to the <strong>Templates</strong> tab in the sidebar to review, 
              edit, or delete existing workspace templates.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10 bg-primary/5 p-6 rounded-lg border border-primary/10">
        <h2 className="text-2xl font-semibold mb-4 underline decoration-primary/30 underline-offset-4 font-bold tracking-tight">Best Practices</h2>
        <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
          <li>
            <strong className="text-foreground">Set Durations:</strong> Ensure your templates have estimated 
            durations for each item. This gives you a clear total time estimate every week.
          </li>
          <li>
            <strong className="text-foreground">Official Templates:</strong> If you start with a Beespo 
            official template, you can customize it and <strong>Save it as a new workspace template</strong> 
            to permanently capture your unit&#39;s specific variations.
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
