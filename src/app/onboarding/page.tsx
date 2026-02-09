'use client';

import { useState } from 'react';
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
  WorkspaceMemberRole,
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

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
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

  const TOTAL_STEPS = ONBOARDING_STEPS.length;

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

  const handleNext = () => {
    if (!isStepValid()) return;

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
    if (step === 5) {
      syncInvitesToFormData();
    }

    if (step === TOTAL_STEPS) {
      handleSubmitCreate();
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
              {isComplete ? 'All set!' : LOADING_MESSAGES[loadingMessageIndex]}
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
                      Add up to 5 teammates to collaborate with. You can always invite more later.
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

              {step === 6 && (
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
        </div>

        {/* Wizard Footer - anchored at bottom */}
        <WizardFooter
          currentStep={step}
          totalSteps={TOTAL_STEPS}
          canGoBack={true}
          canSkip={canSkip()}
          canContinue={isStepValid()}
          isLastStep={step === TOTAL_STEPS}
          onBack={handleBack}
          onSkip={handleSkip}
          onContinue={handleNext}
          className="pt-8 flex-shrink-0"
        />
      </div>
    </div>
  );
}
