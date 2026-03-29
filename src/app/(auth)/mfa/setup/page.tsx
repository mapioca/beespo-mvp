"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MfaSetup } from "@/components/mfa/mfa-setup";

function MfaSetupContent() {
  const searchParams = useSearchParams();
  const required = searchParams.get("required") === "true";

  return <MfaSetup required={required} />;
}

export default function MfaSetupPage() {
  return (
    <Suspense>
      <MfaSetupContent />
    </Suspense>
  );
}
