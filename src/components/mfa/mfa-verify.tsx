"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import { TotpInput } from "@/components/mfa/totp-input";
import { recordMfaAuditEvent } from "@/lib/actions/mfa-actions";
import { Loader2 } from "lucide-react";

const inkSubtle = "color-mix(in srgb, var(--lp-ink) 65%, transparent)";
const inkBorder = "1px solid color-mix(in srgb, var(--lp-ink) 18%, transparent)";
const inputStyle = {
  background: "var(--lp-bg)",
  color: "var(--lp-ink)",
  border: "1px solid color-mix(in srgb, var(--lp-ink) 22%, transparent)",
};

interface MfaVerifyProps {
  redirectTo?: string;
  setupPath?: string;
}

export function MfaVerify({ redirectTo = "/dashboard", setupPath = "/mfa/setup" }: MfaVerifyProps) {
  const router = useRouter();
  const [factorId, setFactorId] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [inputKey, setInputKey] = useState(0);

  useEffect(() => {
    const loadFactors = async () => {
      const supabase = createClient();

      const { data: aalData } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.currentLevel === "aal2") {
        router.push(redirectTo);
        return;
      }

      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verifiedFactors =
        factorsData?.totp?.filter((f) => f.status === "verified") || [];

      if (verifiedFactors.length === 0) {
        router.push(setupPath);
        return;
      }

      setFactorId(verifiedFactors[0].id);
      setIsLoading(false);
    };

    loadFactors();
  }, [router, redirectTo, setupPath]);

  const handleVerify = async (code: string) => {
    setIsVerifying(true);

    try {
      const supabase = createClient();

      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });

      if (challengeError) {
        toast.error("Failed to create MFA challenge.");
        setInputKey(k => k + 1);
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) {
        toast.error("Invalid Code", { description: "The verification code is incorrect. Please try again." });
        void recordMfaAuditEvent({ eventType: "mfa.verify.failure", outcome: "failure" });
        setInputKey(k => k + 1);
        return;
      }

      void recordMfaAuditEvent({ eventType: "mfa.verify.success", outcome: "success" });

      if (rememberDevice) {
        try {
          const res = await fetch("/api/mfa/trust-device", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deviceName: deviceName.trim() || undefined }),
          });
          if (!res.ok) {
            console.error("Failed to save trusted device");
          }
        } catch {
          console.error("Failed to save trusted device");
        }
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred.");
      setInputKey(k => k + 1);
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--lp-accent)" }} />
      </div>
    );
  }

  return (
    <>
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: "color-mix(in srgb, var(--lp-ink) 55%, transparent)" }}
      >
        Two-factor verification
      </p>
      <h1
        className="mt-2 text-[2rem] font-bold tracking-tight leading-[1.1]"
        style={{ color: "var(--lp-ink)" }}
      >
        Enter your code.
      </h1>
      <p className="mt-3 text-sm" style={{ color: inkSubtle }}>
        Open your authenticator app and enter the 6-digit code for Beespo.
      </p>

      <div className="mt-8 space-y-6">
        <TotpInput key={inputKey} onComplete={handleVerify} disabled={isVerifying} />

        {isVerifying && (
          <div className="flex items-center justify-center gap-2 text-xs" style={{ color: inkSubtle }}>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Verifying…
          </div>
        )}

        <div
          className="space-y-3 rounded-lg p-3.5"
          style={{
            background: "color-mix(in srgb, var(--lp-ink) 4%, transparent)",
            border: inkBorder,
          }}
        >
          <div className="flex items-center gap-2.5">
            <Checkbox
              id="remember-device"
              checked={rememberDevice}
              onCheckedChange={(checked) => setRememberDevice(checked === true)}
              disabled={isVerifying}
            />
            <Label
              htmlFor="remember-device"
              className="cursor-pointer text-sm font-medium leading-none"
              style={{ color: "var(--lp-ink)" }}
            >
              Remember this device for 30 days
            </Label>
          </div>

          {rememberDevice && (
            <Input
              placeholder="Device name (optional, e.g. Work Laptop)"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              disabled={isVerifying}
              className="rounded-md text-sm placeholder:opacity-60"
              style={inputStyle}
            />
          )}
        </div>
      </div>
    </>
  );
}
