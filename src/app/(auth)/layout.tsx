/**
 * The (auth) group has no shared chrome: each page renders its own shell.
 * Most pages wrap themselves in <AuthShell>; the login page renders a
 * two-pane layout directly.
 */
export default function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
