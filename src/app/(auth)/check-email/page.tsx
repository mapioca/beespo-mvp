"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, Pencil, X, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthTwoPane } from "@/components/auth/auth-two-pane";
import { CheckEmailSidePanel } from "@/components/auth/check-email-side-panel";
import { toast } from "@/lib/toast";
import { resendConfirmationAction } from "@/lib/actions/resend-confirmation-action";
import { changePendingSignupEmailAction } from "@/lib/actions/change-pending-signup-email-action";

const inkSubtle = "color-mix(in srgb, var(--lp-ink) 65%, transparent)";
const inkMuted = "color-mix(in srgb, var(--lp-ink) 50%, transparent)";
const inkBorder = "1px solid color-mix(in srgb, var(--lp-ink) 16%, transparent)";

const RESEND_COOLDOWN_SEC = 60;
const POLL_INTERVAL_MS = 5_000;
const POLL_INITIAL_DELAY_MS = 1_500;
const POLL_MAX_DURATION_MS = 5 * 60_000;

type Provider = "gmail" | "outlook" | "yahoo" | "icloud" | "proton" | null;

function detectProvider(email: string | null): Provider {
    if (!email) return null;
    const domain = email.split("@")[1]?.toLowerCase() ?? "";
    if (!domain) return null;
    if (domain === "gmail.com" || domain === "googlemail.com") return "gmail";
    if (
        domain === "outlook.com" ||
        domain === "hotmail.com" ||
        domain === "live.com" ||
        domain === "msn.com" ||
        domain.endsWith(".outlook.com")
    )
        return "outlook";
    if (domain.startsWith("yahoo.") || domain === "ymail.com") return "yahoo";
    if (domain === "icloud.com" || domain === "me.com" || domain === "mac.com")
        return "icloud";
    if (domain === "proton.me" || domain === "protonmail.com") return "proton";
    return null;
}

function GmailIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 256 193" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M58.182 192.05V93.14L27.507 65.077 0 49.504v125.091c0 9.658 7.825 17.455 17.455 17.455h40.727Z" fill="#4285F4" />
            <path d="M197.818 192.05h40.727c9.659 0 17.455-7.826 17.455-17.455V49.505l-31.156 17.837-27.026 25.798v98.91Z" fill="#34A853" />
            <path d="m58.182 93.14-4.174-38.647 4.174-36.989L128 69.868l69.818-52.364 4.669 33.514-4.669 42.122L128 145.504z" fill="#EA4335" />
            <path d="M197.818 17.504V93.14L256 49.504V26.231c0-21.585-24.64-33.89-41.89-20.945l-16.292 12.218Z" fill="#FBBC04" />
            <path d="m0 49.504 26.759 20.07L58.182 93.14V17.504L41.89 5.286C24.61-7.66 0 4.646 0 26.23v23.273Z" fill="#C5221F" />
        </svg>
    );
}

function OutlookIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M19.6 4.8H30v6.4H19.6z" fill="#0078D4" />
            <path d="M19.6 11.2H30v6.4H19.6z" fill="#0078D4" />
            <path d="M19.6 17.6H30V24H19.6z" fill="#28A8EA" />
            <path d="M19.6 24h7.8a2.6 2.6 0 0 0 2.6-2.6V17.6H19.6V24z" fill="#0078D4" />
            <path d="M2 6.4l13-1.6v22.4l-13-1.6V6.4z" fill="#0364B8" />
            <path d="M9.2 19.6c2.2 0 3.6-1.8 3.6-4 0-2.4-1.4-4-3.4-4-2.2 0-3.6 1.8-3.6 4 0 2.4 1.4 4 3.4 4zm0-6.4c1 0 1.6 1 1.6 2.4 0 1.6-.6 2.4-1.6 2.4s-1.6-1-1.6-2.4c0-1.6.6-2.4 1.6-2.4z" fill="#FFF" />
        </svg>
    );
}

function GenericMailIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M3 5h18v14H3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="m3 6 9 7 9-7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
    );
}

interface MailClient {
    label: string;
    url: string;
    Icon: (props: { className?: string }) => React.JSX.Element;
}

function getMailClient(provider: Provider): MailClient | null {
    switch (provider) {
        case "gmail":
            return {
                label: "Open Gmail",
                url: "https://mail.google.com/mail/u/0/#search/from%3Anoreply%40beespo.com+newer_than%3A1d",
                Icon: GmailIcon,
            };
        case "outlook":
            return {
                label: "Open Outlook",
                url: "https://outlook.live.com/mail/0/inbox",
                Icon: OutlookIcon,
            };
        case "yahoo":
            return {
                label: "Open Yahoo Mail",
                url: "https://mail.yahoo.com",
                Icon: GenericMailIcon,
            };
        case "icloud":
            return {
                label: "Open iCloud Mail",
                url: "https://www.icloud.com/mail/",
                Icon: GenericMailIcon,
            };
        case "proton":
            return {
                label: "Open Proton Mail",
                url: "https://mail.proton.me/u/0/inbox",
                Icon: GenericMailIcon,
            };
        default:
            return null;
    }
}

function CheckEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams?.get("email") ?? null;
    const provider = useMemo(() => detectProvider(email), [email]);
    const mailClient = useMemo(() => getMailClient(provider), [provider]);

    // ── Resend ───────────────────────────────────────────────────────────
    const [isResending, setIsResending] = useState(false);
    const [cooldownLeft, setCooldownLeft] = useState(0);
    const cooldownTimerRef = useRef<number | null>(null);

    const startCooldown = useCallback((sec: number) => {
        setCooldownLeft(sec);
        if (cooldownTimerRef.current) window.clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = window.setInterval(() => {
            setCooldownLeft((n) => {
                if (n <= 1) {
                    if (cooldownTimerRef.current) {
                        window.clearInterval(cooldownTimerRef.current);
                        cooldownTimerRef.current = null;
                    }
                    return 0;
                }
                return n - 1;
            });
        }, 1000);
    }, []);

    useEffect(() => {
        return () => {
            if (cooldownTimerRef.current) window.clearInterval(cooldownTimerRef.current);
        };
    }, []);

    const handleResend = async () => {
        if (!email || cooldownLeft > 0 || isResending) return;
        setIsResending(true);
        try {
            const result = await resendConfirmationAction({ email });
            if (!result.ok) {
                toast.error(result.error);
                if (result.retryAfterSec) startCooldown(result.retryAfterSec);
                return;
            }
            toast.success("Email sent", { description: "Check your inbox in a moment." });
            startCooldown(RESEND_COOLDOWN_SEC);
        } catch {
            toast.error("Couldn't resend. Please try again.");
        } finally {
            setIsResending(false);
        }
    };

    // ── Live polling ─────────────────────────────────────────────────────
    const [polledConfirmed, setPolledConfirmed] = useState(false);
    useEffect(() => {
        let cancelled = false;
        let timer: number | null = null;
        const startedAt = Date.now();
        let inFlight = false;

        const tick = async () => {
            if (cancelled || inFlight) return;
            if (Date.now() - startedAt > POLL_MAX_DURATION_MS) return;
            inFlight = true;
            try {
                const res = await fetch("/api/auth/check-confirmed", { cache: "no-store" });
                if (res.ok) {
                    const data = (await res.json()) as { confirmed: boolean };
                    if (data.confirmed) {
                        setPolledConfirmed(true);
                        return;
                    }
                }
            } catch {
                // swallow
            } finally {
                inFlight = false;
            }
            if (!cancelled) {
                timer = window.setTimeout(tick, POLL_INTERVAL_MS);
            }
        };

        timer = window.setTimeout(tick, POLL_INITIAL_DELAY_MS);

        const onVisibility = () => {
            if (document.visibilityState === "visible" && !cancelled) {
                if (timer !== null) window.clearTimeout(timer);
                tick();
            }
        };
        document.addEventListener("visibilitychange", onVisibility);

        return () => {
            cancelled = true;
            if (timer !== null) window.clearTimeout(timer);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, []);

    useEffect(() => {
        if (!polledConfirmed) return;
        const t = window.setTimeout(() => {
            router.replace("/onboarding");
        }, 700);
        return () => window.clearTimeout(t);
    }, [polledConfirmed, router]);

    // ── Inline change-email ──────────────────────────────────────────────
    const [isEditingEmail, setIsEditingEmail] = useState(false);
    const [newEmailInput, setNewEmailInput] = useState("");
    const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
    const [sessionExpired, setSessionExpired] = useState(false);
    const [inlineError, setInlineError] = useState<string | null>(null);

    const openEditEmail = () => {
        setNewEmailInput(email ?? "");
        setInlineError(null);
        setIsEditingEmail(true);
    };

    const cancelEditEmail = () => {
        setIsEditingEmail(false);
        setNewEmailInput("");
        setInlineError(null);
    };

    const handleChangeEmail = async (e: FormEvent) => {
        e.preventDefault();
        const trimmed = newEmailInput.trim();
        if (!trimmed) return;
        if (trimmed.toLowerCase() === (email ?? "").toLowerCase()) {
            cancelEditEmail();
            return;
        }
        setIsSubmittingEmail(true);
        setInlineError(null);
        try {
            const result = await changePendingSignupEmailAction({ newEmail: trimmed });
            if (!result.ok) {
                const lower = result.error.toLowerCase();
                if (lower.includes("expired") || lower.includes("couldn't find")) {
                    setSessionExpired(true);
                    setIsEditingEmail(false);
                    return;
                }
                setInlineError(result.error);
                return;
            }
            toast.success("Email updated", {
                description: `New confirmation link sent to ${result.newEmail}.`,
            });
            setIsEditingEmail(false);
            startCooldown(RESEND_COOLDOWN_SEC);
            router.replace(`/check-email?email=${encodeURIComponent(result.newEmail)}`);
        } catch {
            setInlineError("Couldn't update your email. Please try again.");
        } finally {
            setIsSubmittingEmail(false);
        }
    };

    // ── Render ───────────────────────────────────────────────────────────
    if (sessionExpired) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
                <div
                    className="mb-5 flex h-12 w-12 items-center justify-center rounded-full"
                    style={{ background: "color-mix(in srgb, var(--lp-accent) 14%, transparent)" }}
                >
                    <AlertCircle className="h-6 w-6" style={{ color: "var(--lp-accent)" }} />
                </div>
                <h1
                    className="text-[1.75rem] font-bold tracking-tight leading-[1.15]"
                    style={{ color: "var(--lp-ink)" }}
                >
                    We can&apos;t change this email here
                </h1>
                <p className="mt-3 text-[15px] leading-relaxed" style={{ color: inkSubtle }}>
                    Your signup session has expired, or this address was already
                    registered. To continue, start a fresh signup with the correct email
                    — or sign in if you think you already have an account.
                </p>
                <div className="mt-7 space-y-3">
                    <Button
                        asChild
                        className="h-11 w-full justify-center rounded-lg border-0 text-[15px] font-medium transition-opacity hover:opacity-90"
                        style={{ background: "var(--lp-accent)", color: "var(--lp-bg)" }}
                    >
                        <Link href="/signup">Start a new signup</Link>
                    </Button>
                    <Button
                        asChild
                        className="h-11 w-full justify-center rounded-lg border-0 text-[15px] font-medium transition-opacity hover:opacity-80"
                        style={{ background: "var(--lp-bg)", color: "var(--lp-ink)", border: inkBorder }}
                    >
                        <Link href="/login">I already have an account</Link>
                    </Button>
                </div>
                <p className="mt-6 text-center text-[12px]" style={{ color: inkMuted }}>
                    Still stuck?{" "}
                    <a
                        href="mailto:support@beespo.com"
                        className="underline-offset-4 hover:underline"
                        style={{ color: "var(--lp-ink)" }}
                    >
                        support@beespo.com
                    </a>
                </p>
            </motion.div>
        );
    }

    if (polledConfirmed) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center text-center"
            >
                <div
                    className="mb-5 flex h-12 w-12 items-center justify-center rounded-full"
                    style={{ background: "color-mix(in srgb, var(--lp-accent) 14%, transparent)" }}
                >
                    <CheckCircle2 className="h-6 w-6" style={{ color: "var(--lp-accent)" }} />
                </div>
                <h1
                    className="text-[1.75rem] font-bold tracking-tight leading-[1.1]"
                    style={{ color: "var(--lp-ink)" }}
                >
                    Email confirmed
                </h1>
                <p className="mt-2 text-sm" style={{ color: inkSubtle }}>
                    Taking you in…
                </p>
            </motion.div>
        );
    }

    const MailIcon = mailClient?.Icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
            <h1
                className="text-[1.875rem] font-bold tracking-tight leading-[1.15]"
                style={{ color: "var(--lp-ink)" }}
            >
                Check your inbox
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed" style={{ color: inkSubtle }}>
                We just sent a confirmation link to{" "}
                {email ? (
                    <span className="font-medium" style={{ color: "var(--lp-ink)" }}>
                        {email}
                    </span>
                ) : (
                    "your email address"
                )}{" "}
                from{" "}
                <span className="font-medium" style={{ color: "var(--lp-ink)" }}>
                    noreply@beespo.com
                </span>
                .
            </p>

            <div className="mt-8 space-y-3">
                {mailClient && MailIcon && (
                    <Button
                        asChild
                        variant="outline"
                        className="h-12 w-full justify-center gap-3 rounded-lg border-0 text-[15px] font-medium transition-opacity hover:opacity-80"
                        style={{
                            background: "var(--lp-bg)",
                            color: "var(--lp-ink)",
                            border: inkBorder,
                        }}
                    >
                        <a href={mailClient.url} target="_blank" rel="noopener noreferrer">
                            <MailIcon className="h-5 w-5" />
                            {mailClient.label}
                        </a>
                    </Button>
                )}

                {mailClient && (
                    <div className="flex items-center gap-3 py-1">
                        <div className="h-px flex-1" style={{ background: "color-mix(in srgb, var(--lp-ink) 12%, transparent)" }} />
                        <span
                            className="text-[11px] font-medium uppercase tracking-[0.12em]"
                            style={{ color: inkMuted }}
                        >
                            or
                        </span>
                        <div className="h-px flex-1" style={{ background: "color-mix(in srgb, var(--lp-ink) 12%, transparent)" }} />
                    </div>
                )}

                <Button
                    onClick={handleResend}
                    disabled={!email || cooldownLeft > 0 || isResending}
                    className="h-12 w-full justify-center rounded-lg border-0 text-[15px] font-medium transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                        background: "var(--lp-bg)",
                        color: "var(--lp-ink)",
                        border: inkBorder,
                    }}
                >
                    {isResending
                        ? "Sending…"
                        : cooldownLeft > 0
                            ? `Resend in ${cooldownLeft}s`
                            : "Resend verification email"}
                </Button>
            </div>

            <div className="mt-6 flex items-center justify-between text-[13px]">
                <button
                    type="button"
                    onClick={openEditEmail}
                    disabled={isEditingEmail}
                    className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ color: inkSubtle }}
                >
                    <Pencil className="h-3.5 w-3.5" />
                    Wrong email?
                </button>
                <span style={{ color: inkMuted }}>
                    Auto-checking for confirmation…
                </span>
            </div>

            <AnimatePresence initial={false}>
                {isEditingEmail && (
                    <motion.form
                        key="change-email-form"
                        onSubmit={handleChangeEmail}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="mt-5 space-y-3 overflow-hidden"
                    >
                        <div>
                            <label
                                htmlFor="newEmail"
                                className="text-[11px] font-medium uppercase tracking-[0.14em]"
                                style={{ color: inkMuted }}
                            >
                                New email
                            </label>
                            <Input
                                id="newEmail"
                                type="email"
                                autoComplete="email"
                                value={newEmailInput}
                                onChange={(e) => setNewEmailInput(e.target.value)}
                                disabled={isSubmittingEmail}
                                required
                                autoFocus
                                placeholder="name@example.com"
                                className="mt-1.5 h-11 rounded-lg"
                                style={{
                                    background: "var(--lp-bg)",
                                    color: "var(--lp-ink)",
                                    border: inkBorder,
                                }}
                            />
                        </div>
                        <p className="text-[12px] leading-relaxed" style={{ color: inkMuted }}>
                            The link sent to <span style={{ color: "var(--lp-ink)" }}>{email}</span>{" "}
                            will be invalidated.
                        </p>
                        {inlineError && (
                            <div
                                role="alert"
                                className="flex items-start gap-2 rounded-md p-2.5 text-[12px] leading-relaxed"
                                style={{
                                    background: "color-mix(in srgb, var(--lp-accent) 8%, transparent)",
                                    border: "1px solid color-mix(in srgb, var(--lp-accent) 28%, transparent)",
                                    color: "var(--lp-ink)",
                                }}
                            >
                                <AlertCircle
                                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                                    style={{ color: "var(--lp-accent)" }}
                                />
                                <span>{inlineError}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <Button
                                type="submit"
                                disabled={
                                    isSubmittingEmail ||
                                    !newEmailInput.trim() ||
                                    newEmailInput.trim().toLowerCase() === (email ?? "").toLowerCase()
                                }
                                className="h-10 rounded-lg border-0 px-4 text-[14px] transition-opacity hover:opacity-90 disabled:opacity-60"
                                style={{ background: "var(--lp-accent)", color: "var(--lp-bg)" }}
                            >
                                {isSubmittingEmail ? (
                                    <>
                                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                        Updating…
                                    </>
                                ) : (
                                    "Send to new email"
                                )}
                            </Button>
                            <button
                                type="button"
                                onClick={cancelEditEmail}
                                disabled={isSubmittingEmail}
                                className="inline-flex items-center gap-1 px-2 text-[14px] transition-opacity hover:opacity-80 disabled:opacity-60"
                                style={{ color: inkSubtle }}
                            >
                                <X className="h-3.5 w-3.5" />
                                Cancel
                            </button>
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>

            <p className="mt-10 text-center text-[12px]" style={{ color: inkMuted }}>
                Trouble confirming?{" "}
                <a
                    href="mailto:support@beespo.com"
                    className="underline-offset-4 hover:underline"
                    style={{ color: "var(--lp-ink)" }}
                >
                    support@beespo.com
                </a>
            </p>
        </motion.div>
    );
}

export default function CheckEmailPage() {
    return (
        <AuthTwoPane sidePanel={<CheckEmailSidePanel />}>
            <Suspense
                fallback={
                    <div className="flex min-h-[240px] items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--lp-accent)" }} />
                    </div>
                }
            >
                <CheckEmailContent />
            </Suspense>
        </AuthTwoPane>
    );
}
