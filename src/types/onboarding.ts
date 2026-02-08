// Onboarding types for the dynamic onboarding wizard

import type { FeatureTier } from './database';

// Unit types available in the system
export type UnitType = 'group' | 'branch' | 'ward' | 'district' | 'stake';

// Organization keys for filtering
export type OrganizationKey =
  | 'bishopric'
  | 'presidency'
  | 'clerk'
  | 'elders_quorum'
  | 'relief_society'
  | 'young_men'
  | 'young_women'
  | 'primary'
  | 'sunday_school'
  | 'missionary'
  | 'tfh';

// Role keys for each organization
export type RoleKey =
  | 'bishop'
  | 'president'
  | 'first_counselor'
  | 'second_counselor'
  | 'executive_secretary'
  | 'clerk'
  | 'assistant_clerk_finance'
  | 'assistant_clerk_membership'
  | 'org_president'
  | 'secretary'
  | 'leader'
  | 'assistant';

// Feature keys for interests
export type FeatureKey =
  | 'meetings'
  | 'callings'
  | 'calendar'
  | 'announcements'
  | 'tasks'
  | 'discussions';

// Unit type option for the selector
export interface UnitTypeOption {
  value: UnitType;
  label: string;
  description: string;
  icon: string;
}

// Organization option for the selector
export interface OrganizationOption {
  value: OrganizationKey;
  label: string;
  description: string;
  icon: string;
  availableFor: UnitType[];
  dbValue: string; // Maps to database organization_type
}

// Role option for the selector
export interface RoleOption {
  value: RoleKey;
  label: string;
  description: string;
  availableFor: OrganizationKey[];
  unitRestrictions?: UnitType[]; // Some roles only available for certain units
  featureTier: FeatureTier;
}

// Feature option for interests
export interface FeatureOption {
  value: FeatureKey;
  label: string;
  description: string;
  icon: string;
}

// Complete form data for onboarding
export interface OnboardingFormData {
  unitType: UnitType;
  organization: OrganizationKey | '';
  role: RoleKey | '';
  unitName: string;
  teammateEmails: string[];
  featureInterests: FeatureKey[];
}

// Step metadata
export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  canSkip: boolean;
}

// Step configuration
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 1,
    title: 'Unit Type',
    description: 'What type of unit are you serving in?',
    canSkip: false,
  },
  {
    id: 2,
    title: 'Organization',
    description: 'Which organization are you part of?',
    canSkip: false,
  },
  {
    id: 3,
    title: 'Role',
    description: 'What is your calling or role?',
    canSkip: false,
  },
  {
    id: 4,
    title: 'Unit Name',
    description: 'What is the name of your unit?',
    canSkip: false,
  },
  {
    id: 5,
    title: 'Teammates',
    description: 'Invite your presidency or team members',
    canSkip: true,
  },
  {
    id: 6,
    title: 'Features',
    description: 'What features are you most interested in?',
    canSkip: true,
  },
];
