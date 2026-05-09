import Link from "next/link";
import type { ReactNode } from "react";

const ACCENT = "var(--lp-accent)";
const INK = "var(--lp-ink)";

/**
 * Page-level two-pane wrapper used by login, signup, and MFA pages. Side
 * panel sits on the left at lg+; the form column always renders. Each page
 * supplies its own `<AuthSidePanel>` (with its mural and copy) and the form
 * content as `children`.
 */
export function AuthTwoPane({
  sidePanel,
  children,
}: {
  sidePanel: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]"
      style={{ background: "var(--lp-bg)" }}
    >
      {sidePanel}
      <main className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          {/* Mobile-only brand mark — the side panel is hidden below lg */}
          <Link
            href="/"
            className="mb-10 inline-block text-xl font-bold tracking-tight lg:hidden"
            style={{ color: INK }}
          >
            Beespo
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}

/**
 * Decorative left pane. The mural slot is the visual lead; the right column
 * carries the brand wordmark, headline + subtext, and copyright.
 */
export function AuthSidePanel({
  headline,
  subtext,
  children,
}: {
  /** Headline JSX. Use `<AccentItalic>` for the italic serif accent span. */
  headline: ReactNode;
  subtext: string;
  /** Mural content — typically `<Mural>...primitives...</Mural>`. */
  children: ReactNode;
}) {
  return (
    <aside
      className="relative hidden lg:grid grid-cols-[1.1fr_1fr] overflow-hidden"
      style={{ background: "var(--lp-surface)" }}
    >
      <div className="relative overflow-hidden">{children}</div>

      <div className="relative flex flex-col justify-between p-10 xl:p-14">
        <header>
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight transition-opacity hover:opacity-80"
            style={{ color: INK }}
          >
            Beespo
          </Link>
        </header>

        <div className="max-w-md">
          <h1
            className="font-bold tracking-tighter"
            style={{
              color: INK,
              fontSize: "clamp(2rem, 2.8vw + 1rem, 3.25rem)",
              lineHeight: 1.05,
            }}
          >
            {headline}
          </h1>

          <p
            className="mt-5 text-base leading-relaxed"
            style={{
              color: "color-mix(in srgb, var(--lp-ink) 75%, transparent)",
            }}
          >
            {subtext}
          </p>
        </div>

        <footer
          className="text-xs"
          style={{
            color: "color-mix(in srgb, var(--lp-ink) 55%, transparent)",
          }}
        >
          © {new Date().getFullYear()} Beespo · Built for the bishopric
        </footer>
      </div>
    </aside>
  );
}

/** Italic serif accent — use inside a headline to match the landing voice. */
export function AccentItalic({ children }: { children: ReactNode }) {
  return (
    <span
      className="italic"
      style={{
        color: ACCENT,
        fontFamily: "var(--font-serif, ui-serif, Georgia, serif)",
        fontWeight: 500,
      }}
    >
      {children}
    </span>
  );
}
