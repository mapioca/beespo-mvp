"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import { TotpInput } from "@/components/mfa/totp-input";
import { Shield, Smartphone, Trash2, Loader2, Copy, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface TrustedDevice {
  id: string;
  device_name: string | null;
  created_at: string;
  expires_at: string;
}

interface MfaSettingsProps {
  workspaceMfaRequired?: boolean;
}

export function MfaSettings({ workspaceMfaRequired = false }: MfaSettingsProps) {
  const router = useRouter();
  const [hasMfa, setHasMfa] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [disableInputKey, setDisableInputKey] = useState(0);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [isTrusting, setIsTrusting] = useState(false);

  const checkMfaStatus = useCallback(async () => {
    const supabase = createClient();
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const hasVerified = factorsData?.totp?.some(f => f.status === "verified") ?? false;
    setHasMfa(hasVerified);
    setIsLoading(false);

    if (hasVerified) {
      loadTrustedDevices();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    checkMfaStatus();
  }, [checkMfaStatus]);

  const loadTrustedDevices = async () => {
    setIsLoadingDevices(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("trusted_devices")
      .select("id, device_name, created_at, expires_at")
      .order("created_at", { ascending: false });

    setTrustedDevices((data as TrustedDevice[]) || []);
    setIsLoadingDevices(false);
  };

  const handleDisableMfa = async (code: string) => {
    if (workspaceMfaRequired) {
      toast.error("Cannot disable MFA", {
        description: "Your workspace requires two-factor authentication.",
      });
      return;
    }

    setIsDisabling(true);

    try {
      const supabase = createClient();

      // Get the verified factor
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verifiedFactor = factorsData?.totp?.find(f => f.status === "verified");
      if (!verifiedFactor) return;

      // Verify the code first
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: verifiedFactor.id });

      if (challengeError) {
        toast.error("Failed to create MFA challenge.");
        setDisableInputKey(k => k + 1);
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: verifiedFactor.id,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) {
        toast.error("Invalid Code", {
          description: "The verification code is incorrect.",
        });
        setDisableInputKey(k => k + 1);
        return;
      }

      // Unenroll the factor
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId: verifiedFactor.id,
      });

      if (unenrollError) {
        toast.error("Failed to disable MFA.");
        return;
      }

      // Delete all trusted devices
      await supabase.from("trusted_devices").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      toast.success("MFA Disabled", {
        description: "Two-factor authentication has been removed from your account.",
      });

      setHasMfa(false);
      setTrustedDevices([]);
      setShowDisableDialog(false);
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsDisabling(false);
    }
  };

  const handleTrustCurrentDevice = async () => {
    if (!newDeviceName.trim()) {
      toast.error("Please enter a name for this device.");
      return;
    }

    setIsTrusting(true);
    try {
      const res = await fetch("/api/mfa/trust-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceName: newDeviceName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to trust device");
        return;
      }

      toast.success("Device trusted for 30 days");
      setNewDeviceName("");
      loadTrustedDevices();
    } catch {
      toast.error("Failed to trust device");
    } finally {
      setIsTrusting(false);
    }
  };

  const handleRevokeTrustedDevice = async (deviceId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("trusted_devices")
      .delete()
      .eq("id", deviceId);

    if (error) {
      toast.error("Failed to remove trusted device.");
      return;
    }

    setTrustedDevices(prev => prev.filter(d => d.id !== deviceId));
    toast.success("Device removed");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showSetup) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Set Up Two-Factor Authentication
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowSetup(false)}>
              Cancel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <MfaSetupInline
            onComplete={() => {
              setShowSetup(false);
              setHasMfa(true);
              router.refresh();
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </div>
            {hasMfa ? (
              <Badge variant="secondary" className="text-green-600 bg-green-500/10">
                Enabled
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-muted-foreground">
                Disabled
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasMfa ? (
            <>
              <p className="text-sm text-muted-foreground">
                Your account is protected with two-factor authentication using an authenticator app.
              </p>
              <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={workspaceMfaRequired}
                  >
                    Disable MFA
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
                    <DialogDescription>
                      Enter your authenticator code to confirm disabling MFA. This will also remove all trusted devices.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <TotpInput key={disableInputKey} onComplete={handleDisableMfa} disabled={isDisabling} />
                    {isDisabling && (
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Disabling...
                      </p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              {workspaceMfaRequired && (
                <p className="text-xs text-muted-foreground">
                  MFA cannot be disabled because your workspace requires it.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Protect your account by requiring a verification code from your authenticator app when signing in.
              </p>
              <Button size="sm" onClick={() => setShowSetup(true)}>
                Enable MFA
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Trusted Devices */}
      {hasMfa && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Trusted Devices
            </CardTitle>
            <CardDescription>
              Devices that can skip two-factor verification for 30 days
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Trust current device form */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Name this device (e.g., Work Laptop)"
                value={newDeviceName}
                onChange={(e) => setNewDeviceName(e.target.value)}
                disabled={isTrusting}
                className="text-sm"
              />
              <Button
                size="sm"
                onClick={handleTrustCurrentDevice}
                disabled={isTrusting || !newDeviceName.trim()}
                className="shrink-0"
              >
                {isTrusting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Trust This Device"
                )}
              </Button>
            </div>

            {/* Device list */}
            {isLoadingDevices ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : trustedDevices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No trusted devices yet.
              </p>
            ) : (
              <div className="space-y-2">
                {trustedDevices.map(device => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {device.device_name || "Unnamed device"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Added {new Date(device.created_at).toLocaleDateString()} · Expires{" "}
                        {new Date(device.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRevokeTrustedDevice(device.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}

// Inline MFA setup for use within the settings page (doesn't redirect)
function MfaSetupInline({ onComplete }: { onComplete: () => void }) {
  const [qrUri, setQrUri] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const enroll = async () => {
      const supabase = createClient();

      // Unenroll any non-verified factors (stale enrollments)
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
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
  }, []);

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
        toast.error("Invalid Code", {
          description: "The verification code is incorrect. Please try again.",
        });
        return;
      }

      toast.success("MFA Enabled", {
        description: "Two-factor authentication has been set up successfully.",
      });
      onComplete();
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
      <div className="flex items-center gap-2 text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Setting up...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="rounded-lg bg-white p-4 border">
          <QRCodeSVG value={qrUri} size={180} />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground text-center">
          Scan the QR code with your authenticator app, or enter this key manually:
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono text-center break-all">
            {secret}
          </code>
          <Button variant="ghost" size="icon" onClick={copySecret} className="shrink-0">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-center">
          Enter the 6-digit code from your app:
        </p>
        <TotpInput onComplete={handleVerify} disabled={isVerifying} />
        {isVerifying && (
          <p className="text-xs text-muted-foreground text-center">Verifying...</p>
        )}
      </div>
    </div>
  );
}
