"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { TermsOfServiceDialog } from "@/components/auth/terms-of-service-dialog";
import { InviteCodeInput } from "@/components/auth/invite-code-input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/lib/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck, Loader2 } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Invite code state
  const [inviteCode, setInviteCode] = useState("");
  const [inviteCodeValid, setInviteCodeValid] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConsumingCode, setIsConsumingCode] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleInviteValidation = useCallback((isValid: boolean, _invitationId: string | null) => {
    setInviteCodeValid(isValid);
  }, []);

  const consumeInviteCode = async (): Promise<string | null> => {
    if (!inviteCode) return null;

    try {
      const response = await fetch("/api/platform-invitations/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode }),
      });

      const data = await response.json();

      if (data.success) {
        return data.invitationId;
      } else {
        throw new Error(data.error || "Failed to consume invite code");
      }
    } catch (error) {
      throw error;
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteCodeValid) {
      toast({
        title: "Invalid Invite Code",
        description: "Please enter a valid invite code to continue.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (!agreedToTerms) {
      toast({
        title: "Error",
        description: "You must agree to the Terms and Conditions to create an account.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setIsConsumingCode(true);

    try {
      // First, consume the invite code atomically
      const consumedInvitationId = await consumeInviteCode();

      if (!consumedInvitationId) {
        toast({
          title: "Invite Code Error",
          description: "The invite code is no longer valid. Please get a new code.",
          variant: "destructive",
        });
        setInviteCodeValid(false);
        setIsLoading(false);
        setIsConsumingCode(false);
        return;
      }

      setIsConsumingCode(false);

      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            platform_invitation_id: consumedInvitationId,
          },
        },
      });

      if (error) {
        // If user already exists, check if they have a profile
        if (error.message.includes("already registered") || error.message.includes("already been registered")) {
          // Try to sign them in instead
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            toast({
              title: "Error",
              description: "This email is already registered. Please use the login page instead.",
              variant: "destructive",
            });
            setTimeout(() => {
              router.push("/login");
            }, 2000);
          } else if (signInData.user) {
            // Check if user has a profile
            const { data: profile } = await supabase
              .from("profiles")
              .select("id")
              .eq("id", signInData.user.id)
              .single();

            if (!profile) {
              // User exists but no profile - redirect to setup
              toast({
                title: "Complete Setup",
                description: "Please complete your profile setup.",
              });
              router.push("/onboarding");
            } else {
              // User has profile - redirect to dashboard
              router.push("/dashboard");
            }
            router.refresh();
          }
        } else {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        }
      } else if (data.user) {
        toast({
          title: "Success",
          description: "Account created successfully! Please complete your profile.",
        });
        router.push("/onboarding");
        router.refresh();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsConsumingCode(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!inviteCodeValid) {
      toast({
        title: "Invalid Invite Code",
        description: "Please enter a valid invite code before signing up with Google.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setIsConsumingCode(true);

    try {
      // First, consume the invite code atomically
      const consumedInvitationId = await consumeInviteCode();

      if (!consumedInvitationId) {
        toast({
          title: "Invite Code Error",
          description: "The invite code is no longer valid. Please get a new code.",
          variant: "destructive",
        });
        setInviteCodeValid(false);
        setIsLoading(false);
        setIsConsumingCode(false);
        return;
      }

      // Store the invitation ID in sessionStorage for the callback to use
      sessionStorage.setItem("pending_platform_invitation_id", consumedInvitationId);

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        // Clear the stored invitation ID if OAuth fails
        sessionStorage.removeItem("pending_platform_invitation_id");
        toast({
          title: "Error",
          description: error.message || "Failed to sign in with Google",
          variant: "destructive",
        });
        setIsLoading(false);
      }
      // If no error, browser will redirect to Google
    } catch {
      sessionStorage.removeItem("pending_platform_invitation_id");
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const isFormDisabled = isLoading || !inviteCodeValid;

  return (
    <Card className="border-border">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
        <CardDescription>
          Enter your invite code and information to get started
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Invite Code Section */}
        <Alert className="bg-muted/50">
          <ShieldCheck className="h-4 w-4" />
          <AlertDescription>
            Beespo is currently invite-only. Enter your invite code to continue.
          </AlertDescription>
        </Alert>

        <InviteCodeInput
          value={inviteCode}
          onChange={setInviteCode}
          onValidationComplete={handleInviteValidation}
          disabled={isLoading}
        />

        {inviteCodeValid && (
          <>
            <Separator />

            {/* Google OAuth Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full"
            >
              {isConsumingCode ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
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
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or sign up with email
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>

      {inviteCodeValid && (
        <form onSubmit={handleSignup}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={isFormDisabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isFormDisabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isFormDisabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isFormDisabled}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                disabled={isFormDisabled}
              />
              <label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I agree to the <TermsOfServiceDialog />
              </label>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isFormDisabled}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isConsumingCode ? "Verifying code..." : "Creating account..."}
                </>
              ) : (
                "Create account"
              )}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium underline underline-offset-4 hover:text-foreground"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      )}

      {!inviteCodeValid && (
        <CardFooter>
          <p className="text-center text-sm text-muted-foreground w-full">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium underline underline-offset-4 hover:text-foreground"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      )}
    </Card>
  );
}
