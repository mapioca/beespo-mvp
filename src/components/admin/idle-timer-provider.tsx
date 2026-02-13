"use client";

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useToast } from "@/lib/hooks/use-toast";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
interface IdleTimerContextValue {
    /** Seconds remaining before auto-logout */
    remainingSeconds: number;
    /** Manually reset the timer (e.g. after a meaningful action) */
    resetTimer: () => void;
}

const IdleTimerContext = createContext<IdleTimerContextValue>({
    remainingSeconds: 0,
    resetTimer: () => { },
});

export const useIdleTimer = () => useContext(IdleTimerContext);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_THRESHOLD_MS = 25 * 60 * 1000; // 25 minutes — show toast
const TICK_INTERVAL_MS = 1_000; // 1 second

const TRACKED_EVENTS: (keyof DocumentEventMap)[] = [
    "mousemove",
    "mousedown",
    "keydown",
    "scroll",
    "touchstart",
];

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function IdleTimerProvider({ children }: { children: React.ReactNode }) {
    const { toast } = useToast();
    const lastActivityRef = useRef(Date.now());
    const warningShownRef = useRef(false);
    const [remainingSeconds, setRemainingSeconds] = useState(
        SESSION_TIMEOUT_MS / 1000
    );

    // ---- Reset timer on user activity ----
    const resetTimer = useCallback(() => {
        lastActivityRef.current = Date.now();
        warningShownRef.current = false;
    }, []);

    // ---- Attach activity listeners ----
    useEffect(() => {
        const handleActivity = () => {
            lastActivityRef.current = Date.now();
            warningShownRef.current = false;
        };

        TRACKED_EVENTS.forEach((event) =>
            document.addEventListener(event, handleActivity, { passive: true })
        );

        return () => {
            TRACKED_EVENTS.forEach((event) =>
                document.removeEventListener(event, handleActivity)
            );
        };
    }, []);

    // ---- Tick: update remaining time + check thresholds ----
    useEffect(() => {
        const interval = setInterval(() => {
            const elapsed = Date.now() - lastActivityRef.current;
            const remaining = Math.max(0, SESSION_TIMEOUT_MS - elapsed);
            setRemainingSeconds(Math.ceil(remaining / 1000));

            // Warning toast at 25-minute mark
            if (elapsed >= WARNING_THRESHOLD_MS && !warningShownRef.current) {
                warningShownRef.current = true;
                toast({
                    title: "Session expiring soon",
                    description:
                        "Your admin session will expire in 5 minutes due to inactivity.",
                    variant: "destructive",
                });
            }

            // Auto-logout at 30 minutes
            if (elapsed >= SESSION_TIMEOUT_MS) {
                clearInterval(interval);

                const supabase = createBrowserClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
                );

                supabase.auth.signOut().then(() => {
                    window.location.href = "/admin/login?reason=timeout";
                });
            }
        }, TICK_INTERVAL_MS);

        return () => clearInterval(interval);
    }, [toast]);

    return (
        <IdleTimerContext.Provider value={{ remainingSeconds, resetTimer }}>
            {children}
        </IdleTimerContext.Provider>
    );
}
