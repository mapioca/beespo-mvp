// Onboarding form validation with Zod

import { z } from 'zod';

// Unit type validation
export const unitTypeSchema = z.enum(['group', 'branch', 'ward', 'district', 'stake']);

// Organization validation
export const organizationSchema = z.enum([
  'bishopric',
  'presidency',
  'clerk',
  'elders_quorum',
  'relief_society',
  'young_men',
  'young_women',
  'primary',
  'sunday_school',
  'missionary',
  'tfh',
]);

// Role validation
export const roleSchema = z.enum([
  'bishop',
  'president',
  'first_counselor',
  'second_counselor',
  'executive_secretary',
  'clerk',
  'assistant_clerk_finance',
  'assistant_clerk_membership',
  'org_president',
  'secretary',
  'leader',
  'assistant',
]);

// Feature validation
export const featureSchema = z.enum([
  'meetings',
  'callings',
  'calendar',
  'announcements',
  'tasks',
  'discussions',
]);

// Email validation for teammate invites
export const emailSchema = z.string().email('Please enter a valid email address');

// Complete onboarding form schema
export const onboardingFormSchema = z.object({
  unitType: unitTypeSchema,
  organization: organizationSchema,
  role: roleSchema,
  unitName: z
    .string()
    .min(2, 'Unit name must be at least 2 characters')
    .max(100, 'Unit name must be less than 100 characters'),
  teammateEmails: z
    .array(emailSchema)
    .max(5, 'You can invite up to 5 teammates')
    .optional()
    .default([]),
  featureInterests: z
    .array(featureSchema)
    .max(3, 'You can select up to 3 features')
    .optional()
    .default([]),
});

// Type inference from schema
export type OnboardingFormInput = z.infer<typeof onboardingFormSchema>;

// Step-specific validation schemas
export const step1Schema = z.object({
  unitType: unitTypeSchema,
});

export const step2Schema = z.object({
  organization: organizationSchema,
});

export const step3Schema = z.object({
  role: roleSchema,
});

export const step4Schema = z.object({
  unitName: z
    .string()
    .min(2, 'Unit name must be at least 2 characters')
    .max(100, 'Unit name must be less than 100 characters'),
});

export const step5Schema = z.object({
  teammateEmails: z
    .array(emailSchema)
    .max(5, 'You can invite up to 5 teammates'),
});

export const step6Schema = z.object({
  featureInterests: z
    .array(featureSchema)
    .max(3, 'You can select up to 3 features'),
});

// Validation helper functions
export function validateStep(step: number, data: Partial<OnboardingFormInput>): {
  valid: boolean;
  errors: string[];
} {
  const schemas: Record<number, z.ZodSchema> = {
    1: step1Schema,
    2: step2Schema,
    3: step3Schema,
    4: step4Schema,
    5: step5Schema,
    6: step6Schema,
  };

  const schema = schemas[step];
  if (!schema) {
    return { valid: true, errors: [] };
  }

  const result = schema.safeParse(data);
  if (result.success) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: result.error.issues.map((issue) => issue.message),
  };
}

// Validate complete form
export function validateOnboardingForm(data: unknown): {
  valid: boolean;
  data?: OnboardingFormInput;
  errors?: Record<string, string[]>;
} {
  const result = onboardingFormSchema.safeParse(data);

  if (result.success) {
    return { valid: true, data: result.data };
  }

  const errors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  }

  return { valid: false, errors };
}
