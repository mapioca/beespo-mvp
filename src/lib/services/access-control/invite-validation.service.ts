/**
 * Invite Validation Service
 * 
 * Core service for validating and consuming invite codes.
 * Uses the database function for atomic operations.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
    ValidateInviteCodeResult,
    CreateInvitationResult,
    CreateInvitationParams,
} from './types';
import { InviteCreationError } from './types';
import { normalizeInviteCode, isValidCodeFormat } from './invite-code-generator';

/**
 * Validate and consume an invite code atomically
 * 
 * This function:
 * 1. Validates the code format client-side
 * 2. Calls the database function to validate & consume atomically
 * 3. Returns the result with error handling
 * 
 * @param supabase - Supabase client (can be anon or service role)
 * @param code - The invite code to validate
 * @param ipAddress - Optional IP address for rate limiting
 */
export async function validateAndConsumeInviteCode(
    supabase: SupabaseClient,
    code: string,
    ipAddress?: string
): Promise<ValidateInviteCodeResult> {
    // Client-side format validation
    const normalizedCode = normalizeInviteCode(code);

    if (!isValidCodeFormat(normalizedCode)) {
        return {
            isValid: false,
            errorMessage: 'Invalid invite code format.',
            invitationId: null,
        };
    }

    try {
        // Call the database function for atomic validation
        const { data, error } = await supabase.rpc('validate_and_consume_invite_code', {
            p_code: normalizedCode,
            p_ip_address: ipAddress || null,
        });

        if (error) {
            console.error('[InviteValidation] Database error:', error.message);
            return {
                isValid: false,
                errorMessage: 'Unable to validate code. Please try again.',
                invitationId: null,
            };
        }

        // The RPC returns an array with one row
        const result = Array.isArray(data) ? data[0] : data;

        if (!result) {
            return {
                isValid: false,
                errorMessage: 'Unable to validate code. Please try again.',
                invitationId: null,
            };
        }

        return {
            isValid: result.is_valid,
            errorMessage: result.error_message || null,
            invitationId: result.invitation_id || null,
        };
    } catch (err) {
        console.error('[InviteValidation] Unexpected error:', err);
        return {
            isValid: false,
            errorMessage: 'An unexpected error occurred. Please try again.',
            invitationId: null,
        };
    }
}

/**
 * Validate an invite code WITHOUT consuming it
 * Useful for pre-validation in the UI before form submission
 * 
 * Note: This does NOT increment usage count - only checks validity
 */
export async function validateInviteCode(
    supabase: SupabaseClient,
    code: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _ipAddress?: string
): Promise<ValidateInviteCodeResult> {
    const normalizedCode = normalizeInviteCode(code);

    if (!isValidCodeFormat(normalizedCode)) {
        return {
            isValid: false,
            errorMessage: 'Invalid invite code format.',
            invitationId: null,
        };
    }

    try {
        // Query the platform_invitations table directly
        const { data: invitation, error } = await supabase
            .from('platform_invitations')
            .select('id, code, max_uses, uses_count, expires_at, status')
            .eq('code', normalizedCode)
            .single();

        if (error || !invitation) {
            return {
                isValid: false,
                errorMessage: 'Invalid invite code.',
                invitationId: null,
            };
        }

        // Check status
        if (invitation.status === 'revoked') {
            return {
                isValid: false,
                errorMessage: 'Invalid invite code.',
                invitationId: null,
            };
        }

        // Check expiration
        if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
            return {
                isValid: false,
                errorMessage: 'Invalid invite code.',
                invitationId: null,
            };
        }

        // Check usage
        if (invitation.uses_count >= invitation.max_uses) {
            return {
                isValid: false,
                errorMessage: 'Invalid invite code.',
                invitationId: null,
            };
        }

        return {
            isValid: true,
            errorMessage: null,
            invitationId: invitation.id,
        };
    } catch (err) {
        console.error('[InviteValidation] Unexpected error:', err);
        return {
            isValid: false,
            errorMessage: 'Unable to validate code. Please try again.',
            invitationId: null,
        };
    }
}

/**
 * Create a new platform invitation (sys-admin only)
 * 
 * @param supabase - Supabase client with authenticated user
 * @param params - Creation parameters
 */
export async function createPlatformInvitation(
    supabase: SupabaseClient,
    params: CreateInvitationParams = {}
): Promise<CreateInvitationResult> {
    const { maxUses = 1, description = null, expiresInDays = null } = params;

    try {
        const { data, error } = await supabase.rpc('create_platform_invitation', {
            p_max_uses: maxUses,
            p_description: description,
            p_expires_in_days: expiresInDays,
        });

        if (error) {
            if (error.message.includes('system administrators')) {
                throw new InviteCreationError(
                    'Only system administrators can create invite codes.',
                    'UNAUTHORIZED'
                );
            }
            throw new InviteCreationError(error.message, 'INTERNAL_ERROR');
        }

        const result = Array.isArray(data) ? data[0] : data;

        if (!result) {
            throw new InviteCreationError(
                'Failed to create invitation.',
                'CODE_GENERATION_FAILED'
            );
        }

        return {
            id: result.id,
            code: result.code,
            maxUses: result.max_uses,
            expiresAt: result.expires_at,
        };
    } catch (err) {
        if (err instanceof InviteCreationError) {
            throw err;
        }
        console.error('[InviteCreation] Unexpected error:', err);
        throw new InviteCreationError(
            'An unexpected error occurred.',
            'INTERNAL_ERROR'
        );
    }
}

/**
 * Get invitation details by ID (for linking to profile)
 */
export async function getInvitationById(
    supabase: SupabaseClient,
    invitationId: string
): Promise<{ id: string; code: string } | null> {
    try {
        const { data, error } = await supabase
            .from('platform_invitations')
            .select('id, code')
            .eq('id', invitationId)
            .single();

        if (error || !data) {
            return null;
        }

        return data;
    } catch {
        return null;
    }
}
