"use client";

import { useEffect, useState, Suspense } from "react";
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

function AcceptInviteContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams?.get("token");

    const [status, setStatus] = useState<"loading" | "needsSignup" | "needsLogin" | "blocked" | "success" | "error">("loading");
    const [message, setMessage] = useState("");
    const [workspaceName, setWorkspaceName] = useState("");
    const [invitedEmail, setInvitedEmail] = useState("");
    const [invitedRole, setInvitedRole] = useState("");
    const [existingWorkspaceName, setExistingWorkspaceName] = useState("");

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
                    setWorkspaceName(data.invitation?.workspaceName || "the workspace");
                    setInvitedEmail(data.invitation?.email || "");
                    setInvitedRole(data.invitation?.role || "member");
                    setExistingWorkspaceName(data.invitation?.existingWorkspaceName || "");
                    setMessage(data.message || "");

                    if (data.authAction === "login") {
                        setStatus("needsLogin");
                    } else if (data.authAction === "blocked") {
                        setStatus("blocked");
                    } else {
                        setStatus("needsSignup");
                    }
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
                        {status === "needsSignup" && "Create Your Account"}
                        {status === "needsLogin" && "Sign In to Continue"}
                        {status === "blocked" && "Invitation Blocked"}
                        {status === "success" && "You're In!"}
                        {status === "error" && "Invitation Error"}
                    </CardTitle>
                    <CardDescription>
                        {status === "loading" && "Please wait while we process your invitation."}
                        {status === "needsSignup" && `You've been invited to join ${workspaceName}`}
                        {status === "needsLogin" && `Sign in as ${invitedEmail} to join ${workspaceName}`}
                        {status === "blocked" && `This invitation is for ${invitedEmail}`}
                        {status === "success" && `Successfully joined ${workspaceName}`}
                        {status === "error" && "Something went wrong with your invitation."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-4">
                    {status === "loading" && (
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    )}

                    {(status === "needsSignup" || status === "needsLogin" || status === "blocked") && (
                        <>
                            <p className="text-center text-muted-foreground">
                                {status === "needsSignup" && "This email does not have a Beespo account yet, so you'll need to sign up first."}
                                {status === "needsLogin" && "This email already has a Beespo account. Sign in to accept this invitation."}
                                {status === "blocked" && (message || "This email already belongs to another workspace.")}
                            </p>
                            <p className="text-sm text-center text-muted-foreground">
                                You&apos;ll be joining as <span className="font-medium capitalize">{invitedRole}</span>
                            </p>
                            {existingWorkspaceName && status === "blocked" && (
                                <p className="text-sm text-center text-muted-foreground">
                                    Current workspace: <span className="font-medium">{existingWorkspaceName}</span>
                                </p>
                            )}
                            {status === "needsLogin" && (
                                <Button asChild>
                                    <Link href={`/login?redirect=${encodeURIComponent(`/accept-invite?token=${token}`)}`}>
                                        Log In
                                    </Link>
                                </Button>
                            )}
                            {status === "needsSignup" && (
                                <Button asChild>
                                    <Link href={`/signup?invitation_token=${token}&email=${encodeURIComponent(invitedEmail)}`}>
                                        Sign Up
                                    </Link>
                                </Button>
                            )}
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

export default function AcceptInvitePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
                <Card className="max-w-md w-full">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">Processing Invitation...</CardTitle>
                        <CardDescription>Please wait while we process your invitation.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center space-y-4">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </CardContent>
                </Card>
            </div>
        }>
            <AcceptInviteContent />
        </Suspense>
    );
}
