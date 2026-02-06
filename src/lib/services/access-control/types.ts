/**
 * Access Control Types for Gatekeeper System
 * 
 * Types and interfaces for platform invitation validation,
 * rate limiting, and code generation.
 */

// =====================================================
// Database Types
// =====================================================

export type InvitationStatus = 'active' | 'exhausted' | 'expired' | 'revoked';

export interface PlatformInvitation {
    id: string;
    code: string;
    description: string | null;
    max_uses: number;
    uses_count: number;
    expires_at: string | null;
    status: InvitationStatus;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface InviteValidationAttempt {
    id: string;
    ip_address: string;
    attempted_code: string | null;
    attempted_at: string;
    was_successful: boolean;
}

// =====================================================
// Service Types
// =====================================================

export interface ValidateInviteCodeResult {
    isValid: boolean;
    errorMessage: string | null;
    invitationId: string | null;
}

export interface CreateInvitationResult {
    id: string;
    code: string;
    maxUses: number;
    expiresAt: string | null;
}

export interface CreateInvitationParams {
    maxUses?: number;
    description?: string | null;
    expiresInDays?: number | null;
}

// =====================================================
// API Types
// =====================================================

export interface ValidateInviteCodeRequest {
    code: string;
}

export interface ValidateInviteCodeResponse {
    valid: boolean;
    error?: string;
    invitationId?: string;
}

export interface CreateInvitationRequest {
    maxUses?: number;
    description?: string;
    expiresInDays?: number;
}

export interface CreateInvitationResponse {
    success: boolean;
    invitation?: {
        id: string;
        code: string;
        maxUses: number;
        expiresAt: string | null;
    };
    error?: string;
}

// =====================================================
// Error Types
// =====================================================

export class InviteValidationError extends Error {
    public readonly code:
        | 'INVALID_CODE'
        | 'EXPIRED_CODE'
        | 'EXHAUSTED_CODE'
        | 'RATE_LIMITED'
        | 'INTERNAL_ERROR';

    constructor(message: string, code: InviteValidationError['code']) {
        super(message);
        this.name = 'InviteValidationError';
        this.code = code;
    }
}

export class InviteCreationError extends Error {
    public readonly code:
        | 'UNAUTHORIZED'
        | 'CODE_GENERATION_FAILED'
        | 'INTERNAL_ERROR';

    constructor(message: string, code: InviteCreationError['code']) {
        super(message);
        this.name = 'InviteCreationError';
        this.code = code;
    }
}
