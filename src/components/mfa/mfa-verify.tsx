"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import { TotpInput } from "@/components/mfa/totp-input";
import { Shield } from "lucide-react";

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

      // Check if already at aal2
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
        setInputKey(k => k + 1);
        return;
      }

      // Handle "remember this device"
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
      <p className="text-center text-sm" style={{ color: inkSubtle }}>
        Loading...
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <Shield className="mb-2 h-8 w-8" style={{ color: inkSubtle }} />
        <h1 className="text-xl font-bold" style={{ color: "var(--lp-ink)" }}>
          Two-factor verification
        </h1>
        <p className="mt-1 text-sm" style={{ color: inkSubtle }}>
          Enter the code from your authenticator app
        </p>
      </div>

      <div
        className="rounded-2xl p-7 sm:p-8"
        style={{ background: "var(--lp-surface)", border: inkBorder }}
      >
        <div className="space-y-1">
          <h2 className="text-lg font-semibold" style={{ color: "var(--lp-ink)" }}>
            Verify identity
          </h2>
          <p className="text-sm" style={{ color: inkSubtle }}>
            Open your authenticator app and enter the 6-digit code for Beespo.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <TotpInput key={inputKey} onComplete={handleVerify} disabled={isVerifying} />
          {isVerifying && (
            <p className="text-center text-xs" style={{ color: inkSubtle }}>
              Verifying...
            </p>
          )}

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember-device"
                checked={rememberDevice}
                onCheckedChange={(checked) => setRememberDevice(checked === true)}
                disabled={isVerifying}
              />
              <Label
                htmlFor="remember-device"
                className="cursor-pointer text-sm"
                style={{ color: inkSubtle }}
              >
                Remember this device for 30 days
              </Label>
            </div>

            {rememberDevice && (
              <Input
                placeholder="Device name (e.g., Work Laptop, iPhone)"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                disabled={isVerifying}
                className="rounded-md text-sm placeholder:opacity-60"
                style={inputStyle}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
