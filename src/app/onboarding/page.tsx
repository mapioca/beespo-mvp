'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PillSelector } from '@/components/onboarding/pill-selector';
import { WizardFooter } from '@/components/onboarding/wizard-footer';
import { toast } from '@/lib/toast';
import {
  getOrganizationKeyFromDbType,
  getRolesForOrganization,
  getRoleTitle,
  generateWorkspaceName,
} from '@/lib/onboarding/filters';
import type {
  OnboardingFormData,
  RoleKey,
  WorkspaceMemberRole,
  WorkspaceInvitationData,
} from '@/types/onboarding';
import { INVITABLE_ROLES, formatRoleLabel } from '@/lib/auth/role-permissions';
import { ONBOARDING_STEPS, INVITED_USER_ONBOARDING_STEPS } from '@/types/onboarding';
import {
  Users,
  Plus,
  X,
  Loader2,
  PartyPopper,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const inkSubtle = 'color-mix(in srgb, var(--lp-ink) 65%, transparent)';
const inkBorder = '1px solid color-mix(in srgb, var(--lp-ink) 18%, transparent)';
const inputStyle = {
  background: 'var(--lp-bg)',
  color: 'var(--lp-ink)',
  border: '1px solid color-mix(in srgb, var(--lp-ink) 22%, transparent)',
};

const LOADING_MESSAGES = [
  'Creating your workspace...',
  'Setting up your organization...',
  'Preparing your dashboard...',
  'Sending invitations...',
  'Almost there...',
];

const INVITED_LOADING_MESSAGES = [
  'Joining workspace...',
  'Setting up your profile...',
  'Almost there...',
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Invited user state
  const [isInvitedUser, setIsInvitedUser] = useState(false);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<WorkspaceInvitationData | null>(null);
  const [selectedInvitedRole, setSelectedInvitedRole] = useState<RoleKey | ''>('');

  // Invite rows state - start with 2 empty rows
  const [inviteRows, setInviteRows] = useState<Array<{ email: string; role: WorkspaceMemberRole }>>([
    { email: '', role: 'editor' },
    { email: '', role: 'editor' },
  ]);
  const [inviteErrors, setInviteErrors] = useState<Record<number, string>>({});

  // Beespo currently only ships the bishopric workspace, so unitType and
  // organization are pinned. The wizard only collects role, ward name, and
  // optional teammate invites.
  const [formData, setFormData] = useState<OnboardingFormData>({
    unitType: 'ward',
    organization: 'bishopric',
    role: '',
    unitName: '',
    teammateInvites: [],
    featureInterests: [],
  });

  // Check if user already has a workspace (existing user) - redirect to dashboard
  useEffect(() => {
    const checkExistingUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Not logged in, redirect to login
        router.push('/login');
        return;
      }

      // Check if user already has a workspace
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('workspace_id, is_deleted')
        .eq('id', user.id)
        .single();

      if (profile?.is_deleted) {
        await supabase.auth.signOut();
        router.push('/signup');
        return;
      }

      if (profile?.workspace_id) {
        // User already has a workspace, redirect to dashboard
        router.push('/dashboard');
        return;
      }

      setIsCheckingAuth(false);
    };

    checkExistingUser();
  }, [router]);

  // Check for pending workspace invitation on mount
  useEffect(() => {
    const token = sessionStorage.getItem('pending_workspace_invitation_token');
    if (token) {
      setIsInvitedUser(true);
      setInvitationToken(token);

      // Fetch invitation details
      const fetchInvitationData = async () => {
        try {
          const response = await fetch('/api/workspace-invitations/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });

          const data = await response.json();

          if (data.valid) {
            setInvitationData({
              email: data.email,
              workspaceName: data.workspaceName,
              role: data.role,
              unitType: data.unitType,
              organizationType: data.organizationType,
            });
          } else {
            // Token is no longer valid
            toast.error('Invitation Expired', { description: 'Your workspace invitation is no longer valid.' });
            sessionStorage.removeItem('pending_workspace_invitation_token');
            router.push('/');
          }
        } catch {
          toast.error('Failed to load invitation details.');
        }
      };

      fetchInvitationData();
    }
  }, [router]);

  // Determine steps based on user type
  const currentSteps = isInvitedUser ? INVITED_USER_ONBOARDING_STEPS : ONBOARDING_STEPS;
  const TOTAL_STEPS = currentSteps.length;
  const currentLoadingMessages = isInvitedUser ? INVITED_LOADING_MESSAGES : LOADING_MESSAGES;
  const invitedOrganizationKey = invitationData?.organizationType && invitationData.unitType
    ? getOrganizationKeyFromDbType(invitationData.organizationType, invitationData.unitType)
    : null;
  const invitedRoleOptions = invitedOrganizationKey && invitationData?.unitType
    ? getRolesForOrganization(invitedOrganizationKey, invitationData.unitType)
    : [];

  // Loading message rotation
  useEffect(() => {
    if (isSubmitting && !isComplete) {
      const interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % currentLoadingMessages.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isSubmitting, isComplete, currentLoadingMessages.length]);

  // Check if current step is valid for navigation
  const isStepValid = (): boolean => {
    if (isInvitedUser) {
      // Invited user flow
      switch (step) {
        case 1:
          return true; // Welcome step is always valid
        case 2:
          return Boolean(selectedInvitedRole);
        default:
          return false;
      }
    }

    // Regular flow (3 steps: role → ward name → invites)
    switch (step) {
      case 1:
        return Boolean(formData.role);
      case 2:
        return formData.unitName.trim().length >= 2;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const canSkip = (): boolean => {
    const currentStep = currentSteps.find((s) => s.id === step);
    return currentStep?.canSkip ?? false;
  };

  const updateFormData = <K extends keyof OnboardingFormData>(
    field: K,
    value: OnboardingFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitCreate = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete onboarding');
      }

      setIsComplete(true);

      toast.success('Welcome to Beespo!', { description: 'Your workspace has been created successfully.' });

      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
      setIsSubmitting(false);
    }
  };

  const handleSubmitJoin = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceInvitationToken: invitationToken,
          role: selectedInvitedRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join workspace');
      }

      // Clear the stored token
      sessionStorage.removeItem('pending_workspace_invitation_token');

      setIsComplete(true);

      toast.success('Welcome to the team!', { description: `You've successfully joined ${invitationData?.workspaceName}.` });

      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (!isStepValid()) return;

    if (isInvitedUser) {
      // Invited user flow
      if (step === TOTAL_STEPS) {
        handleSubmitJoin();
      } else {
        setStep((prev) => prev + 1);
      }
      return;
    }

    // Regular flow — invite step is the last step
    if (step === TOTAL_STEPS) {
      if (!syncInvitesToFormData()) {
        return; // Validation errors exist
      }
      handleSubmitCreate();
    } else {
      setStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    } else {
      // Go back to welcome page
      router.push('/welcome');
    }
  };

  const handleSkip = () => {
    // On the invites step, sync valid invites even when skipping
    if (!isInvitedUser && step === TOTAL_STEPS) {
      syncInvitesToFormData();
    }

    if (step === TOTAL_STEPS) {
      if (isInvitedUser) {
        handleSubmitJoin();
      } else {
        handleSubmitCreate();
      }
    } else {
      setStep((prev) => prev + 1);
    }
  };

  // Email handling for teammates step
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const updateInviteRow = (index: number, field: 'email' | 'role', value: string) => {
    setInviteRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    // Clear error for this row when user types
    if (field === 'email') {
      setInviteErrors((prev) => {
        const updated = { ...prev };
        delete updated[index];
        return updated;
      });
    }
  };

  const addInviteRow = () => {
    if (inviteRows.length < 5) {
      setInviteRows((prev) => [...prev, { email: '', role: 'editor' }]);
    }
  };

  const removeInviteRow = (index: number) => {
    if (inviteRows.length > 1) {
      setInviteRows((prev) => prev.filter((_, i) => i !== index));
      setInviteErrors((prev) => {
        const updated = { ...prev };
        delete updated[index];
        return updated;
      });
    }
  };

  // Sync invite rows to formData before submission
  const syncInvitesToFormData = () => {
    const validInvites = inviteRows
      .filter((row) => row.email.trim() !== '')
      .map((row) => ({ email: row.email.trim().toLowerCase(), role: row.role }));

    // Check for validation errors
    const errors: Record<number, string> = {};
    const seenEmails = new Set<string>();

    inviteRows.forEach((row, index) => {
      const email = row.email.trim().toLowerCase();
      if (email && !validateEmail(email)) {
        errors[index] = 'Invalid email';
      } else if (email && seenEmails.has(email)) {
        errors[index] = 'Duplicate';
      }
      if (email) seenEmails.add(email);
    });

    setInviteErrors(errors);

    if (Object.keys(errors).length === 0) {
      updateFormData('teammateInvites', validInvites);
      return true;
    }
    return false;
  };

  // Format role for display
  const formatRole = (role: string) => formatRoleLabel(role) || 'Member';

  // Loading state while checking auth
  if (isCheckingAuth) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: 'var(--lp-bg)' }}
      >
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--lp-accent)' }} />
      </div>
    );
  }

  // Submitting state
  if (isSubmitting) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: 'var(--lp-bg)' }}
      >
        <div className="space-y-8 text-center">
          <Loader2
            className="mx-auto h-12 w-12 animate-spin"
            style={{ color: 'var(--lp-accent)' }}
          />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold" style={{ color: 'var(--lp-ink)' }}>
              {isComplete ? 'All set!' : currentLoadingMessages[loadingMessageIndex]}
            </h2>
            <p style={{ color: inkSubtle }}>
              {isComplete
                ? 'Redirecting you to your dashboard...'
                : 'This will only take a moment'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Bishopric roles for the regular flow (ward + bishopric is hard-coded)
  const bishopricRoleOptions = getRolesForOrganization('bishopric', 'ward');

  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{ background: 'var(--lp-bg)' }}
    >
      <div
        className="flex min-h-[600px] w-full max-w-3xl flex-col rounded-2xl p-8 md:p-12"
        style={{ background: 'var(--lp-surface)', border: inkBorder }}
      >
        {/* Brand wordmark */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight transition-opacity hover:opacity-80"
            style={{ color: 'var(--lp-ink)' }}
          >
            Beespo
          </Link>
        </div>

        {/* Step content - flex-1 to fill available space */}
        <div className="flex-1">
          {/* INVITED USER FLOW */}
          {isInvitedUser && (
            <>
              {/* Step 1: Welcome */}
              {step === 1 && invitationData && (
                <div className="space-y-6">
                  <div className="mb-6 flex justify-center">
                    <div
                      className="flex h-16 w-16 items-center justify-center rounded-full"
                      style={{ background: 'color-mix(in srgb, var(--lp-accent) 14%, transparent)' }}
                    >
                      <PartyPopper className="h-8 w-8" style={{ color: 'var(--lp-accent)' }} />
                    </div>
                  </div>
                  <div className="space-y-2 text-center">
                    <h1
                      className="text-2xl font-bold tracking-tight lg:text-3xl"
                      style={{ color: 'var(--lp-ink)' }}
                    >
                      Welcome to Beespo
                    </h1>
                    <p className="text-lg" style={{ color: inkSubtle }}>
                      You&apos;ve been invited to join
                    </p>
                    <p className="text-xl font-semibold" style={{ color: 'var(--lp-ink)' }}>
                      {invitationData.workspaceName}
                    </p>
                    <div className="pt-4">
                      <span
                        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
                        style={{
                          background: 'color-mix(in srgb, var(--lp-accent) 12%, transparent)',
                          color: 'var(--lp-accent)',
                        }}
                      >
                        <Users className="h-4 w-4" />
                        You&apos;ll be joining as {formatRole(invitationData.role)}
                      </span>
                    </div>
                  </div>
                  <p className="pt-4 text-center" style={{ color: inkSubtle }}>
                    Just a quick step to complete your profile and you&apos;ll be ready to collaborate with your team.
                  </p>
                </div>
              )}

              {/* Step 2: Role */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h1
                      className="text-2xl font-bold tracking-tight lg:text-3xl"
                      style={{ color: 'var(--lp-ink)' }}
                    >
                      What is your calling?
                    </h1>
                    <p style={{ color: inkSubtle }}>
                      Select your role in the bishopric so your profile matches this workspace.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <PillSelector
                      options={invitedRoleOptions.map((role) => ({
                        value: role.value,
                        label: role.label,
                        description: role.description,
                      }))}
                      value={selectedInvitedRole}
                      onChange={(value) => setSelectedInvitedRole(value as RoleKey)}
                      ariaLabel="Select your calling"
                    />
                    {selectedInvitedRole && invitedOrganizationKey && (
                      <div
                        className="space-y-1 rounded-xl p-4"
                        style={{
                          background: 'var(--lp-bg)',
                          border: inkBorder,
                        }}
                      >
                        <p className="text-sm font-medium" style={{ color: inkSubtle }}>
                          You&apos;ll appear as:
                        </p>
                        <p className="font-semibold" style={{ color: 'var(--lp-ink)' }}>
                          {getRoleTitle(selectedInvitedRole, invitedOrganizationKey)}
                        </p>
                      </div>
                    )}
                    {invitedRoleOptions.length === 0 && (
                      <p className="text-sm" style={{ color: 'var(--lp-accent)' }}>
                        We couldn&apos;t determine the available roles for this workspace.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* REGULAR WORKSPACE CREATION FLOW (bishopric of a ward) */}
          {!isInvitedUser && (
            <>
              {/* Step 1: Calling */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h1
                      className="text-2xl font-bold tracking-tight lg:text-3xl"
                      style={{ color: 'var(--lp-ink)' }}
                    >
                      What is your calling in the bishopric?
                    </h1>
                    <p style={{ color: inkSubtle }}>
                      Select your role.
                    </p>
                  </div>
                  <PillSelector
                    options={bishopricRoleOptions.map((role) => ({
                      value: role.value,
                      label: role.label,
                      description: role.description,
                    }))}
                    value={formData.role}
                    onChange={(v) => updateFormData('role', v as RoleKey)}
                    ariaLabel="Select your calling"
                  />
                </div>
              )}

              {/* Step 2: Ward name */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h1
                      className="text-2xl font-bold tracking-tight lg:text-3xl"
                      style={{ color: 'var(--lp-ink)' }}
                    >
                      What is the name of your ward?
                    </h1>
                    <p style={{ color: inkSubtle }}>
                      Enter the name of your ward (without &quot;Ward&quot;).
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="unitName"
                        className="text-sm font-medium"
                        style={{ color: inkSubtle }}
                      >
                        Ward name
                      </Label>
                      <Input
                        id="unitName"
                        type="text"
                        placeholder="e.g., Riverside"
                        value={formData.unitName}
                        onChange={(e) => updateFormData('unitName', e.target.value)}
                        className="h-12 rounded-lg text-base placeholder:opacity-60"
                        style={inputStyle}
                        autoFocus
                      />
                    </div>
                    {formData.unitName.trim() && (
                      <div
                        className="space-y-1 rounded-xl p-4"
                        style={{
                          background: 'var(--lp-bg)',
                          border: inkBorder,
                        }}
                      >
                        <p className="text-sm font-medium" style={{ color: inkSubtle }}>
                          Your workspace will be named:
                        </p>
                        <p className="font-semibold" style={{ color: 'var(--lp-ink)' }}>
                          {generateWorkspaceName(
                            formData.unitName.trim(),
                            'bishopric',
                            'ward'
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Invite teammates */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h1
                      className="text-2xl font-bold tracking-tight lg:text-3xl"
                      style={{ color: 'var(--lp-ink)' }}
                    >
                      Invite the rest of your bishopric
                    </h1>
                    <p style={{ color: inkSubtle }}>
                      Counselors, executive secretary, ward clerk — you can add anyone now or invite them later.
                    </p>
                  </div>

                  {/* Invite rows */}
                  <div className="space-y-3">
                    {inviteRows.map((row, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="flex-1">
                          <Input
                            type="email"
                            placeholder="colleague@example.com"
                            value={row.email}
                            onChange={(e) => updateInviteRow(index, 'email', e.target.value)}
                            className="h-10 rounded-md placeholder:opacity-60"
                            style={
                              inviteErrors[index]
                                ? { ...inputStyle, border: '1px solid var(--lp-accent)' }
                                : inputStyle
                            }
                          />
                          {inviteErrors[index] && (
                            <p
                              className="mt-1 text-xs"
                              style={{ color: 'var(--lp-accent)' }}
                            >
                              {inviteErrors[index]}
                            </p>
                          )}
                        </div>
                        <Select
                          value={row.role}
                          onValueChange={(value) => updateInviteRow(index, 'role', value)}
                        >
                          <SelectTrigger
                            className="h-10 w-[120px] rounded-md"
                            style={inputStyle}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {INVITABLE_ROLES.map((r) => (
                              <SelectItem key={r} value={r}>{formatRoleLabel(r)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {inviteRows.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeInviteRow(index)}
                            className="h-10 w-10 bg-transparent hover:bg-transparent hover:opacity-70"
                            style={{ color: inkSubtle }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add another */}
                  {inviteRows.length < 5 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={addInviteRow}
                      className="bg-transparent hover:bg-transparent hover:opacity-80"
                      style={{ color: 'var(--lp-accent)' }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add another
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Wizard Footer - anchored at bottom */}
        <WizardFooter
          currentStep={step}
          totalSteps={TOTAL_STEPS}
          canGoBack={!isInvitedUser || step > 1}
          canSkip={canSkip()}
          canContinue={isStepValid()}
          isLastStep={step === TOTAL_STEPS}
          onBack={handleBack}
          onSkip={handleSkip}
          onContinue={handleNext}
          continueLabel={isInvitedUser && step === TOTAL_STEPS ? 'Join workspace' : undefined}
          className="flex-shrink-0 pt-8"
        />
      </div>
    </div>
  );
}

