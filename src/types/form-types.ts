// Form Builder Types - Schema-driven form system

/**
 * Supported field types for the form builder
 */
export type FormFieldType = 'text' | 'textarea' | 'select' | 'radio' | 'checkbox';

/**
 * Individual field definition within a form schema
 */
export interface FormField {
    id: string;
    type: FormFieldType;
    label: string;
    placeholder?: string;
    required: boolean;
    options?: string[]; // For select, radio, checkbox (multi-option) fields
}

/**
 * Complete form schema - stored as JSON in the database
 */
export interface FormSchema {
    id: string;
    title: string;
    description?: string;
    fields: FormField[];
}

/**
 * Form record as stored in the database
 */
export interface Form {
    id: string;
    workspace_id: string;
    title: string;
    description: string | null;
    schema: FormSchema;
    slug: string;
    is_published: boolean;
    views_count: number;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Form submission record - stores user responses
 */
export interface FormSubmission {
    id: string;
    form_id: string;
    data: Record<string, unknown>;
    submitted_at: string;
}

/**
 * Daily view analytics for a form
 */
export interface FormViewAnalytics {
    id: string;
    form_id: string;
    view_date: string;
    view_count: number;
}

/**
 * Form with computed analytics
 */
export interface FormWithAnalytics extends Form {
    submissions_count: number;
    completion_rate: number;
}

/**
 * Submission data for analytics display
 */
export interface SubmissionAnalytics {
    totalViews: number;
    totalSubmissions: number;
    completionRate: number;
    fieldDistributions: Record<string, Record<string, number>>;
    submissionsOverTime: { date: string; count: number }[];
}
