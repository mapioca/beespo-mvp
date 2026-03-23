import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Billing and Plans | Beespo Documentation',
  description: 'Information about Beespo pricing, plans, and billing management.',
};

export default function BillingDocs() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none text-center py-20">
      <div className="mb-10">
        <Link href="/docs" className="text-sm text-primary hover:underline underline-offset-4 flex items-center justify-center gap-1 mb-4">
          ← Back to Documentation
        </Link>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Billing and plans</h1>
        <p className="text-xl text-muted-foreground">
          Everything you need to know about Beespo pricing and workspace subscription management.
        </p>
      </div>

      <div className="p-8 border border-dashed rounded-xl bg-muted/30 inline-block mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-semibold mb-2">Coming Soon</h2>
        <p className="text-muted-foreground mb-6">
          We are currently in early access, and all features are available to invited users free of charge. 
          Detailed information about our future pricing tiers and plan management will be posted here as 
          soon as we launch our public beta.
        </p>
        <Link 
          href="/support" 
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90"
        >
          Request Early Access
        </Link>
      </div>

      <hr className="my-10" />

      <footer className="text-muted-foreground text-sm">
        <p>Need help? Contact <a href="mailto:support@beespo.com" className="text-primary underline">support@beespo.com</a> or visit <Link href="/support" className="text-primary underline">beespo.com/support</Link>.</p>
      </footer>
    </article>
  );
}
