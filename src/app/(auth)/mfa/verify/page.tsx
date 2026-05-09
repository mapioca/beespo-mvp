"use client";

import { MfaVerify } from "@/components/mfa/mfa-verify";
import { AuthShell } from "@/components/auth/auth-shell";

export default function MfaVerifyPage() {
  return (
    <AuthShell>
      <MfaVerify />
    </AuthShell>
  );
}
