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
import { useTheme } from "@/components/theme/theme-provider";
import { AuthTwoPane } from "@/components/auth/auth-two-pane";
import { LoginSidePanel } from "@/components/auth/login-side-panel";
import {
  GoogleSignInButton,
  signInWithGoogle,
} from "@/components/auth/google-sign-in-button";

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
      const { error } = await signInWithGoogle();
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

              <GoogleSignInButton
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                buttonClassName="mt-4 h-11 w-full rounded-md font-medium transition-colors hover:bg-[color-mix(in_srgb,var(--lp-ink)_4%,transparent)] disabled:cursor-not-allowed disabled:opacity-60"
                buttonStyle={{
                  background: "var(--lp-bg)",
                  color: "var(--lp-ink)",
                  border: inkBorder,
                }}
                disclosureClassName="mt-2 text-center text-[11px]"
                disclosureStyle={{ color: inkSubtle }}
              />
            </>
          )}
    </AuthTwoPane>
  );
}
