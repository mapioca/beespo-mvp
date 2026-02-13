"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/lib/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { Shield } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data.user) {
        // Verify the user is a system admin
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (supabase.from("profiles") as any)
          .select("is_sys_admin")
          .eq("id", data.user.id)
          .single();

        if (!profile?.is_sys_admin) {
          // Sign out non-admin users immediately
          await supabase.auth.signOut();
          toast({
            title: "Access Denied",
            description: "You do not have administrator privileges.",
            variant: "destructive",
          });
          return;
        }

        // Check MFA enrollment status
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const totpFactors = factorsData?.totp || [];
        const hasVerifiedTOTP = totpFactors.some(f => f.status === "verified");

        if (!hasVerifiedTOTP) {
          router.push("/mfa/setup");
        } else {
          // Check if session already has aal2
          const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (aalData?.currentLevel === "aal2") {
            router.push("/dashboard");
          } else {
            router.push("/mfa/verify");
          }
        }
        router.refresh();
      }
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-8 w-8 text-zinc-400" />
            <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
              Beespo
            </h1>
          </div>
          <p className="text-sm text-zinc-500">Admin Console</p>
        </div>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-bold text-zinc-100">
              Sign in
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Enter your administrator credentials
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@beespo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-300">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
