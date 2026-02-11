import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-12 px-4 border-t">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <Link href="/" className="text-lg font-bold tracking-tight">
              Beespo
            </Link>
            <p className="text-sm text-muted-foreground">
              &copy; {currentYear} Beespo. All rights reserved.
            </p>
          </div>

          <nav className="flex gap-6">
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
        </div>

        <div className="mt-8 pt-8 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Independent software. Not affiliated with The Church of Jesus Christ
            of Latter-day Saints.
          </p>
        </div>
      </div>
    </footer>
  );
}
