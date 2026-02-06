/**
 * Invite Code Generator
 * 
 * Generates short, user-friendly alphanumeric invite codes
 * in the format: BEE-XXXXXX
 */

// Characters to use (avoiding confusing ones: I, O, 0, 1, L)
const SAFE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_PREFIX = 'BEE';
const CODE_LENGTH = 6;

/**
 * Generate a cryptographically random invite code
 * Format: BEE-XXXXXX (e.g., BEE-X7K9M2)
 */
export function generateInviteCode(): string {
    const randomPart = Array.from(
        { length: CODE_LENGTH },
        () => SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)]
    ).join('');

    return `${CODE_PREFIX}-${randomPart}`;
}

/**
 * Normalize an invite code for comparison
 * - Trims whitespace
 * - Converts to uppercase
 * - Ensures consistent format
 */
export function normalizeInviteCode(code: string): string {
    return code.trim().toUpperCase();
}

/**
 * Validate invite code format (client-side validation only)
 * Does NOT check if the code exists or is valid in the database
 */
export function isValidCodeFormat(code: string): boolean {
    const normalized = normalizeInviteCode(code);
    // Format: BEE-XXXXXX where X is alphanumeric
    const pattern = /^BEE-[A-Z0-9]{6}$/;
    return pattern.test(normalized);
}

/**
 * Mask an invite code for logging/display
 * Shows only first 4 characters: BEE-**** 
 */
export function maskInviteCode(code: string): string {
    const normalized = normalizeInviteCode(code);
    if (normalized.length < 4) {
        return '****';
    }
    return normalized.substring(0, 4) + '****';
}
