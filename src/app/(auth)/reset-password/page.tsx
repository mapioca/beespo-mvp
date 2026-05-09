"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/auth-shell";

const inkSubtle = "color-mix(in srgb, var(--lp-ink) 65%, transparent)";
const inkBorder = "1px solid color-mix(in srgb, var(--lp-ink) 18%, transparent)";
const inputStyle = {
    background: "var(--lp-bg)",
    color: "var(--lp-ink)",
    border: "1px solid color-mix(in srgb, var(--lp-ink) 22%, transparent)",
};
const accentBtnStyle = { background: "var(--lp-accent)", color: "var(--lp-bg)" };

function AuthCard({ children }: { children: React.ReactNode }) {
    return (
        <AuthShell>
            <div
                className="rounded-2xl p-7 sm:p-8"
                style={{ background: "var(--lp-surface)", border: inkBorder }}
            >
                {children}
            </div>
        </AuthShell>
    );
}

export default function ResetPasswordPage() {
    // Memoize the Supabase client to prevent recreation on each render
    // This is critical for maintaining auth state across the component lifecycle
    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(true);
    const [hasSession, setHasSession] = useState(false);

    useEffect(() => {
        let mounted = true;

        const verifySession = async () => {
            // First, check if we already have a session (e.g., from callback flow)
            const { data: { session: existingSession } } = await supabase.auth.getSession();

            if (existingSession) {
                if (mounted) {
                    setHasSession(true);
                    setIsVerifying(false);
                }
                return;
            }

            // No existing session - check if we have tokens in the URL hash
            // The recovery link includes tokens in the hash: #access_token=...&refresh_token=...&type=recovery
            const hash = window.location.hash;

            if (hash) {
                // Parse the hash fragment
                const hashParams = new URLSearchParams(hash.substring(1));
                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');

                if (accessToken && refreshToken) {
                    // Set the session explicitly using the tokens from the URL
                    const { data, error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });

                    if (error) {
                        console.error("Error setting session from hash:", error);
                        if (mounted) {
                            setIsVerifying(false);
                            setHasSession(false);
                        }
                        return;
                    }

                    if (data.session) {
                        // Clear the hash from URL for cleaner UX
                        window.history.replaceState(null, '', window.location.pathname);
                        if (mounted) {
                            setHasSession(true);
                            setIsVerifying(false);
                        }
                        return;
                    }
                }
            }

            // No tokens in hash and no existing session
            if (mounted) {
                setIsVerifying(false);
                setHasSession(false);
            }
        };

        verifySession();

        return () => {
            mounted = false;
        };
    }, [supabase.auth]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }
        if (password.length < 8) {
            toast.error("Password must be at least 8 characters long.");
            return;
        }
        setIsLoading(true);

        try {
            // Double check session before updating
            const { data: { session }, error: sessionCheckError } = await supabase.auth.getSession();

            if (sessionCheckError) {
                console.error("Session check error during submit:", sessionCheckError);
            }

            if (!session) {
                console.error("Session missing during submit.");
                toast.error("Your session has expired or was not found. Please request a new password reset link.");
                setIsLoading(false);
                return;
            }
            const { error } = await supabase.auth.updateUser({
                password,
            });

            if (error) {
                console.error("Error updating user:", error);
                toast.error(error.message);
            } else {
                toast.success("Your password has been reset successfully.");
                router.push("/dashboard");
            }
        } catch (err: unknown) {
            let message = "An unexpected error occurred.";
            if (err instanceof Error) {
                message = err.message;
            }
            console.error("Unexpected error in handleSubmit:", err);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    if (isVerifying) {
        return (
            <AuthCard>
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--lp-ink)" }}>
                        Verifying link
                    </h1>
                    <p className="text-sm" style={{ color: inkSubtle }}>
                        Please wait while we verify your secure link...
                    </p>
                </div>
                <div className="mt-6 flex justify-center p-4">
                    <div
                        className="h-8 w-8 animate-spin rounded-full border-b-2"
                        style={{ borderColor: "var(--lp-accent)" }}
                    />
                </div>
            </AuthCard>
        );
    }

    if (!hasSession) {
        return (
            <AuthCard>
                <div className="space-y-1">
                    <h1
                        className="text-2xl font-bold tracking-tight"
                        style={{ color: "var(--lp-accent)" }}
                    >
                        Invalid link
                    </h1>
                    <p className="text-sm" style={{ color: inkSubtle }}>
                        Unable to verify your session. The link may have expired or is invalid.
                    </p>
                </div>
                <Button
                    className="mt-6 w-full rounded-md border-0 transition-opacity hover:opacity-90"
                    onClick={() => router.push('/forgot-password')}
                    style={accentBtnStyle}
                >
                    Request new link
                </Button>
            </AuthCard>
        );
    }

    return (
        <AuthCard>
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--lp-ink)" }}>
                    Reset password
                </h1>
                <p className="text-sm" style={{ color: inkSubtle }}>
                    Enter your new password below.
                </p>
            </div>
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div className="space-y-2">
                    <Label htmlFor="password" style={{ color: "var(--lp-ink)" }}>
                        New password
                    </Label>
                    <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        minLength={6}
                        className="rounded-md"
                        style={inputStyle}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirmPassword" style={{ color: "var(--lp-ink)" }}>
                        Confirm password
                    </Label>
                    <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        minLength={6}
                        className="rounded-md"
                        style={inputStyle}
                    />
                </div>

                <Button
                    type="submit"
                    className="w-full rounded-md border-0 transition-opacity hover:opacity-90"
                    disabled={isLoading}
                    style={accentBtnStyle}
                >
                    {isLoading ? "Resetting password..." : "Reset password"}
                </Button>
            </form>
        </AuthCard>
    );
}
