"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AccentItalic } from "@/components/auth/auth-two-pane";

const inkSoft = "color-mix(in srgb, var(--lp-ink) 55%, transparent)";
const inkBody = "color-mix(in srgb, var(--lp-ink) 78%, transparent)";

const EASE = [0.16, 1, 0.3, 1] as const;

function safeNext(value: string | null): string {
    if (!value) return "/onboarding";
    if (!value.startsWith("/") || value === "/") return "/onboarding";
    if (value.startsWith("//")) return "/onboarding";
    return value;
}

function VerifiedContent() {
    const searchParams = useSearchParams();
    const nextPath = safeNext(searchParams?.get("next") ?? null);

    return (
        <div
            className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12"
            style={{ background: "var(--lp-bg)" }}
        >
            <Link
                href="/"
                className="absolute top-8 left-1/2 -translate-x-1/2 text-[11px] font-semibold uppercase tracking-[0.32em] transition-opacity hover:opacity-70"
                style={{ color: inkSoft }}
            >
                Beespo
            </Link>

            <div className="w-full max-w-[440px] text-center">
                <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE, delay: 0.05 }}
                    className="text-[11px] font-semibold uppercase tracking-[0.32em]"
                    style={{ color: "var(--lp-accent)" }}
                >
                    Verified
                </motion.p>

                <motion.h1
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
                    className="mt-5 font-bold tracking-tighter"
                    style={{
                        color: "var(--lp-ink)",
                        fontSize: "clamp(2.5rem, 5.5vw + 1rem, 4.25rem)",
                        lineHeight: 1.02,
                    }}
                >
                    You&apos;re <AccentItalic>in.</AccentItalic>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: EASE, delay: 0.3 }}
                    className="mx-auto mt-7 max-w-[380px] text-[16px] leading-relaxed"
                    style={{ color: inkBody }}
                >
                    Your email is confirmed. You can close this tab — your
                    original Beespo window will take you in automatically.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, ease: EASE, delay: 0.5 }}
                    className="mt-10"
                >
                    <Link
                        href={nextPath}
                        className="inline-flex items-center gap-1.5 text-[13px] font-medium underline-offset-[6px] transition-colors hover:underline"
                        style={{ color: "var(--lp-accent)" }}
                    >
                        Continue here instead
                        <span aria-hidden="true">→</span>
                    </Link>
                </motion.div>
            </div>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, ease: EASE, delay: 0.8 }}
                className="absolute bottom-8 text-[11px]"
                style={{ color: inkSoft }}
            >
                Built for the bishopric.
            </motion.p>
        </div>
    );
}

export default function VerifiedPage() {
    return (
        <Suspense fallback={<div className="min-h-screen" style={{ background: "var(--lp-bg)" }} />}>
            <VerifiedContent />
        </Suspense>
    );
}
