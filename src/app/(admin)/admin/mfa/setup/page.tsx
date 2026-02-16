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
import { TotpInput } from "@/components/admin/mfa/totp-input";
import { Shield, Copy, Check } from "lucide-react";

export default function MfaSetupPage() {
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
        router.push("/dashboard");
        return;
      }

      // Unenroll any unverified factors first
      const unverifiedFactors = factorsData?.totp?.filter(f => (f.status as string) === "unverified") || [];
      for (const factor of unverifiedFactors) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Beespo Admin",
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
  }, [router]);

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

      router.push("/dashboard");
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
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <p className="text-zinc-400">Setting up MFA...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <Shield className="h-8 w-8 text-zinc-400 mb-2" />
          <h1 className="text-xl font-bold text-zinc-100">
            Set Up Two-Factor Authentication
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            MFA is required for admin console access
          </p>
        </div>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-lg text-zinc-100">
              Scan QR Code
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Use your authenticator app (Google Authenticator, Authy, etc.) to
              scan the QR code below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* QR Code */}
            <div className="flex justify-center">
              <div className="rounded-lg bg-white p-4">
                <QRCodeSVG value={qrUri} size={200} />
              </div>
            </div>

            {/* Secret Key Fallback */}
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 text-center">
                Or enter this key manually:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-zinc-800 px-3 py-2 text-xs font-mono text-zinc-300 text-center break-all">
                  {secret}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copySecret}
                  className="shrink-0 text-zinc-400 hover:text-zinc-200"
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
              <p className="text-sm text-zinc-300 text-center">
                Enter the 6-digit code from your app:
              </p>
              <TotpInput onComplete={handleVerify} disabled={isVerifying} />
              {isVerifying && (
                <p className="text-xs text-zinc-500 text-center">
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
