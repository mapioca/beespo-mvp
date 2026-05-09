"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";

const inkSubtle = "color-mix(in srgb, var(--lp-ink) 65%, transparent)";
const inkBorder = "1px solid color-mix(in srgb, var(--lp-ink) 18%, transparent)";

function AuthCard({ children }: { children: React.ReactNode }) {
    return (
        <div
            className="rounded-2xl p-7 sm:p-8"
            style={{ background: "var(--lp-surface)", border: inkBorder }}
        >
            {children}
        </div>
    );
}

function CheckEmailContent() {
    const searchParams = useSearchParams();
    const email = searchParams?.get("email");

    return (
        <AuthCard>
            <div className="flex flex-col items-center text-center">
                <div
                    className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                    style={{ background: "color-mix(in srgb, var(--lp-accent) 14%, transparent)" }}
                >
                    <Mail className="h-6 w-6" style={{ color: "var(--lp-accent)" }} />
                </div>
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--lp-ink)" }}>
                    Check your email
                </h1>
                <p className="mt-2 text-sm" style={{ color: inkSubtle }}>
                    We&apos;ve sent a confirmation link to
                    {email ? (
                        <>
                            <br />
                            <span className="font-medium" style={{ color: "var(--lp-ink)" }}>
                                {email}
                            </span>
                        </>
                    ) : (
                        " your email address"
                    )}
                </p>
            </div>

            <div
                className="mt-6 rounded-lg p-4"
                style={{
                    background: "color-mix(in srgb, var(--lp-ink) 5%, transparent)",
                    border: inkBorder,
                }}
            >
                <p className="text-sm" style={{ color: inkSubtle }}>
                    Click the link in the email to verify your account and complete
                    setup. If you don&apos;t see it, check your spam folder.
                </p>
            </div>

            <Button
                asChild
                className="mt-6 w-full rounded-md transition-opacity hover:opacity-90"
                style={{
                    background: "var(--lp-bg)",
                    color: "var(--lp-ink)",
                    border: inkBorder,
                }}
            >
                <Link href="/login">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Sign in
                </Link>
            </Button>
        </AuthCard>
    );
}

export default function CheckEmailPage() {
    return (
        <AuthShell>
            <Suspense
                fallback={
                    <AuthCard>
                        <div className="space-y-1 text-center">
                            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--lp-ink)" }}>
                                Loading
                            </h1>
                            <p className="text-sm" style={{ color: inkSubtle }}>
                                Please wait...
                            </p>
                        </div>
                        <div className="mt-6 flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--lp-accent)" }} />
                        </div>
                    </AuthCard>
                }
            >
                <CheckEmailContent />
            </Suspense>
        </AuthShell>
    );
}
