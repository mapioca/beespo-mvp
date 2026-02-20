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
import { useTranslations } from "next-intl";

function AcceptInviteContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const t = useTranslations("AcceptInvite");

    const [status, setStatus] = useState<"loading" | "needsAuth" | "success" | "error">("loading");
    const [message, setMessage] = useState("");
    const [workspaceName, setWorkspaceName] = useState("");
    const [invitedEmail, setInvitedEmail] = useState("");
    const [invitedRole, setInvitedRole] = useState("");

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage(t("invalidLinkNoToken"));
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
                    setMessage(data.error || t("failedToAcceptInvitation"));
                    return;
                }

                if (data.needsAuth) {
                    // User needs to sign up/login first
                    setStatus("needsAuth");
                    setWorkspaceName(data.invitation?.workspaceName || t("theWorkspace"));
                    setInvitedEmail(data.invitation?.email || "");
                    setInvitedRole(data.invitation?.role || "member");
                    return;
                }

                // Success!
                setStatus("success");
                setWorkspaceName(data.workspaceName || t("theWorkspace"));

                // Redirect to dashboard after 2 seconds
                setTimeout(() => {
                    router.push("/dashboard");
                }, 2000);
            } catch {
                setStatus("error");
                setMessage(t("unexpectedError"));
            }
        };

        acceptInvitation();
    }, [token, router, t]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
            <Card className="max-w-md w-full">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">
                        {status === "loading" && t("titleLoading")}
                        {status === "needsAuth" && t("titleNeedsAuth")}
                        {status === "success" && t("titleSuccess")}
                        {status === "error" && t("titleError")}
                    </CardTitle>
                    <CardDescription>
                        {status === "loading" && t("descriptionLoading")}
                        {status === "needsAuth" && t("descriptionNeedsAuth", { workspaceName })}
                        {status === "success" && t("descriptionSuccess", { workspaceName })}
                        {status === "error" && t("descriptionError")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-4">
                    {status === "loading" && (
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    )}

                    {status === "needsAuth" && (
                        <>
                            <p className="text-center text-muted-foreground">
                                {t("needsAuthSignUpOrLogin")}
                            </p>
                            <p className="text-sm text-center text-muted-foreground">
                                {t("joiningAs")} <span className="font-medium capitalize">{invitedRole}</span>
                            </p>
                            <div className="flex gap-4">
                                <Button asChild>
                                    <Link href={`/login?redirect=/accept-invite?token=${token}`}>
                                        {t("logIn")}
                                    </Link>
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href={`/signup?invitation_token=${token}&email=${encodeURIComponent(invitedEmail)}`}>
                                        {t("signUp")}
                                    </Link>
                                </Button>
                            </div>
                        </>
                    )}

                    {status === "success" && (
                        <>
                            <CheckCircle className="h-12 w-12 text-green-500" />
                            <p className="text-center text-muted-foreground">
                                {t("redirectingToDashboard")}
                            </p>
                        </>
                    )}

                    {status === "error" && (
                        <>
                            <XCircle className="h-12 w-12 text-destructive" />
                            <p className="text-center text-destructive">{message}</p>
                            <Button asChild variant="outline">
                                <Link href="/login">{t("goToLogin")}</Link>
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function AcceptInvitePage() {
    const t = useTranslations("AcceptInvite");
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
                <Card className="max-w-md w-full">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">{t("titleLoading")}</CardTitle>
                        <CardDescription>{t("descriptionLoading")}</CardDescription>
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
