import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Beespo - Public View",
  description: "View shared meeting agendas",
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Minimal header for public pages */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">Beespo</span>
              <span className="text-xs bg-muted px-2 py-0.5 rounded">Public View</span>
            </div>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t bg-muted/30 mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          <p>Powered by Beespo</p>
        </div>
      </footer>
    </div>
  );
}
