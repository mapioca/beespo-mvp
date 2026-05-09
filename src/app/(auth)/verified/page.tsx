import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";

const inkSubtle = "color-mix(in srgb, var(--lp-ink) 65%, transparent)";
const inkBorder = "1px solid color-mix(in srgb, var(--lp-ink) 18%, transparent)";

export default async function VerifiedPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  let nextPath = "/onboarding";

  if (typeof params.next === "string") {
    nextPath = params.next;
  }

  if (!nextPath.startsWith("/") || nextPath === "/") {
    nextPath = "/onboarding";
  }

  return (
    <AuthShell>
    <div
      className="rounded-2xl p-7 sm:p-8"
      style={{ background: "var(--lp-surface)", border: inkBorder }}
    >
      <div className="flex flex-col items-center text-center">
        <div
          className="mb-5 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: "color-mix(in srgb, var(--lp-accent) 14%, transparent)" }}
        >
          <CheckCircle2 className="h-8 w-8" style={{ color: "var(--lp-accent)" }} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--lp-ink)" }}>
          Email verified
        </h1>
        <p className="mt-2 text-sm" style={{ color: inkSubtle }}>
          Your email address has been successfully verified.
        </p>
      </div>

      <p className="mt-5 text-center text-sm" style={{ color: inkSubtle }}>
        Thank you for confirming your email. You can now use all the features of your account.
      </p>

      <Button
        asChild
        className="mt-6 h-11 w-full rounded-md border-0 font-medium transition-opacity hover:opacity-90"
        style={{ background: "var(--lp-accent)", color: "var(--lp-bg)" }}
      >
        <Link href={nextPath}>
          {nextPath.includes("dashboard") ? "Continue to dashboard" : "Continue to onboarding"}
        </Link>
      </Button>
    </div>
    </AuthShell>
  );
}
