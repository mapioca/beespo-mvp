"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, AlertTriangle } from "lucide-react";
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

export default function AdminLoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const reason = searchParams.get("reason");
    const error = searchParams.get("error");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const supabase = createClient();

            const { data, error: authError } =
                await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

            if (authError) {
                toast({
                    title: "Authentication failed",
                    description: authError.message,
                    variant: "destructive",
                });
                return;
            }

            if (!data.user) {
                toast({
                    title: "Error",
                    description: "Unable to sign in. Please try again.",
                    variant: "destructive",
                });
                return;
            }

            // Verify sys-admin role
            const { data: profile } = await supabase
                .from("profiles")
                .select("id, is_sys_admin")
                .eq("id", data.user.id)
                .single();

            if (!profile?.is_sys_admin) {
                await supabase.auth.signOut();
                toast({
                    title: "Access denied",
                    description:
                        "This account does not have admin privileges.",
                    variant: "destructive",
                });
                return;
            }

            toast({
                title: "Welcome back",
                description: "Admin session started.",
            });

            router.push("/admin/dashboard");
            router.refresh();
        } catch {
            toast({
                title: "Error",
                description: "An unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center px-4">
            <div className="w-full max-w-sm space-y-6">
                {/* Brand */}
                <div className="flex flex-col items-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
                        <Shield className="h-6 w-6 text-red-500" />
                    </div>
                    <h1 className="text-xl font-semibold tracking-tight text-white">
                        Beespo Admin
                    </h1>
                </div>

                {/* Notices */}
                {reason === "timeout" && (
                    <div className="flex items-center gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        Your session expired due to inactivity.
                    </div>
                )}
                {error === "unauthorised" && (
                    <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        You do not have admin access.
                    </div>
                )}

                {/* Login Card */}
                <Card className="border-zinc-800 bg-zinc-900">
                    <form onSubmit={handleLogin}>
                        <CardHeader className="space-y-1">
                            <CardTitle className="text-lg text-white">
                                Sign in
                            </CardTitle>
                            <CardDescription className="text-zinc-400">
                                Enter your admin credentials to continue
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="admin-email" className="text-zinc-300">
                                    Email
                                </Label>
                                <Input
                                    id="admin-email"
                                    type="email"
                                    placeholder="admin@beespo.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="admin-password" className="text-zinc-300">
                                    Password
                                </Label>
                                <Input
                                    id="admin-password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
                                />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button
                                type="submit"
                                className="w-full bg-red-600 text-white hover:bg-red-700"
                                disabled={isLoading}
                            >
                                {isLoading ? "Signing in…" : "Sign in to Admin"}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                <p className="text-center text-xs text-zinc-500">
                    This area is restricted to platform administrators.
                </p>
            </div>
        </div>
    );
}
