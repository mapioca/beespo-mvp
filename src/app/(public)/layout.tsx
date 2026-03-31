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
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          <Link
            href="https://beespo.com"
            className="hover:text-foreground transition-colors"
          >
            Powered by Beespo
          </Link>
        </div>
      </footer>
    </div>
  );
}
