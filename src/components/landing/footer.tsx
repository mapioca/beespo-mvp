import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="px-4 pb-12 pt-4"
      style={{ background: "var(--brand-cream)" }}
    >
      <div
        className="container mx-auto max-w-6xl rounded-2xl px-8 py-12 md:px-14 md:py-16"
        style={{
          background: "color-mix(in srgb, var(--brand-walnut) 6%, var(--brand-cream))",
        }}
      >
        <div className="grid gap-12 md:grid-cols-[1.2fr_1fr_1fr]">
          {/* Brand column */}
          <div>
            <Link
              href="/"
              className="inline-block text-2xl font-bold tracking-tight"
              style={{ color: "var(--brand-walnut)" }}
            >
              Beespo
            </Link>
            <p
              className="mt-4 max-w-xs text-[15px] leading-relaxed"
              style={{ color: "color-mix(in srgb, var(--brand-walnut) 75%, transparent)" }}
            >
              The first workspace built for the bishopric. Plan sacrament
              meeting, track speakers, run ward business — without losing a
              year of history when callings change.
            </p>
            <p
              className="mt-6 text-xs"
              style={{ color: "color-mix(in srgb, var(--brand-walnut) 55%, transparent)" }}
            >
              A product of Bishopric Technologies LLC
            </p>
          </div>

          {/* Explore column */}
          <div>
            <h3
              className="text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: "color-mix(in srgb, var(--brand-walnut) 55%, transparent)" }}
            >
              Explore
            </h3>
            <ul className="mt-5 space-y-3">
              <li>
                <Link
                  href="/support"
                  className="text-[15px] transition-colors hover:opacity-70"
                  style={{ color: "var(--brand-walnut)" }}
                >
                  Support
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-[15px] transition-colors hover:opacity-70"
                  style={{ color: "var(--brand-walnut)" }}
                >
                  Terms
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-[15px] transition-colors hover:opacity-70"
                  style={{ color: "var(--brand-walnut)" }}
                >
                  Privacy
                </Link>
              </li>
            </ul>
          </div>

          {/* Account column */}
          <div>
            <h3
              className="text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: "color-mix(in srgb, var(--brand-walnut) 55%, transparent)" }}
            >
              Account
            </h3>
            <ul className="mt-5 space-y-3">
              <li>
                <Link
                  href="/login"
                  className="text-[15px] transition-colors hover:opacity-70"
                  style={{ color: "var(--brand-walnut)" }}
                >
                  Sign In
                </Link>
              </li>
              <li>
                <Link
                  href="/#waitlist"
                  className="text-[15px] transition-colors hover:opacity-70"
                  style={{ color: "var(--brand-burnt)" }}
                >
                  Request access
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div
          className="mt-12 border-t pt-6"
          style={{ borderColor: "color-mix(in srgb, var(--brand-walnut) 14%, transparent)" }}
        >
          <p
            className="text-xs"
            style={{ color: "color-mix(in srgb, var(--brand-walnut) 55%, transparent)" }}
          >
            &copy; {currentYear} Beespo. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
