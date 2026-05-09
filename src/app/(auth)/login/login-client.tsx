"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import { loginAction } from "@/lib/actions/auth-actions";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/theme/theme-provider";
import { AuthTwoPane } from "@/components/auth/auth-two-pane";
import { LoginSidePanel } from "@/components/auth/login-side-panel";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

const inkSubtle = "color-mix(in srgb, var(--lp-ink) 65%, transparent)";
const inkBorder = "1px solid color-mix(in srgb, var(--lp-ink) 22%, transparent)";
const inputStyle = {
  background: "color-mix(in srgb, var(--lp-bg) 78%, var(--lp-surface))",
  color: "var(--lp-ink)",
  border: inkBorder,
};

function safeInternalPath(pathname: string | null, fallback: string) {
  if (!pathname) return fallback;
  if (!pathname.startsWith("/")) return fallback;
  if (pathname.startsWith("//")) return fallback;
  return pathname;
}

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get("redirect");
  const useTemplateId = searchParams?.get("use");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const { theme } = useTheme();

  const resetTurnstile = () => {
    setTurnstileToken(null);
    turnstileRef.current?.reset();
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) {
        toast.error(error.message || "Failed to sign in with Google");
        setIsLoading(false);
      }
      // On success the browser navigates to Google; leave isLoading true.
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      toast.error("Please wait for the security check to complete.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await loginAction({
        email,
        password,
        turnstileToken,
        redirectTo,
        useTemplateId,
      });

      if (!result.ok) {
        if (result.code === "email_not_confirmed") {
          toast.error("Email not confirmed", { description: result.error });
          router.push(`/check-email?email=${encodeURIComponent(email)}`);
        } else {
          toast.error(result.error);
        }
        resetTurnstile();
        return;
      }

      toast.success("You've been logged in successfully.");
      router.push(result.redirectTo);
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
      resetTurnstile();
    } finally {
      setIsLoading(false);
    }
  };

  const signupHref =
    redirectTo || useTemplateId
      ? `/signup?${new URLSearchParams(
          Object.fromEntries(
            [
              ["redirect", safeInternalPath(redirectTo ?? null, "/library")],
              ["use", useTemplateId ?? ""],
            ].filter((entry) => entry[1].length > 0)
          )
        ).toString()}`
      : "/signup";

  const submitDisabled =
    isLoading || (Boolean(TURNSTILE_SITE_KEY) && !turnstileToken);

  return (
    <AuthTwoPane sidePanel={<LoginSidePanel />}>
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: "color-mix(in srgb, var(--lp-ink) 55%, transparent)" }}
      >
        Sign in
      </p>
      <h1
        className="mt-2 text-[2rem] font-bold tracking-tight leading-[1.1]"
        style={{ color: "var(--lp-ink)" }}
      >
        Welcome back.
      </h1>
      <p className="relative z-10 mt-3 text-sm" style={{ color: inkSubtle }}>
        New user?{" "}
        <Link
          href={signupHref}
          className="font-medium underline underline-offset-4"
          style={{ color: "var(--lp-accent)" }}
        >
          Create an account
        </Link>
      </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <div className="space-y-1.5">
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
                autoComplete="email"
                className="h-11 rounded-md placeholder:opacity-60"
                style={inputStyle}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" style={{ color: "var(--lp-ink)" }}>
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium underline-offset-4 hover:underline"
                  style={{ color: "var(--lp-accent)" }}
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="h-11 rounded-md pr-10"
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 transition-opacity hover:opacity-80"
                  style={{ color: inkSubtle }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {TURNSTILE_SITE_KEY ? (
              <Turnstile
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={setTurnstileToken}
                onExpire={() => setTurnstileToken(null)}
                onError={() => setTurnstileToken(null)}
                options={{ theme, size: "flexible" }}
              />
            ) : null}

            <Button
              type="submit"
              className="h-11 w-full rounded-md border-0 font-medium transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitDisabled}
              style={{ background: "var(--lp-accent)", color: "var(--lp-bg)" }}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          {process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true" && (
            <>
              <div className="mt-6 flex items-center gap-3">
                <span
                  className="h-px flex-1"
                  style={{ background: "color-mix(in srgb, var(--lp-ink) 14%, transparent)" }}
                />
                <span
                  className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: inkSubtle }}
                >
                  Or
                </span>
                <span
                  className="h-px flex-1"
                  style={{ background: "color-mix(in srgb, var(--lp-ink) 14%, transparent)" }}
                />
              </div>

              <Button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="mt-4 h-11 w-full rounded-md font-medium transition-colors hover:bg-[color-mix(in_srgb,var(--lp-ink)_4%,transparent)] disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  background: "var(--lp-bg)",
                  color: "var(--lp-ink)",
                  border: inkBorder,
                }}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </Button>
            </>
          )}
    </AuthTwoPane>
  );
}
