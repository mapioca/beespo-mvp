"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import { TotpInput } from "@/components/mfa/totp-input";
import { Shield, Copy, Check } from "lucide-react";

const inkSubtle = "color-mix(in srgb, var(--lp-ink) 65%, transparent)";
const inkBorder = "1px solid color-mix(in srgb, var(--lp-ink) 18%, transparent)";

interface MfaSetupProps {
  required?: boolean;
  redirectTo?: string;
}

export function MfaSetup({ required = false, redirectTo = "/dashboard" }: MfaSetupProps) {
  const router = useRouter();
  const [qrUri, setQrUri] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const enroll = async () => {
      const supabase = createClient();

      // Check if already enrolled
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verifiedFactors = factorsData?.totp?.filter(f => f.status === "verified") || [];

      if (verifiedFactors.length > 0) {
        router.push(redirectTo);
        return;
      }

      // Unenroll any non-verified factors (stale enrollments)
      const staleFactors = factorsData?.totp?.filter(f => f.status !== "verified") || [];
      for (const factor of staleFactors) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Beespo-${Date.now()}`,
      });

      if (error) {
        toast.error("Failed to set up MFA. Please try again.");
        return;
      }

      if (data) {
        setQrUri(data.totp.uri);
        setSecret(data.totp.secret);
        setFactorId(data.id);
      }
      setIsLoading(false);
    };

    enroll();
  }, [router, redirectTo]);

  const handleVerify = async (code: string) => {
    setIsVerifying(true);

    try {
      const supabase = createClient();

      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });

      if (challengeError) {
        toast.error("Failed to create MFA challenge.");
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) {
        toast.error("Invalid Code", { description: "The verification code is incorrect. Please try again." });
        return;
      }

      toast.success("MFA Enabled", { description: "Two-factor authentication has been set up successfully." });

      router.push(redirectTo);
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsVerifying(false);
    }
  };

  const copySecret = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <p className="text-center text-sm" style={{ color: inkSubtle }}>
        Setting up MFA...
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <Shield className="mb-2 h-8 w-8" style={{ color: inkSubtle }} />
        <h1 className="text-xl font-bold" style={{ color: "var(--lp-ink)" }}>
          Set up two-factor authentication
        </h1>
        {required && (
          <p className="mt-1 text-sm" style={{ color: inkSubtle }}>
            Your workspace requires two-factor authentication
          </p>
        )}
      </div>

      <div
        className="rounded-2xl p-7 sm:p-8"
        style={{ background: "var(--lp-surface)", border: inkBorder }}
      >
        <div className="space-y-1">
          <h2 className="text-lg font-semibold" style={{ color: "var(--lp-ink)" }}>
            Scan QR code
          </h2>
          <p className="text-sm" style={{ color: inkSubtle }}>
            Use your authenticator app (Google Authenticator, Authy, etc.) to
            scan the QR code below.
          </p>
        </div>

        <div className="mt-6 space-y-6">
          {/* QR Code — keep white background for scannability regardless of theme */}
          <div className="flex justify-center">
            <div className="rounded-lg bg-white p-4" style={{ border: inkBorder }}>
              <QRCodeSVG value={qrUri} size={200} />
            </div>
          </div>

          {/* Secret Key Fallback */}
          <div className="space-y-2">
            <p className="text-center text-xs" style={{ color: inkSubtle }}>
              Or enter this key manually:
            </p>
            <div className="flex items-center gap-2">
              <code
                className="flex-1 break-all rounded px-3 py-2 text-center font-mono text-xs"
                style={{
                  background: "var(--lp-bg)",
                  color: "var(--lp-ink)",
                  border: inkBorder,
                }}
              >
                {secret}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={copySecret}
                className="shrink-0 bg-transparent hover:bg-transparent"
                style={{ color: "var(--lp-ink)" }}
              >
                {copied ? (
                  <Check className="h-4 w-4" style={{ color: "var(--lp-accent)" }} />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Verification */}
          <div className="space-y-3">
            <p className="text-center text-sm" style={{ color: "var(--lp-ink)" }}>
              Enter the 6-digit code from your app:
            </p>
            <TotpInput onComplete={handleVerify} disabled={isVerifying} />
            {isVerifying && (
              <p className="text-center text-xs" style={{ color: inkSubtle }}>
                Verifying...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
