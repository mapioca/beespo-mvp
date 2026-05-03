"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import { forgotPasswordAction } from "@/lib/actions/auth-actions";
import { ArrowLeft, Mail } from "lucide-react";

const inkSubtle = "color-mix(in srgb, var(--lp-ink) 65%, transparent)";
const inkBorder = "1px solid color-mix(in srgb, var(--lp-ink) 18%, transparent)";
const inputStyle = {
  background: "var(--lp-bg)",
  color: "var(--lp-ink)",
  border: "1px solid color-mix(in srgb, var(--lp-ink) 22%, transparent)",
};

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const result = await forgotPasswordAction(email);

            if (result.error) {
                toast.error(result.error);
            } else {
                setIsSuccess(true);
                toast.info("Check your inbox for the password reset link.");
            }
        } catch {
            toast.error("An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div
                className="rounded-2xl p-7 sm:p-8"
                style={{ background: "var(--lp-surface)", border: inkBorder }}
            >
                <div className="space-y-1">
                    <h1
                        className="flex items-start gap-2 text-2xl font-bold tracking-tight"
                        style={{ color: "var(--lp-ink)" }}
                    >
                        <Mail
                            className="mt-1 h-6 w-6"
                            style={{ color: "var(--lp-accent)" }}
                        />
                        Check your email
                    </h1>
                    <p className="text-sm" style={{ color: inkSubtle }}>
                        We have sent a password reset link to <strong style={{ color: "var(--lp-ink)" }}>{email}</strong>.
                    </p>
                </div>
                <div className="mt-6 space-y-4">
                    <Button
                        asChild
                        className="w-full rounded-md border-0 transition-opacity hover:opacity-90"
                        style={{ background: "var(--lp-accent)", color: "var(--lp-bg)" }}
                    >
                        <Link href="/login">Back to Sign in</Link>
                    </Button>
                    <p className="text-center text-sm" style={{ color: inkSubtle }}>
                        Did not receive the email? Check your spam folder or{" "}
                        <button
                            type="button"
                            onClick={() => setIsSuccess(false)}
                            className="underline underline-offset-4"
                            style={{ color: "var(--lp-accent)" }}
                        >
                            try another email address
                        </button>
                        .
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="rounded-2xl p-7 sm:p-8"
            style={{ background: "var(--lp-surface)", border: inkBorder }}
        >
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--lp-ink)" }}>
                    Forgot password?
                </h1>
                <p className="text-sm" style={{ color: inkSubtle }}>
                    Enter your email address and we&apos;ll send you a reset link.
                </p>
            </div>
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div className="space-y-2">
                    <Label htmlFor="email" style={{ color: "var(--lp-ink)" }}>
                        Email
                    </Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                        className="rounded-md placeholder:opacity-60"
                        style={inputStyle}
                    />
                </div>

                <Button
                    type="submit"
                    className="w-full rounded-md border-0 transition-opacity hover:opacity-90"
                    disabled={isLoading}
                    style={{ background: "var(--lp-accent)", color: "var(--lp-bg)" }}
                >
                    {isLoading ? "Sending link..." : "Send reset link"}
                </Button>

                <Button
                    asChild
                    variant="ghost"
                    className="w-full bg-transparent hover:bg-transparent"
                    style={{ color: inkSubtle }}
                >
                    <Link href="/login" className="flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Sign in
                    </Link>
                </Button>
            </form>
        </div>
    );
}
