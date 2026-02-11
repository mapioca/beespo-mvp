import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-12 px-4 border-t">
      <div className="container mx-auto text-center">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Beespo
        </Link>
        <p className="text-sm text-muted-foreground mt-2">
          A product of Bishopric Technologies LLC
        </p>

        <nav className="flex justify-center gap-6 mt-6">
          <Link
            href="#"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Terms
          </Link>
          <Link
            href="#"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy
          </Link>
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign In
          </Link>
        </nav>

        <p className="text-xs text-muted-foreground mt-8">
          &copy; {currentYear} Beespo. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
