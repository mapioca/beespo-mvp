"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import { loginAction } from "@/lib/actions/auth-actions";
import { GoogleOAuthButton } from "@/components/auth/google-oauth-button";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

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
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  const resetTurnstile = () => {
    setTurnstileToken(null);
    turnstileRef.current?.reset();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!turnstileToken) {
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

  const inkSubtle = "color-mix(in srgb, var(--lp-ink) 65%, transparent)";
  const inkBorder = "1px solid color-mix(in srgb, var(--lp-ink) 18%, transparent)";

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

  const submitDisabled = isLoading || !turnstileToken;

  return (
    <div
      className="rounded-2xl p-7 sm:p-8"
      style={{ background: "var(--lp-surface)", border: inkBorder }}
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--lp-ink)" }}>
          Sign in
        </h1>
        <p className="text-sm" style={{ color: inkSubtle }}>
          Enter your email and password to access your workspace.
        </p>
      </div>

      {process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true" && (
        <div className="mt-6 space-y-4">
          <GoogleOAuthButton />
          <div className="relative">
            <div
              className="absolute inset-0 flex items-center"
              aria-hidden="true"
            >
              <div
                className="h-px w-full"
                style={{ background: "color-mix(in srgb, var(--lp-ink) 14%, transparent)" }}
              />
            </div>
            <div className="relative flex justify-center">
              <span
                className="px-2 text-[11px] font-semibold uppercase tracking-[0.14em]"
                style={{ background: "var(--lp-surface)", color: inkSubtle }}
              >
                Or continue with email
              </span>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleLogin} className="mt-6 space-y-5">
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
            style={{
              background: "var(--lp-bg)",
              color: "var(--lp-ink)",
              border: "1px solid color-mix(in srgb, var(--lp-ink) 22%, transparent)",
            }}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" style={{ color: "var(--lp-ink)" }}>
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-sm font-medium underline-offset-4 hover:underline"
              style={{ color: "var(--lp-accent)" }}
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            className="rounded-md"
            style={{
              background: "var(--lp-bg)",
              color: "var(--lp-ink)",
              border: "1px solid color-mix(in srgb, var(--lp-ink) 22%, transparent)",
            }}
          />
        </div>

        {TURNSTILE_SITE_KEY ? (
          <Turnstile
            ref={turnstileRef}
            siteKey={TURNSTILE_SITE_KEY}
            onSuccess={setTurnstileToken}
            onExpire={() => setTurnstileToken(null)}
            onError={() => setTurnstileToken(null)}
            options={{ theme: "auto" }}
          />
        ) : null}

        <Button
          type="submit"
          className="w-full rounded-md border-0 transition-opacity hover:opacity-90"
          disabled={submitDisabled}
          style={{ background: "var(--lp-accent)", color: "var(--lp-bg)" }}
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </Button>

        <p className="text-center text-sm" style={{ color: inkSubtle }}>
          Don&apos;t have an account?{" "}
          <Link
            href={signupHref}
            className="font-medium underline underline-offset-4"
            style={{ color: "var(--lp-accent)" }}
          >
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
