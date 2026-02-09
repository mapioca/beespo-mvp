'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PillSelector } from '@/components/onboarding/pill-selector';
import { WizardFooter } from '@/components/onboarding/wizard-footer';
import { useToast } from '@/lib/hooks/use-toast';
import { UNIT_TYPES, FEATURES } from '@/lib/onboarding/constants';
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
  FeatureKey,
  OnboardingFlow,
} from '@/types/onboarding';
import { ONBOARDING_STEPS_CREATE, ONBOARDING_STEPS_JOIN } from '@/types/onboarding';
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
  Calendar,
  UserCheck,
  CalendarDays,
  Megaphone,
  CheckSquare,
  MessageSquare,
  Plus,
  X,
  Mail,
  Loader2,
} from 'lucide-react';

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

const featureIconMap: Record<string, React.ReactNode> = {
  Calendar: <Calendar className="h-5 w-5" />,
  UserCheck: <UserCheck className="h-5 w-5" />,
  CalendarDays: <CalendarDays className="h-5 w-5" />,
  Megaphone: <Megaphone className="h-5 w-5" />,
  CheckSquare: <CheckSquare className="h-5 w-5" />,
  MessageSquare: <MessageSquare className="h-5 w-5" />,
};

const LOADING_MESSAGES = [
  'Creating your workspace...',
  'Setting up your organization...',
  'Preparing your dashboard...',
  'Sending invitations...',
  'Almost there...',
];

const LOADING_MESSAGES_JOIN = [
  'Joining workspace...',
  'Setting up your profile...',
  'Almost there...',
];

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [flow, setFlow] = useState<OnboardingFlow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [formData, setFormData] = useState<OnboardingFormData>({
    unitType: 'ward',
    organization: '',
    role: '',
    unitName: '',
    teammateEmails: [],
    featureInterests: [],
  });

  // Get current steps based on flow
  const currentSteps = flow === 'join' ? ONBOARDING_STEPS_JOIN : ONBOARDING_STEPS_CREATE;
  const TOTAL_STEPS = currentSteps.length;

  // Loading message rotation
  useState(() => {
    if (isSubmitting && !isComplete) {
      const interval = setInterval(() => {
        const messages = flow === 'join' ? LOADING_MESSAGES_JOIN : LOADING_MESSAGES;
        setLoadingMessageIndex((prev) => (prev + 1) % messages.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  });

  // Check if current step is valid for navigation
  const isStepValid = (): boolean => {
    // Step 1 uses instant selection, no validation needed
    if (step === 1) {
      return false;
    }

    if (flow === 'join') {
      return step === 2 ? inviteToken.trim().length > 0 : false;
    }

    // Create flow validation
    switch (step) {
      case 2:
        return Boolean(formData.unitType);
      case 3:
        return Boolean(formData.organization);
      case 4:
        return Boolean(formData.role);
      case 5:
        return formData.unitName.trim().length >= 2;
      case 6:
      case 7:
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
        toast({
          title: 'Error',
          description: 'Please sign up or log in first.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      setIsComplete(true);

      toast({
        title: 'Welcome to Beespo!',
        description: `You've joined ${data.workspaceName}!`,
      });

      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1500);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to join workspace';
      setInviteError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (!isStepValid()) return;

    if (step === TOTAL_STEPS) {
      if (flow === 'join') {
        handleSubmitJoin();
      } else {
        handleSubmitCreate();
      }
    } else {
      setStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      if (step === 2) {
        // Going back to step 1, reset flow selection
        setFlow(null);
        setInviteToken('');
        setInviteError(null);
      }
      setStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    if (step === TOTAL_STEPS) {
      if (flow === 'join') {
        handleSubmitJoin();
      } else {
        handleSubmitCreate();
      }
    } else {
      setStep((prev) => prev + 1);
    }
  };

  const handleSelectFlow = (selectedFlow: OnboardingFlow) => {
    setFlow(selectedFlow);
    // Immediately advance to step 2
    setStep(2);
  };

  // Email handling for teammates step
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleAddEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    if (formData.teammateEmails.includes(email)) {
      setEmailError('This email has already been added');
      return;
    }

    if (formData.teammateEmails.length >= 5) {
      setEmailError('You can invite up to 5 teammates');
      return;
    }

    updateFormData('teammateEmails', [...formData.teammateEmails, email]);
    setEmailInput('');
    setEmailError(null);
  };

  const handleRemoveEmail = (email: string) => {
    updateFormData('teammateEmails', formData.teammateEmails.filter((e) => e !== email));
  };

  // Loading state
  if (isSubmitting) {
    const messages = flow === 'join' ? LOADING_MESSAGES_JOIN : LOADING_MESSAGES;
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
              {isComplete ? 'All set!' : messages[loadingMessageIndex]}
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
          {/* Step 1: Choose path - "Fork in the Road" */}
          {step === 1 && (
            <div className="space-y-10">
              <div className="text-center">
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                  Get Started with Beespo
                </h1>
              </div>

              {/* Split Choice Tiles - 2 Column Grid */}
              <div className="grid grid-cols-2 gap-6">
                {/* Create New Workspace Tile */}
                <button
                  type="button"
                  onClick={() => handleSelectFlow('create')}
                  className="flex items-center justify-center h-44 px-6 rounded-2xl border border-gray-100 bg-gray-50 transition-all duration-200 ease-in-out hover:border-black hover:bg-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="text-xl font-semibold text-gray-900 text-center leading-tight">
                    Create a New<br />Workspace
                  </span>
                </button>

                {/* Join Existing Workspace Tile */}
                <button
                  type="button"
                  onClick={() => handleSelectFlow('join')}
                  className="flex items-center justify-center h-44 px-6 rounded-2xl border border-gray-100 bg-gray-50 transition-all duration-200 ease-in-out hover:border-black hover:bg-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="text-xl font-semibold text-gray-900 text-center leading-tight">
                    Join an Existing<br />Workspace
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Step 2 for Join flow: Enter invitation token */}
          {step === 2 && flow === 'join' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                  Join a Workspace
                </h1>
                <p className="text-gray-500">
                  Enter your invitation token to join an existing workspace
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteToken" className="text-sm text-gray-500 font-medium">Invitation Token</Label>
                  <Input
                    id="inviteToken"
                    type="text"
                    placeholder="Paste your invitation token here"
                    value={inviteToken}
                    onChange={(e) => {
                      setInviteToken(e.target.value);
                      setInviteError(null);
                    }}
                    className={`text-base h-12 rounded-lg border-gray-200 focus:border-black focus:ring-2 focus:ring-black focus:ring-offset-0 ${inviteError ? 'border-destructive' : ''}`}
                    autoFocus
                  />
                  {inviteError && (
                    <p className="text-sm text-destructive">{inviteError}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    Check your email or ask your workspace admin for the token.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Create flow steps */}
          {flow === 'create' && (
            <>
              {step === 2 && (
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

              {step === 3 && (
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

              {step === 4 && (
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

              {step === 5 && (
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

              {step === 6 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                      Invite people to your workspace
                    </h1>
                    <p className="text-gray-500">
                      Add up to 5 teammates to collaborate with. You can always invite more later.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm text-gray-500 font-medium">Email Address</Label>
                      <div className="flex gap-2">
                        <Input
                          id="email"
                          type="email"
                          placeholder="colleague@example.com"
                          value={emailInput}
                          onChange={(e) => {
                            setEmailInput(e.target.value);
                            setEmailError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddEmail();
                            }
                          }}
                          className={`h-12 rounded-lg border-gray-200 focus:border-black focus:ring-2 focus:ring-black focus:ring-offset-0 ${emailError ? 'border-destructive' : ''}`}
                        />
                        <Button
                          type="button"
                          onClick={handleAddEmail}
                          disabled={formData.teammateEmails.length >= 5}
                          variant="secondary"
                          className="h-12 px-4 font-medium"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                      {emailError && (
                        <p className="text-sm text-destructive">{emailError}</p>
                      )}
                    </div>

                    {formData.teammateEmails.length > 0 ? (
                      <div className="space-y-2">
                        <Label className="text-sm text-gray-500 font-medium">Invitations ({formData.teammateEmails.length}/5)</Label>
                        <div className="space-y-2">
                          {formData.teammateEmails.map((email) => (
                            <div
                              key={email}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100"
                            >
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-700">{email}</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveEmail(email)}
                                className="h-8 w-8 p-0 text-gray-400 hover:text-gray-900"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 border-2 border-dashed border-gray-200 rounded-xl text-center bg-gray-50/50">
                        <Mail className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                        <p className="text-sm text-gray-500">
                          No teammates added yet. Add email addresses above or skip this step.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step === 7 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                      What features are you most interested in?
                    </h1>
                    <p className="text-gray-500">
                      Select up to 3 features you&apos;d like to explore first.
                    </p>
                  </div>
                  <PillSelector
                    options={FEATURES.map((feature) => ({
                      ...feature,
                      icon: featureIconMap[feature.icon] || null,
                    }))}
                    value={formData.featureInterests}
                    onChange={(v) => updateFormData('featureInterests', v as FeatureKey[])}
                    multiple
                    maxSelections={3}
                    ariaLabel="Select features you're interested in"
                  />
                  {formData.featureInterests.length > 0 && (
                    <p className="text-sm text-gray-500 text-center">
                      {formData.featureInterests.length} of 3 selected
                    </p>
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
          canGoBack={step > 1}
          canSkip={canSkip()}
          canContinue={isStepValid()}
          isLastStep={step === TOTAL_STEPS}
          onBack={handleBack}
          onSkip={handleSkip}
          onContinue={handleNext}
          continueLabel={flow === 'join' && step === TOTAL_STEPS ? 'Join Workspace' : undefined}
          hideNavigation={step === 1}
          className="pt-8 flex-shrink-0"
        />
      </div>
    </div>
  );
}
