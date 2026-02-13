"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/hooks/use-toast";

const IDLE_WARNING_MS = 25 * 60 * 1000; // 25 minutes
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_EVENTS = ["mousemove", "keydown", "scroll", "touchstart", "click"] as const;

export function IdleTimerProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { toast } = useToast();
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasWarnedRef = useRef(false);

  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }, [router]);

  const resetTimers = useCallback(() => {
    hasWarnedRef.current = false;

    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);

    warningTimerRef.current = setTimeout(() => {
      hasWarnedRef.current = true;
      toast({
        title: "Session Expiring",
        description: "Your session will expire in 5 minutes due to inactivity.",
        variant: "destructive",
      });
    }, IDLE_WARNING_MS);

    timeoutTimerRef.current = setTimeout(() => {
      handleSignOut();
    }, IDLE_TIMEOUT_MS);
  }, [toast, handleSignOut]);

  useEffect(() => {
    resetTimers();

    const handleActivity = () => {
      resetTimers();
    };

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    };
  }, [resetTimers]);

  return <>{children}</>;
}
