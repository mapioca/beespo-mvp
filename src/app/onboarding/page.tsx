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
} from '@/types/onboarding';
import { ONBOARDING_STEPS } from '@/types/onboarding';
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

const TOTAL_STEPS = 6;

const LOADING_MESSAGES = [
  'Creating your workspace...',
  'Setting up your organization...',
  'Preparing your dashboard...',
  'Sending invitations...',
  'Almost there...',
];

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  const [formData, setFormData] = useState<OnboardingFormData>({
    unitType: 'ward',
    organization: '',
    role: '',
    unitName: '',
    teammateEmails: [],
    featureInterests: [],
  });

  // Loading message rotation
  useState(() => {
    if (isSubmitting && !isComplete) {
      const interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  });

  // Check if current step is valid for navigation
  const isStepValid = (): boolean => {
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
      case 6:
        return true;
      default:
        return false;
    }
  };

  const canSkip = (): boolean => {
    const currentStep = ONBOARDING_STEPS.find((s) => s.id === step);
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

  const handleSubmit = async () => {
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

  const handleNext = () => {
    if (!isStepValid()) return;
    if (step === TOTAL_STEPS) {
      handleSubmit();
    } else {
      setStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    if (step === TOTAL_STEPS) {
      handleSubmit();
    } else {
      setStep((prev) => prev + 1);
    }
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-8">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">
              {isComplete ? 'All set!' : LOADING_MESSAGES[loadingMessageIndex]}
            </h2>
            <p className="text-muted-foreground">
              {isComplete ? 'Redirecting you to your dashboard...' : 'This will only take a moment'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left pane - Content */}
      <div className="w-full lg:w-1/2 flex flex-col bg-background">
        {/* Content */}
        <div className="flex-1 flex flex-col px-6 lg:px-12 xl:px-16 pt-8 pb-8">
          {/* Step content wrapper - scrollable area */}
          <div className="max-w-[640px] mx-auto w-full flex flex-col flex-1 overflow-y-auto px-1 -mx-1">
            {/* Logo - aligned with content */}
            <div className="mb-8">
              <Image
                src="/images/beespo-logo-full.svg"
                alt="Beespo"
                width={140}
                height={40}
                className="h-10 w-auto"
              />
            </div>
            {step === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                    What type of unit are you serving in?
                  </h1>
                  <p className="text-muted-foreground">
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
                  <p className="text-muted-foreground">
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
                  <p className="text-muted-foreground">
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
                  <p className="text-muted-foreground">
                    {getUnitNameHelperText(formData.unitType)}
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="unitName">Unit Name</Label>
                    <Input
                      id="unitName"
                      type="text"
                      placeholder={getUnitNamePlaceholder(formData.unitType)}
                      value={formData.unitName}
                      onChange={(e) => updateFormData('unitName', e.target.value)}
                      className="text-lg h-12"
                      autoFocus
                    />
                  </div>
                  {formData.unitName.trim() && (
                    <div className="p-4 bg-muted/50 rounded-lg space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        Your workspace will be named:
                      </p>
                      <p className="font-semibold text-foreground">
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
                  <p className="text-muted-foreground">
                    Add up to 5 teammates to collaborate with. You can always invite more later.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
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
                        className={emailError ? 'border-destructive' : ''}
                      />
                      <Button
                        type="button"
                        onClick={handleAddEmail}
                        disabled={formData.teammateEmails.length >= 5}
                        variant="secondary"
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
                      <Label>Invitations ({formData.teammateEmails.length}/5)</Label>
                      <div className="space-y-2">
                        {formData.teammateEmails.map((email) => (
                          <div
                            key={email}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{email}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveEmail(email)}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 border-2 border-dashed rounded-lg text-center">
                      <Mail className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No teammates added yet. Add email addresses above or skip this step.
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
                    What features are you most interested in?
                  </h1>
                  <p className="text-muted-foreground">
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
                  <p className="text-sm text-muted-foreground text-center">
                    {formData.featureInterests.length} of 3 selected
                  </p>
                )}
              </div>
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
            className="max-w-[640px] mx-auto w-full pt-8 pb-4 flex-shrink-0"
          />
        </div>
      </div>

      {/* Right pane - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 relative overflow-hidden">
        {/* Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-white">
          <div className="text-center space-y-6 max-w-md">
            <div className="w-24 h-24 mx-auto bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Church className="w-12 h-12" />
            </div>
            <h2 className="text-3xl font-bold">Welcome to Beespo</h2>
            <p className="text-lg text-white/80">
              The leadership management platform designed to help you organize meetings,
              sync on discussions, and track assignments seamlessly.
            </p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/10 to-transparent" />
      </div>
    </div>
  );
}
