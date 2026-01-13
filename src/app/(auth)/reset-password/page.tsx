"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/lib/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
    // Memoize the Supabase client to prevent recreation on each render
    // This is critical for maintaining auth state across the component lifecycle
    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();
    const { toast } = useToast();
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
            toast({
                title: "Error",
                description: "Passwords do not match.",
                variant: "destructive",
            });
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
                toast({
                    title: "Error",
                    description: "Your session has expired or was not found. Please request a new password reset link.",
                    variant: "destructive",
                });
                setIsLoading(false);
                return;
            }
            const { error } = await supabase.auth.updateUser({
                password,
            });

            if (error) {
                console.error("Error updating user:", error);
                toast({
                    title: "Error",
                    description: error.message,
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Success",
                    description: "Your password has been reset successfully.",
                });
                router.push("/dashboard");
            }
        } catch (err: unknown) {
            let message = "An unexpected error occurred.";
            if (err instanceof Error) {
                message = err.message;
            }
            console.error("Unexpected error in handleSubmit:", err);
            toast({
                title: "Error",
                description: message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (isVerifying) {
        return (
            <Card className="border-border">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">Verifying Link</CardTitle>
                    <CardDescription>
                        Please wait while we verify your secure link...
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-center p-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!hasSession) {
        return (
            <Card className="border-border">
                <CardHeader className="space-y-1">
                    <CardTitle className=" text-2xl font-bold text-destructive">Invalid Link</CardTitle>
                    <CardDescription>
                        Unable to verify your session. The link may have expired or is invalid.
                    </CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button className="w-full" onClick={() => router.push('/forgot-password')}>
                        Request New Link
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card className="border-border">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold">Reset password</CardTitle>
                <CardDescription>
                    Enter your new password below.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="password">New Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={isLoading}
                            minLength={6}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={isLoading}
                            minLength={6}
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Resetting password..." : "Reset password"}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
