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
import { useToast } from "@/lib/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { TotpInput } from "@/components/admin/mfa/totp-input";
import { Shield } from "lucide-react";

export default function MfaVerifyPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [factorId, setFactorId] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFactors = async () => {
      const supabase = createClient();

      // Check if already at aal2
      const { data: aalData } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.currentLevel === "aal2") {
        router.push("/dashboard");
        return;
      }

      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verifiedFactors =
        factorsData?.totp?.filter((f) => f.status === "verified") || [];

      if (verifiedFactors.length === 0) {
        // No verified factors, redirect to setup
        router.push("/mfa/setup");
        return;
      }

      setFactorId(verifiedFactors[0].id);
      setIsLoading(false);
    };

    loadFactors();
  }, [router]);

  const handleVerify = async (code: string) => {
    setIsVerifying(true);

    try {
      const supabase = createClient();

      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });

      if (challengeError) {
        toast({
          title: "Error",
          description: "Failed to create MFA challenge.",
          variant: "destructive",
        });
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) {
        toast({
          title: "Invalid Code",
          description: "The verification code is incorrect. Please try again.",
          variant: "destructive",
        });
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <Shield className="h-8 w-8 text-zinc-400 mb-2" />
          <h1 className="text-xl font-bold text-zinc-100">
            Two-Factor Verification
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Enter the code from your authenticator app
          </p>
        </div>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-lg text-zinc-100">
              Verify Identity
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Open your authenticator app and enter the 6-digit code for Beespo
              Admin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <TotpInput onComplete={handleVerify} disabled={isVerifying} />
            {isVerifying && (
              <p className="text-xs text-zinc-500 text-center">Verifying...</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
