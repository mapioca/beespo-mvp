"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MfaSetup } from "@/components/mfa/mfa-setup";
import { AuthShell } from "@/components/auth/auth-shell";

function MfaSetupContent() {
  const searchParams = useSearchParams();
  const required = searchParams?.get("required") === "true";

  return <MfaSetup required={required} />;
}

export default function MfaSetupPage() {
  return (
    <AuthShell>
      <Suspense>
        <MfaSetupContent />
      </Suspense>
    </AuthShell>
  );
}
