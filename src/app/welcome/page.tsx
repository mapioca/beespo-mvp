'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from '@/lib/toast';
import { Plus, Users, ArrowRight, Loader2 } from 'lucide-react';

export default function WelcomePage() {
  const router = useRouter();
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [inviteToken, setInviteToken] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateWorkspace = () => {
    router.push('/onboarding');
  };

  const handleJoinWorkspace = async () => {
    if (!inviteToken.trim()) return;

    setIsSubmitting(true);
    setInviteError(null);

    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: inviteToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = typeof data.error === 'string' ? data.error : 'Failed to accept invitation';
        throw new Error(errorMessage);
      }

      if (data.needsAuth) {
        toast.error('Please sign up or log in first.');
        setIsSubmitting(false);
        return;
      }

      toast.success('Welcome to Beespo!', { description: `You've joined ${data.workspaceName}!` });

      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to join workspace';
      setInviteError(message);
      toast.error(message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center text-center">
          <div className="relative h-16 w-48 mb-4">
            <Image
              src="/images/beespo-logo-full.svg"
              alt="Beespo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Leadership Management Platform
          </p>
        </div>

        {/* Card */}
        <Card className="border-border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Welcome</CardTitle>
            <CardDescription>
              How would you like to get started?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Create Workspace Option */}
            <button
              type="button"
              onClick={handleCreateWorkspace}
              className="group flex items-center gap-3 w-full p-3 rounded-lg border border-border bg-background text-left transition-all duration-150 hover:border-foreground/20 hover:bg-muted"
            >
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-foreground flex items-center justify-center">
                <Plus className="h-4 w-4 text-background" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Create a Workspace</p>
                <p className="text-xs text-muted-foreground">Start fresh with a new workspace</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>

            {/* Join Workspace Option */}
            {!showJoinForm ? (
              <button
                type="button"
                onClick={() => setShowJoinForm(true)}
                className="group flex items-center gap-3 w-full p-3 rounded-lg border border-border bg-background text-left transition-all duration-150 hover:border-foreground/20 hover:bg-muted"
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Join a Workspace</p>
                  <p className="text-xs text-muted-foreground">I have an invite code</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            ) : (
              <div className="p-3 rounded-lg border border-border bg-muted/50 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Join a Workspace</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowJoinForm(false);
                      setInviteToken('');
                      setInviteError(null);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inviteToken">Invite Code</Label>
                  <Input
                    id="inviteToken"
                    type="text"
                    placeholder="Paste your invite code"
                    value={inviteToken}
                    onChange={(e) => {
                      setInviteToken(e.target.value);
                      setInviteError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleJoinWorkspace();
                      }
                    }}
                    className={inviteError ? 'border-destructive' : ''}
                    autoFocus
                  />
                  {inviteError && (
                    <p className="text-sm text-destructive">{inviteError}</p>
                  )}
                </div>

                <Button
                  onClick={handleJoinWorkspace}
                  disabled={!inviteToken.trim() || isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    'Join Workspace'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
