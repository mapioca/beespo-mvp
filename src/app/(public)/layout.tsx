import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Beespo - Public View",
  description: "View shared meeting agendas",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[color:hsl(var(--program-preview-surface))] flex flex-col">
      <main className="flex-1 flex flex-col">{children}</main>

      <footer className="mt-auto bg-transparent">
        <div className="container mx-auto flex flex-col items-center gap-1 px-4 py-4 text-center text-sm text-muted-foreground">
          <Link
            href="https://beespo.com"
            className="hover:text-foreground transition-colors"
          >
            Powered by Beespo
          </Link>
          <p className="max-w-prose text-xs text-muted-foreground/80">
            Beespo is an independent product, not affiliated with or endorsed by
            The Church of Jesus Christ of Latter-day Saints.
          </p>
        </div>
      </footer>
    </div>
  );
}
