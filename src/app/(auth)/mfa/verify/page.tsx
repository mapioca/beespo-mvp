"use client";

import { MfaVerify } from "@/components/mfa/mfa-verify";
import { AuthTwoPane } from "@/components/auth/auth-two-pane";
import { MfaVerifySidePanel } from "@/components/auth/mfa-verify-side-panel";

export default function MfaVerifyPage() {
  return (
    <AuthTwoPane sidePanel={<MfaVerifySidePanel />}>
      <MfaVerify />
    </AuthTwoPane>
  );
}
