"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import { TotpInput } from "@/components/mfa/totp-input";
import { Shield, Copy, Check } from "lucide-react";

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
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Setting up MFA...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <Shield className="h-8 w-8 text-muted-foreground mb-2" />
          <h1 className="text-xl font-bold">
            Set Up Two-Factor Authentication
          </h1>
          {required && (
            <p className="text-sm text-muted-foreground mt-1">
              Your workspace requires two-factor authentication
            </p>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Scan QR Code
            </CardTitle>
            <CardDescription>
              Use your authenticator app (Google Authenticator, Authy, etc.) to
              scan the QR code below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* QR Code */}
            <div className="flex justify-center">
              <div className="rounded-lg bg-white p-4 border">
                <QRCodeSVG value={qrUri} size={200} />
              </div>
            </div>

            {/* Secret Key Fallback */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground text-center">
                Or enter this key manually:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono text-center break-all">
                  {secret}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copySecret}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Verification */}
            <div className="space-y-3">
              <p className="text-sm text-center">
                Enter the 6-digit code from your app:
              </p>
              <TotpInput onComplete={handleVerify} disabled={isVerifying} />
              {isVerifying && (
                <p className="text-xs text-muted-foreground text-center">
                  Verifying...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
