'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
import { useToast } from '@/lib/hooks/use-toast';
import { UNIT_TYPES } from '@/lib/onboarding/constants';
import {
  getOrganizationsForUnit,
  getRolesForOrganization,
  getUnitNamePlaceholder,
  getUnitNameHelperText,
  generateWorkspaceName,
} from '@/lib/onboarding/filters';
import type {
  OnboardingFormData,
  UnitType,
  OrganizationKey,
  RoleKey,
  WorkspaceMemberRole,
  WorkspaceInvitationData,
} from '@/types/onboarding';
import { ONBOARDING_STEPS, INVITED_USER_ONBOARDING_STEPS } from '@/types/onboarding';
import {
  Users,
  Building2,
  Church,
  MapPin,
  Landmark,
  Crown,
  FileText,
  Shield,
  Heart,
  Zap,
  Star,
  Smile,
  BookOpen,
  Globe,
  Building,
  Plus,
  X,
  Loader2,
  PartyPopper,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const unitIconMap: Record<string, React.ReactNode> = {
  Users: <Users className="h-5 w-5" />,
  Building2: <Building2 className="h-5 w-5" />,
  Church: <Church className="h-5 w-5" />,
  MapPin: <MapPin className="h-5 w-5" />,
  Landmark: <Landmark className="h-5 w-5" />,
};

const orgIconMap: Record<string, React.ReactNode> = {
  Crown: <Crown className="h-5 w-5" />,
  Users: <Users className="h-5 w-5" />,
  FileText: <FileText className="h-5 w-5" />,
  Shield: <Shield className="h-5 w-5" />,
  Heart: <Heart className="h-5 w-5" />,
  Zap: <Zap className="h-5 w-5" />,
  Star: <Star className="h-5 w-5" />,
  Smile: <Smile className="h-5 w-5" />,
  BookOpen: <BookOpen className="h-5 w-5" />,
  Globe: <Globe className="h-5 w-5" />,
  Building: <Building className="h-5 w-5" />,
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
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Invited user state
  const [isInvitedUser, setIsInvitedUser] = useState(false);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<WorkspaceInvitationData | null>(null);
  const [roleTitle, setRoleTitle] = useState('');

  // Invite rows state - start with 2 empty rows
  const [inviteRows, setInviteRows] = useState<Array<{ email: string; role: WorkspaceMemberRole }>>([
    { email: '', role: 'leader' },
    { email: '', role: 'leader' },
  ]);
  const [inviteErrors, setInviteErrors] = useState<Record<number, string>>({});

  const [formData, setFormData] = useState<OnboardingFormData>({
    unitType: 'ward',
    organization: '',
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
        .select('workspace_id')
        .eq('id', user.id)
        .single();

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
            });
          } else {
            // Token is no longer valid
            toast({
              title: 'Invitation Expired',
              description: 'Your workspace invitation is no longer valid.',
              variant: 'destructive',
            });
            sessionStorage.removeItem('pending_workspace_invitation_token');
            router.push('/');
          }
        } catch {
          toast({
            title: 'Error',
            description: 'Failed to load invitation details.',
            variant: 'destructive',
          });
        }
      };

      fetchInvitationData();
    }
  }, [router, toast]);

  // Determine steps based on user type
  const currentSteps = isInvitedUser ? INVITED_USER_ONBOARDING_STEPS : ONBOARDING_STEPS;
  const TOTAL_STEPS = currentSteps.length;
  const currentLoadingMessages = isInvitedUser ? INVITED_LOADING_MESSAGES : LOADING_MESSAGES;

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
          return roleTitle.trim().length >= 2;
        default:
          return false;
      }
    }

    // Regular flow
    switch (step) {
      case 1:
        return Boolean(formData.unitType);
      case 2:
        return Boolean(formData.organization);
      case 3:
        return Boolean(formData.role);
      case 4:
        return formData.unitName.trim().length >= 2;
      case 5:
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
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'unitType') {
        updated.organization = '';
        updated.role = '';
      } else if (field === 'organization') {
        updated.role = '';
      }
      return updated;
    });
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

      toast({
        title: 'Welcome to Beespo!',
        description: 'Your workspace has been created successfully.',
      });

      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1500);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      });
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
          roleTitle: roleTitle.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join workspace');
      }

      // Clear the stored token
      sessionStorage.removeItem('pending_workspace_invitation_token');

      setIsComplete(true);

      toast({
        title: 'Welcome to the team!',
        description: `You've successfully joined ${invitationData?.workspaceName}.`,
      });

      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1500);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      });
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

    // Regular flow
    // Sync invite rows to formData on step 5
    if (step === 5) {
      if (!syncInvitesToFormData()) {
        return; // Validation errors exist
      }
    }

    if (step === TOTAL_STEPS) {
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
    // On step 5, sync valid invites even when skipping
    if (!isInvitedUser && step === 5) {
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
      setInviteRows((prev) => [...prev, { email: '', role: 'leader' }]);
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
  const formatRole = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'leader':
        return 'Leader';
      case 'guest':
        return 'Guest';
      default:
        return 'Member';
    }
  };

  // Loading state while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100/50 backdrop-blur-sm">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  // Loading state
  if (isSubmitting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100/50 backdrop-blur-sm">
        <div className="text-center space-y-8">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">
              {isComplete ? 'All set!' : currentLoadingMessages[loadingMessageIndex]}
            </h2>
            <p className="text-gray-500">
              {isComplete ? 'Redirecting you to your dashboard...' : 'This will only take a moment'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100/50 backdrop-blur-sm p-6">
      <div className="w-full max-w-3xl flex flex-col min-h-[600px] bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 p-8 md:p-12">
        {/* Logo */}
        <div className="mb-8">
          <Image
            src="/images/beespo-logo-full.svg"
            alt="Beespo"
            width={140}
            height={40}
            className="h-10 w-auto"
          />
        </div>

        {/* Step content - flex-1 to fill available space */}
        <div className="flex-1">
          {/* INVITED USER FLOW */}
          {isInvitedUser && (
            <>
              {/* Step 1: Welcome */}
              {step === 1 && invitationData && (
                <div className="space-y-6">
                  <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <PartyPopper className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-2 text-center">
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                      Welcome to Beespo!
                    </h1>
                    <p className="text-gray-500 text-lg">
                      You&apos;ve been invited to join
                    </p>
                    <p className="text-xl font-semibold text-gray-900">
                      {invitationData.workspaceName}
                    </p>
                    <div className="pt-4">
                      <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
                        <Users className="h-4 w-4" />
                        You&apos;ll be joining as {formatRole(invitationData.role)}
                      </span>
                    </div>
                  </div>
                  <p className="text-center text-gray-500 pt-4">
                    Just a quick step to complete your profile and you&apos;ll be ready to collaborate with your team.
                  </p>
                </div>
              )}

              {/* Step 2: Role Title */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                      What is your calling or role?
                    </h1>
                    <p className="text-gray-500">
                      This helps your teammates know your position in the organization.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="roleTitle" className="text-sm text-gray-500 font-medium">
                        Your Role Title
                      </Label>
                      <Input
                        id="roleTitle"
                        type="text"
                        placeholder="e.g., Relief Society Secretary, Young Men Advisor"
                        value={roleTitle}
                        onChange={(e) => setRoleTitle(e.target.value)}
                        className="text-base h-12 rounded-lg border-gray-200 focus:border-black focus:ring-2 focus:ring-black focus:ring-offset-0"
                        autoFocus
                      />
                    </div>
                    {roleTitle.trim() && (
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                        <p className="text-sm font-medium text-gray-500">
                          You&apos;ll appear as:
                        </p>
                        <p className="font-semibold text-gray-900">
                          {roleTitle.trim()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* REGULAR WORKSPACE CREATION FLOW */}
          {!isInvitedUser && (
            <>
              {/* Step 1: Unit Type */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                      What type of unit are you serving in?
                    </h1>
                    <p className="text-gray-500">
                      Select the type of church unit your organization belongs to.
                    </p>
                  </div>
                  <PillSelector
                    options={UNIT_TYPES.map((type) => ({
                      ...type,
                      icon: unitIconMap[type.icon] || null,
                    }))}
                    value={formData.unitType}
                    onChange={(v) => updateFormData('unitType', v as UnitType)}
                    ariaLabel="Select unit type"
                  />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                      Which organization are you part of?
                    </h1>
                    <p className="text-gray-500">
                      Select the organization you serve in.
                    </p>
                  </div>
                  <PillSelector
                    options={getOrganizationsForUnit(formData.unitType).map((org) => ({
                      ...org,
                      icon: orgIconMap[org.icon] || null,
                    }))}
                    value={formData.organization}
                    onChange={(v) => updateFormData('organization', v as OrganizationKey)}
                    ariaLabel="Select organization"
                  />
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                      What is your calling or role?
                    </h1>
                    <p className="text-gray-500">
                      Select your role in the organization.
                    </p>
                  </div>
                  <PillSelector
                    options={getRolesForOrganization(
                      formData.organization as OrganizationKey,
                      formData.unitType
                    ).map((role) => ({
                      value: role.value,
                      label: role.label,
                      description: role.description,
                    }))}
                    value={formData.role}
                    onChange={(v) => updateFormData('role', v as RoleKey)}
                    ariaLabel="Select your role"
                  />
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                      What is the name of your unit?
                    </h1>
                    <p className="text-gray-500">
                      {getUnitNameHelperText(formData.unitType)}
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="unitName" className="text-sm text-gray-500 font-medium">Unit Name</Label>
                      <Input
                        id="unitName"
                        type="text"
                        placeholder={getUnitNamePlaceholder(formData.unitType)}
                        value={formData.unitName}
                        onChange={(e) => updateFormData('unitName', e.target.value)}
                        className="text-base h-12 rounded-lg border-gray-200 focus:border-black focus:ring-2 focus:ring-black focus:ring-offset-0"
                        autoFocus
                      />
                    </div>
                    {formData.unitName.trim() && (
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                        <p className="text-sm font-medium text-gray-500">
                          Your workspace will be named:
                        </p>
                        <p className="font-semibold text-gray-900">
                          {generateWorkspaceName(
                            formData.unitName.trim(),
                            formData.organization as OrganizationKey,
                            formData.unitType
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                      Invite people to your workspace
                    </h1>
                    <p className="text-gray-500">
                      Optionally add teammates to collaborate with. You can always invite more later.
                    </p>
                  </div>

                  {/* Invite rows */}
                  <div className="space-y-3">
                    {inviteRows.map((row, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <div className="flex-1">
                          <Input
                            type="email"
                            placeholder="colleague@example.com"
                            value={row.email}
                            onChange={(e) => updateInviteRow(index, 'email', e.target.value)}
                            className={`h-10 ${inviteErrors[index] ? 'border-destructive' : ''}`}
                          />
                          {inviteErrors[index] && (
                            <p className="text-xs text-destructive mt-1">{inviteErrors[index]}</p>
                          )}
                        </div>
                        <Select
                          value={row.role}
                          onValueChange={(value) => updateInviteRow(index, 'role', value)}
                        >
                          <SelectTrigger className="w-[120px] h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="leader">Leader</SelectItem>
                            <SelectItem value="guest">Guest</SelectItem>
                          </SelectContent>
                        </Select>
                        {inviteRows.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeInviteRow(index)}
                            className="h-10 w-10 text-gray-400 hover:text-gray-900"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add another button */}
                  {inviteRows.length < 5 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={addInviteRow}
                      className="text-gray-500 hover:text-gray-900"
                    >
                      <Plus className="h-4 w-4 mr-2" />
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
          continueLabel={isInvitedUser && step === TOTAL_STEPS ? 'Join Workspace' : undefined}
          className="pt-8 flex-shrink-0"
        />
      </div>
    </div>
  );
}
