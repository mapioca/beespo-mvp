"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import { TotpInput } from "@/components/mfa/totp-input";
import { Shield } from "lucide-react";

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
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <Shield className="h-8 w-8 text-muted-foreground mb-2" />
          <h1 className="text-xl font-bold">
            Two-Factor Verification
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter the code from your authenticator app
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Verify Identity
            </CardTitle>
            <CardDescription>
              Open your authenticator app and enter the 6-digit code for Beespo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <TotpInput key={inputKey} onComplete={handleVerify} disabled={isVerifying} />
            {isVerifying && (
              <p className="text-xs text-muted-foreground text-center">Verifying...</p>
            )}

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember-device"
                  checked={rememberDevice}
                  onCheckedChange={(checked) => setRememberDevice(checked === true)}
                  disabled={isVerifying}
                />
                <Label htmlFor="remember-device" className="text-sm text-muted-foreground cursor-pointer">
                  Remember this device for 30 days
                </Label>
              </div>

              {rememberDevice && (
                <Input
                  placeholder="Device name (e.g., Work Laptop, iPhone)"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  disabled={isVerifying}
                  className="text-sm"
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
