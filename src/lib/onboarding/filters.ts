// Onboarding filter functions for conditional logic

import type { FeatureTier } from '@/types/database';
import type {
  UnitType,
  OrganizationKey,
  RoleKey,
  OrganizationOption,
  RoleOption,
} from '@/types/onboarding';
import { ORGANIZATIONS, ROLES, ORGANIZATION_DISPLAY_NAMES } from './constants';

/**
 * Get organizations available for a specific unit type
 */
export function getOrganizationsForUnit(unitType: UnitType): OrganizationOption[] {
  return ORGANIZATIONS.filter((org) => org.availableFor.includes(unitType));
}

/**
 * Get roles available for a specific organization and unit type
 */
export function getRolesForOrganization(
  org: OrganizationKey,
  unitType: UnitType
): RoleOption[] {
  return ROLES.filter((role) => {
    // Must be available for this organization
    if (!role.availableFor.includes(org)) {
      return false;
    }

    // Check unit restrictions if any
    return !(role.unitRestrictions && !role.unitRestrictions.includes(unitType));


  });
}

/**
 * Get the feature tier for a specific role
 */
export function getFeatureTier(role: RoleKey): FeatureTier {
  const roleOption = ROLES.find((r) => r.value === role);
  return roleOption?.featureTier || 'support';
}

/**
 * Get the role label/title for display
 */
export function getRoleTitle(role: RoleKey, org: OrganizationKey): string {
  const roleOption = ROLES.find((r) => r.value === role);
  if (!roleOption) return '';

  // For generic roles, add organization context
  if (role === 'president' && org !== 'presidency') {
    const orgOption = ORGANIZATIONS.find((o) => o.value === org);
    return `${orgOption?.label || ''} President`;
  }

  if (role === 'first_counselor' || role === 'second_counselor') {
    return roleOption.label;
  }

  return roleOption.label;
}

/**
 * Generate workspace name from unit name and organization
 */
export function generateWorkspaceName(
  unitName: string,
  org: OrganizationKey,
  unitType: UnitType
): string {
  const orgName = ORGANIZATION_DISPLAY_NAMES[org] || org;
  const unitTypeName = unitType.charAt(0).toUpperCase() + unitType.slice(1);

  // Format: "Riverside Ward Bishopric" or "Riverside Branch Presidency"
  return `${unitName} ${unitTypeName} ${orgName}`.trim();
}

/**
 * Get database organization_type value from organization key
 */
export function getDbOrganizationType(org: OrganizationKey): string {
  const orgOption = ORGANIZATIONS.find((o) => o.value === org);
  return orgOption?.dbValue || 'bishopric';
}

/**
 * Validate that the selection chain is valid
 */
export function isValidSelectionChain(
  unitType: UnitType,
  org: OrganizationKey,
  role: RoleKey
): boolean {
  // Check organization is valid for unit
  const validOrgs = getOrganizationsForUnit(unitType);
  if (!validOrgs.some((o) => o.value === org)) {
    return false;
  }

  // Check role is valid for organization and unit
  const validRoles = getRolesForOrganization(org, unitType);
  return validRoles.some((r) => r.value === role);


}

/**
 * Get placeholder text for unit name input based on unit type
 */
export function getUnitNamePlaceholder(unitType: UnitType): string {
  const placeholders: Record<UnitType, string> = {
    group: 'e.g., Mesa',
    branch: 'e.g., Riverside',
    ward: 'e.g., Riverside',
    district: 'e.g., Phoenix North',
    stake: 'e.g., Mesa Arizona',
  };
  return placeholders[unitType];
}

/**
 * Get helper text for unit name input based on unit type
 */
export function getUnitNameHelperText(unitType: UnitType): string {
  const helpers: Record<UnitType, string> = {
    group: 'Enter the name of your group',
    branch: 'Enter the name of your branch (without "Branch")',
    ward: 'Enter the name of your ward (without "Ward")',
    district: 'Enter the name of your district (without "District")',
    stake: 'Enter the name of your stake (without "Stake")',
  };
  return helpers[unitType];
}
