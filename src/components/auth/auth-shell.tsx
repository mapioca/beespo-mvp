import Link from "next/link";

/**
 * Centered "Beespo / The workspace for the bishopric" banner shell used by
 * most auth pages (signup, forgot-password, MFA, etc.). The login page opts
 * out of this shell and renders its own two-pane layout.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-6 lg:px-8"
      style={{ background: "var(--lp-bg)" }}
    >
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <Link
            href="/"
            className="text-3xl font-bold tracking-tight transition-opacity hover:opacity-80"
            style={{ color: "var(--lp-ink)" }}
          >
            Beespo
          </Link>
          <p
            className="mt-2 text-sm"
            style={{ color: "color-mix(in srgb, var(--lp-ink) 65%, transparent)" }}
          >
            The workspace for the bishopric
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
