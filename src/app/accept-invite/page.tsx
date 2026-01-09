"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

export default function AcceptInvitePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [status, setStatus] = useState<"loading" | "needsAuth" | "success" | "error">("loading");
    const [message, setMessage] = useState("");
    const [workspaceName, setWorkspaceName] = useState("");

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("Invalid invitation link. No token provided.");
            return;
        }

        const acceptInvitation = async () => {
            try {
                const response = await fetch("/api/invitations/accept", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token }),
                });

                const data = await response.json();

                if (!response.ok) {
                    setStatus("error");
                    setMessage(data.error || "Failed to accept invitation");
                    return;
                }

                if (data.needsAuth) {
                    // User needs to sign up/login first
                    setStatus("needsAuth");
                    setWorkspaceName(data.invitation?.workspaceName || "the workspace");
                    return;
                }

                // Success!
                setStatus("success");
                setWorkspaceName(data.workspaceName || "the workspace");

                // Redirect to dashboard after 2 seconds
                setTimeout(() => {
                    router.push("/dashboard");
                }, 2000);
            } catch {
                setStatus("error");
                setMessage("An unexpected error occurred. Please try again.");
            }
        };

        acceptInvitation();
    }, [token, router]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
            <Card className="max-w-md w-full">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">
                        {status === "loading" && "Processing Invitation..."}
                        {status === "needsAuth" && "Welcome to Beespo!"}
                        {status === "success" && "You're In!"}
                        {status === "error" && "Invitation Error"}
                    </CardTitle>
                    <CardDescription>
                        {status === "loading" && "Please wait while we process your invitation."}
                        {status === "needsAuth" && `You've been invited to join ${workspaceName}`}
                        {status === "success" && `Successfully joined ${workspaceName}`}
                        {status === "error" && "Something went wrong with your invitation."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-4">
                    {status === "loading" && (
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    )}

                    {status === "needsAuth" && (
                        <>
                            <p className="text-center text-muted-foreground">
                                Please sign up or log in to accept this invitation.
                            </p>
                            <div className="flex gap-4">
                                <Button asChild>
                                    <Link href={`/login?redirect=/accept-invite?token=${token}`}>
                                        Log In
                                    </Link>
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href={`/signup?redirect=/accept-invite?token=${token}`}>
                                        Sign Up
                                    </Link>
                                </Button>
                            </div>
                        </>
                    )}

                    {status === "success" && (
                        <>
                            <CheckCircle className="h-12 w-12 text-green-500" />
                            <p className="text-center text-muted-foreground">
                                Redirecting you to the dashboard...
                            </p>
                        </>
                    )}

                    {status === "error" && (
                        <>
                            <XCircle className="h-12 w-12 text-destructive" />
                            <p className="text-center text-destructive">{message}</p>
                            <Button asChild variant="outline">
                                <Link href="/login">Go to Login</Link>
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
