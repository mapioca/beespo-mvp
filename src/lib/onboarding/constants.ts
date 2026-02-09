// Onboarding constants - unit types, organizations, roles, and features

import type {
  UnitTypeOption,
  OrganizationOption,
  RoleOption,
  FeatureOption,
} from '@/types/onboarding';

// Unit types with their metadata
export const UNIT_TYPES: UnitTypeOption[] = [
  {
    value: 'group',
    label: 'Group',
    description: 'A small congregation not yet organized as a branch',
    icon: 'Users',
  },
  {
    value: 'branch',
    label: 'Branch',
    description: 'A smaller congregation led by a branch president',
    icon: 'Building2',
  },
  {
    value: 'ward',
    label: 'Ward',
    description: 'A standard congregation led by a bishop',
    icon: 'Church',
  },
  {
    value: 'district',
    label: 'District',
    description: 'An administrative area overseeing multiple branches',
    icon: 'MapPin',
  },
  {
    value: 'stake',
    label: 'Stake',
    description: 'An administrative area overseeing multiple wards',
    icon: 'Landmark',
  },
];

// Organizations with their unit availability
export const ORGANIZATIONS: OrganizationOption[] = [
  {
    value: 'bishopric',
    label: 'Bishopric',
    description: 'Ward leadership under the bishop',
    icon: 'Crown',
    availableFor: ['ward'],
    dbValue: 'bishopric',
  },
  {
    value: 'presidency',
    label: 'Presidency',
    description: 'Unit or organization leadership',
    icon: 'Users',
    availableFor: ['group', 'branch', 'district', 'stake'],
    dbValue: 'bishopric', // Maps to bishopric for non-ward units
  },
  {
    value: 'clerk',
    label: 'Clerk',
    description: 'Ward or stake clerks office',
    icon: 'FileText',
    availableFor: ['branch', 'ward', 'district', 'stake'],
    dbValue: 'bishopric', // Clerks work with bishopric
  },
  {
    value: 'elders_quorum',
    label: 'Elders Quorum',
    description: 'Priesthood quorum for adult men',
    icon: 'Shield',
    availableFor: ['branch', 'ward'],
    dbValue: 'elders_quorum',
  },
  {
    value: 'relief_society',
    label: 'Relief Society',
    description: 'Women\'s organization',
    icon: 'Heart',
    availableFor: ['branch', 'ward'],
    dbValue: 'relief_society',
  },
  {
    value: 'young_men',
    label: 'Young Men',
    description: 'Youth organization for young men',
    icon: 'Zap',
    availableFor: ['branch', 'ward'],
    dbValue: 'young_men',
  },
  {
    value: 'young_women',
    label: 'Young Women',
    description: 'Youth organization for young women',
    icon: 'Star',
    availableFor: ['branch', 'ward'],
    dbValue: 'young_women',
  },
  {
    value: 'primary',
    label: 'Primary',
    description: 'Children\'s organization',
    icon: 'Smile',
    availableFor: ['branch', 'ward'],
    dbValue: 'primary',
  },
  {
    value: 'sunday_school',
    label: 'Sunday School',
    description: 'Gospel teaching organization',
    icon: 'BookOpen',
    availableFor: ['branch', 'ward'],
    dbValue: 'sunday_school',
  },
  {
    value: 'missionary',
    label: 'Missionary Work',
    description: 'Ward or stake missionary coordination',
    icon: 'Globe',
    availableFor: ['group', 'branch', 'ward'],
    dbValue: 'missionary_work',
  },
  {
    value: 'tfh',
    label: 'Temple & Family History',
    description: 'Temple and family history coordination',
    icon: 'Building',
    availableFor: ['group', 'branch', 'ward'],
    dbValue: 'temple_family_history',
  },
];

// Roles with their organization and unit availability
export const ROLES: RoleOption[] = [
  // Bishopric/Presidency roles
  {
    value: 'bishop',
    label: 'Bishop',
    description: 'Presiding high priest of the ward',
    availableFor: ['bishopric'],
    featureTier: 'bishopric',
  },
  {
    value: 'president',
    label: 'President',
    description: 'Presiding authority of the unit or organization',
    availableFor: ['presidency', 'elders_quorum', 'relief_society', 'young_men', 'young_women', 'primary', 'sunday_school'],
    featureTier: 'bishopric',
  },
  {
    value: 'first_counselor',
    label: 'First Counselor',
    description: 'First counselor in the presidency',
    availableFor: ['bishopric', 'presidency', 'elders_quorum', 'relief_society', 'young_men', 'young_women', 'primary', 'sunday_school'],
    featureTier: 'organization',
  },
  {
    value: 'second_counselor',
    label: 'Second Counselor',
    description: 'Second counselor in the presidency',
    availableFor: ['bishopric', 'presidency', 'elders_quorum', 'relief_society', 'young_men', 'young_women', 'primary', 'sunday_school'],
    featureTier: 'organization',
  },
  {
    value: 'executive_secretary',
    label: 'Executive Secretary',
    description: 'Secretary to the bishopric or stake presidency',
    availableFor: ['bishopric', 'presidency'],
    unitRestrictions: ['ward', 'district', 'stake'],
    featureTier: 'support',
  },
  // Clerk roles
  {
    value: 'clerk',
    label: 'Clerk',
    description: 'Ward or stake clerk',
    availableFor: ['clerk'],
    featureTier: 'support',
  },
  {
    value: 'assistant_clerk_finance',
    label: 'Assistant Clerk - Finance',
    description: 'Handles financial records',
    availableFor: ['clerk'],
    featureTier: 'support',
  },
  {
    value: 'assistant_clerk_membership',
    label: 'Assistant Clerk - Membership',
    description: 'Handles membership records',
    availableFor: ['clerk'],
    featureTier: 'support',
  },
  // Organization roles
  {
    value: 'secretary',
    label: 'Secretary',
    description: 'Organization secretary',
    availableFor: ['elders_quorum', 'relief_society', 'young_men', 'young_women', 'primary', 'sunday_school'],
    featureTier: 'support',
  },
  // Missionary/TFH roles
  {
    value: 'leader',
    label: 'Leader',
    description: 'Leads the committee or effort',
    availableFor: ['missionary', 'tfh'],
    featureTier: 'organization',
  },
  {
    value: 'assistant',
    label: 'Assistant',
    description: 'Assists with coordination',
    availableFor: ['missionary', 'tfh'],
    featureTier: 'support',
  },
];

// Features available for selection
export const FEATURES: FeatureOption[] = [
  {
    value: 'meetings',
    label: 'Meetings',
    description: 'Plan and conduct meetings with agendas',
    icon: 'Calendar',
  },
  {
    value: 'callings',
    label: 'Callings',
    description: 'Track calling processes and extensions',
    icon: 'UserCheck',
  },
  {
    value: 'calendar',
    label: 'Calendar',
    description: 'Manage events and schedules',
    icon: 'CalendarDays',
  },
  {
    value: 'announcements',
    label: 'Announcements',
    description: 'Create and share announcements',
    icon: 'Megaphone',
  },
  {
    value: 'tasks',
    label: 'Tasks',
    description: 'Assign and track action items',
    icon: 'CheckSquare',
  },
  {
    value: 'discussions',
    label: 'Discussions',
    description: 'Track ongoing council discussions',
    icon: 'MessageSquare',
  },
];

// Organization display names for workspace naming
export const ORGANIZATION_DISPLAY_NAMES: Record<string, string> = {
  bishopric: 'Bishopric',
  presidency: 'Presidency',
  clerk: 'Clerks',
  elders_quorum: 'Elders Quorum',
  relief_society: 'Relief Society',
  young_men: 'Young Men',
  young_women: 'Young Women',
  primary: 'Primary',
  sunday_school: 'Sunday School',
  missionary: 'Missionary',
  tfh: 'Temple & Family History',
};
