"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { PanelRightClose, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Sheet,
    SheetContent,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { useDetailsPanelContext } from "@/components/ui/details-panel-context";
import { cn } from "@/lib/utils";

// ── Responsive hook ──────────────────────────────────────────────────────────

function useIsDesktop() {
    const [isDesktop, setIsDesktop] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia("(min-width: 1024px)");
        setIsDesktop(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);
    return isDesktop;
}

// ── Inner card content (desktop) ─────────────────────────────────────────────

function PanelCard({
    title,
    onClose,
    onDelete,
    children,
}: {
    title: string;
    onClose: () => void;
    onDelete?: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="h-full flex flex-col rounded-[16px] border border-app-island bg-app-island shadow-[var(--shadow-app-island)] min-w-[320px] overflow-hidden">
            {/* Header — always visible, body scrolls beneath it */}
            <div className="shrink-0 flex items-center justify-between px-4 py-1.5 bg-app-island gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0 -ml-1.5"
                        onClick={onClose}
                    >
                        <PanelRightClose className="h-4 w-4" />
                    </Button>
                    <span className="text-[13px] font-semibold truncate">{title}</span>
                </div>
                {onDelete && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0 -mr-1.5"
                        onClick={onDelete}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </div>
            <Separator />
            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
                {children}
            </div>
        </div>
    );
}

// ── DetailsPanel ─────────────────────────────────────────────────────────────

interface DetailsPanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    children: React.ReactNode;
    className?: string;
    onDelete?: () => void;
}

export function DetailsPanel({
    open,
    onOpenChange,
    title = "Details",
    children,
    onDelete,
}: DetailsPanelProps) {
    const { portalEl, reportOpen } = useDetailsPanelContext();
    const isDesktop = useIsDesktop();

    // Tell the shell whether to expand the panel slot
    useEffect(() => {
        reportOpen(isDesktop ? open : false);
    }, [open, isDesktop, reportOpen]);

    // Reset slot on unmount (e.g. page navigation)
    useEffect(() => {
        return () => reportOpen(false);
    }, [reportOpen]);

    // Keyboard close
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onOpenChange(false);
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onOpenChange]);

    const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);

    // Desktop: portal into shell's panel slot
    if (isDesktop) {
        if (!portalEl || !open) return null;
        return createPortal(
            <PanelCard title={title} onClose={handleClose} onDelete={onDelete}>
                {children}
            </PanelCard>,
            portalEl
        );
    }

    // Mobile: Sheet overlay
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-[320px] flex flex-col gap-0 p-0 overflow-hidden"
            >
                <SheetTitle className="sr-only">{title}</SheetTitle>
                <SheetDescription className="sr-only">{title} panel</SheetDescription>
                <div className="shrink-0 flex items-center justify-between px-4 py-1.5">
                    <span className="text-[13px] font-semibold">{title}</span>
                </div>
                <Separator />
                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>
            </SheetContent>
        </Sheet>
    );
}

// ── DetailsPanelSection ───────────────────────────────────────────────────────

interface DetailsPanelSectionProps {
    title?: string;
    children: React.ReactNode;
    className?: string;
}

export function DetailsPanelSection({
    title,
    children,
    className,
}: DetailsPanelSectionProps) {
    return (
        <div className={cn("px-4 py-3.5 space-y-3", className)}>
            {title && (
                <p className="text-drawer-section font-semibold tracking-[0.02em] text-foreground/60">
                    {title}
                </p>
            )}
            {children}
        </div>
    );
}

// ── DetailsPanelField ─────────────────────────────────────────────────────────

interface DetailsPanelFieldProps {
    label: string;
    children: React.ReactNode;
    className?: string;
}

export function DetailsPanelField({
    label,
    children,
    className,
}: DetailsPanelFieldProps) {
    return (
        <div className={cn("flex items-center gap-3 min-h-[28px]", className)}>
            <span className="text-drawer-label font-medium text-muted-foreground shrink-0 w-[110px] leading-none">
                {label}
            </span>
            <div className="flex-1 min-w-0 text-drawer-value font-medium leading-none">
                {children}
            </div>
        </div>
    );
}
