"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useCallback } from "react";

import { SettingsSidebar } from "@/components/settings/settings-sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SettingsShell({
    children,
    workspaceName,
}: {
    children: React.ReactNode;
    workspaceName?: string;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const isAtRoot = pathname === "/settings";

    const handleBackToApp = useCallback(() => {
        if (typeof window !== "undefined") {
            const referrer = document.referrer;
            if (referrer) {
                try {
                    const referrerUrl = new URL(referrer);
                    const isSameOrigin = referrerUrl.origin === window.location.origin;
                    const isSettingsPath = referrerUrl.pathname === "/settings" || referrerUrl.pathname.startsWith("/settings/");

                    if (isSameOrigin && !isSettingsPath) {
                        router.push(`${referrerUrl.pathname}${referrerUrl.search}${referrerUrl.hash}`);
                        return;
                    }
                } catch {}
            }
        }

        router.push("/dashboard");
    }, [router]);

    return (
        <div className="flex h-screen-dynamic overflow-hidden overscroll-none bg-app-shell">
            <aside
                className={cn(
                    "min-h-0 w-full shrink-0 overflow-y-auto border-r border-[var(--app-nav-border)] bg-[var(--app-nav-bg)] px-2.5 py-3.5 lg:flex lg:w-[248px] lg:flex-col",
                    isAtRoot ? "flex flex-col" : "hidden",
                    "lg:flex"
                )}
            >
                <div className="mb-4">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleBackToApp}
                        className="w-full justify-start text-[13px] text-[var(--app-nav-text)] hover:bg-[var(--app-nav-hover)] hover:text-[var(--app-nav-strong)]"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Back to app
                    </Button>
                    {workspaceName ? (
                        <p className="px-3 pt-2 text-xs text-[var(--app-nav-muted)]">
                            {workspaceName}
                        </p>
                    ) : null}
                </div>
                <SettingsSidebar />
            </aside>

            <div
                className={cn(
                    "min-h-0 min-w-0 flex-1 overflow-y-auto bg-surface-canvas",
                    isAtRoot ? "hidden lg:block" : "block"
                )}
            >
                <div className="lg:hidden">
                    <div className="sticky top-0 z-10 border-b border-border/60 bg-surface-canvas/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-surface-canvas/80">
                        <Button asChild variant="ghost" className="h-auto px-0 text-sm font-medium">
                            <Link href="/settings">
                                <ChevronLeft className="h-4 w-4" />
                                Settings
                            </Link>
                        </Button>
                    </div>
                </div>
                <div className="mx-auto w-full max-w-3xl px-6 py-8">
                    {children}
                </div>
            </div>
        </div>
    );
}
