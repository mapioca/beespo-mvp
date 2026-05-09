"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MfaSetup } from "@/components/mfa/mfa-setup";
import { AuthTwoPane } from "@/components/auth/auth-two-pane";
import { MfaSetupSidePanel } from "@/components/auth/mfa-setup-side-panel";

function MfaSetupContent() {
  const searchParams = useSearchParams();
  const required = searchParams?.get("required") === "true";

  return <MfaSetup required={required} />;
}

export default function MfaSetupPage() {
  return (
    <AuthTwoPane sidePanel={<MfaSetupSidePanel />}>
      <Suspense>
        <MfaSetupContent />
      </Suspense>
    </AuthTwoPane>
  );
}
