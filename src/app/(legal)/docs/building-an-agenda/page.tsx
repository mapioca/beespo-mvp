import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Building an Agenda | Beespo Documentation',
  description: 'How to use the drag-and-drop builder to create a powerful meeting agenda on Beespo.',
};

export default function BuildingAnAgendaDocs() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <div className="mb-10">
        <Link href="/docs" className="text-sm text-primary hover:underline underline-offset-4 flex items-center gap-1 mb-4">
          ← Back to Documentation
        </Link>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Building an agenda</h1>
        <p className="text-xl text-muted-foreground">
          Master the drag-and-drop agenda builder to create rich, structured meeting plans.
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Overview</h2>
        <p className="text-muted-foreground">
          The Beespo agenda builder is a powerful visual workspace. Instead of typing into a 
          document, you drag and drop modular items. This makes reordering easy and ensures 
          your meeting data stays structured and reusable.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">The Agenda Builder Workspace</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
          <div className="p-4 border rounded-lg bg-muted/20">
            <h3 className="font-bold text-sm mb-2">Left: The Toolbox</h3>
            <p className="text-xs text-muted-foreground">Find procedural items, hymns, talking points, and containers to drag onto the canvas.</p>
          </div>
          <div className="p-4 border rounded-lg bg-primary/5 border-primary/20 shadow-sm shadow-primary/10">
            <h3 className="font-bold text-sm mb-2 text-primary">Center: The Agenda Canvas</h3>
            <p className="text-xs text-muted-foreground font-medium">Your agenda comes to life here. Arrange your items in the order they&#39;ll occur.</p>
          </div>
          <div className="p-4 border rounded-lg bg-muted/20 text-right">
            <h3 className="font-bold text-sm mb-2">Right: Properties Pane</h3>
            <p className="text-xs text-muted-foreground">Click any item on the canvas to edit its details, set its duration, or add notes.</p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Agenda Item Types</h2>
        <div className="space-y-6">
          <div className="border border-neutral-100 rounded-lg p-4 bg-background shadow-xs">
            <h3 className="text-lg font-semibold mb-2">Procedural Items</h3>
            <p className="text-sm text-muted-foreground mb-4">Standard meeting elements (e.g., Prayers, Hymns, Speaker slots, Sustaining of officers).</p>
            <ul className="list-disc pl-6 text-xs text-muted-foreground space-y-1 font-medium">
              <li><strong>Prayers / Benedictions:</strong> Use the <strong>Unified Selector</strong> to pick a participant.</li>
              <li><strong>Hymns:</strong> Use the <strong>Hymn Search</strong> to find a hymn title and its number.</li>
            </ul>
          </div>

          <div className="border border-neutral-100 rounded-lg p-4 bg-background shadow-xs">
            <h3 className="text-lg font-semibold mb-2">Containers (Integrated Content)</h3>
            <p className="text-sm text-muted-foreground mb-4">Dynamically pull in active discussions, business items, or announcements from the rest of Beespo.</p>
            <ul className="list-disc pl-6 text-xs text-muted-foreground space-y-1">
              <li><strong>Discussions:</strong> Link to specific ongoing presidency discussion items.</li>
              <li><strong>Business Items:</strong> Bring in calls for sustaining, releases, or other unit business.</li>
              <li><strong>Announcements:</strong> Organize and prioritize important announcements.</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-4">Click the <strong>(+) icon</strong> on a container to choose items to add.</p>
          </div>

          <div className="border border-neutral-100 rounded-lg p-4 bg-background shadow-xs">
            <h3 className="text-lg font-semibold mb-2">Structural Items</h3>
            <p className="text-sm text-muted-foreground">Add headers, separators, or spacers to organize long agendas into readable sections.</p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Steps to Build Your Agenda</h2>
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-medium mb-2 font-bold tracking-tight">Step 1: Drag & Drop Items</h3>
            <p className="text-muted-foreground">
              Scroll through the <strong>Toolbox</strong> on the left. Click and drag an item onto the <strong>Agenda Canvas</strong>. Beespo will automatically snap it into place.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2 font-bold tracking-tight">Step 2: Reorder & Organize</h3>
            <p className="text-muted-foreground">
              Need to move a talk or move announcements after the sacrament? Just <strong>click and drag</strong> items already on the canvas to their new position.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2 font-bold tracking-tight">Step 3: Edit Details</h3>
            <p className="text-muted-foreground">
              Click an item on the canvas. The <strong>Properties Pane</strong> on the right will allow you to edit:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground text-sm font-medium">
              <li><strong>Title & Description:</strong> Customize the display name.</li>
              <li><strong>Duration:</strong> Set time (in minutes) to keep your meeting on schedule.</li>
              <li><strong>Participants:</strong> Assign speakers or prayer-givers.</li>
              <li><strong>Private Notes:</strong> Notes only visible to the leaders during the meeting.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mb-10 bg-primary/5 p-6 rounded-lg border border-primary/10">
        <h2 className="text-2xl font-semibold mb-4 underline decoration-primary/30 underline-offset-4">Agenda Tips</h2>
        <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
          <li>
            <strong className="text-foreground">Total Meeting Time:</strong> Beespo calculates the total estimated duration 
            at the bottom of your agenda, helping you ensure meetings finish on time.
          </li>
          <li>
            <strong className="text-foreground">Expanding Containers:</strong> Use the <strong>chevron arrow</strong> to 
            expand or collapse container items (Discussions, Business, etc.) to keep your view organized.
          </li>
          <li>
            <strong className="text-foreground">Delete Items:</strong> Click the <strong>Trash icon</strong> on 
            any item in the canvas to remove it.
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
