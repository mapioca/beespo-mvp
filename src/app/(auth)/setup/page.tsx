"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/lib/hooks/use-toast";
import { ArrowRight, Sparkles, Users } from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [inviteToken, setInviteToken] = useState("");
  const [showJoinForm, setShowJoinForm] = useState(false);

  const handleJoinWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: inviteToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = typeof data.error === "string" ? data.error : "Failed to accept invitation";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      if (data.needsAuth) {
        toast({
          title: "Error",
          description: "Please sign up or log in first.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: "Success",
        description: `You've joined ${data.workspaceName}!`,
      });

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to join workspace",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Get Started with Beespo</h1>
        <p className="text-muted-foreground">
          Create your organization&apos;s workspace or join an existing one
        </p>
      </div>

      {/* Primary CTA - Create New Workspace */}
      <Link href="/onboarding">
        <Card className="border-2 border-primary/20 hover:border-primary/50 transition-colors cursor-pointer group">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">Create a New Workspace</CardTitle>
                <CardDescription>
                  Set up a workspace for your bishopric, presidency, or organization
                </CardDescription>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </CardHeader>
        </Card>
      </Link>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or if you have an invitation
          </span>
        </div>
      </div>

      {/* Secondary - Join Existing */}
      {!showJoinForm ? (
        <Button
          variant="outline"
          className="w-full gap-2 h-auto py-4"
          onClick={() => setShowJoinForm(true)}
        >
          <Users className="h-5 w-5" />
          <div className="text-left">
            <div className="font-medium">Join an Existing Workspace</div>
            <div className="text-xs text-muted-foreground font-normal">
              Enter an invitation token from your admin
            </div>
          </div>
        </Button>
      ) : (
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Join a Workspace</CardTitle>
            <CardDescription>
              Enter your invitation token to join
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinWorkspace} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inviteToken">Invitation Token</Label>
                <Input
                  id="inviteToken"
                  type="text"
                  placeholder="Paste your invitation token here"
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                  required
                  disabled={isLoading}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Check your email or ask your workspace admin for the token.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowJoinForm(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 gap-2" disabled={isLoading || !inviteToken.trim()}>
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Joining...
                    </>
                  ) : (
                    <>
                      Join Workspace
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
