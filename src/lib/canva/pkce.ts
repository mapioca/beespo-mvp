// PKCE (Proof Key for Code Exchange) utilities for Canva OAuth

import { randomBytes, createHash } from 'crypto';

/**
 * Generate a cryptographically random code verifier
 * Must be between 43-128 characters, using A-Z, a-z, 0-9, and -._~
 */
export function generateCodeVerifier(): string {
  // Generate 32 random bytes and convert to base64url
  const buffer = randomBytes(32);
  return base64UrlEncode(buffer);
}

/**
 * Generate the code challenge from the code verifier using S256 method
 */
export function generateCodeChallenge(codeVerifier: string): string {
  const hash = createHash('sha256').update(codeVerifier).digest();
  return base64UrlEncode(hash);
}

/**
 * Base64 URL encode without padding
 */
function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate a random state parameter for OAuth
 */
export function generateState(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Generate PKCE parameters for Canva OAuth
 */
export function generatePKCE() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();

  return {
    codeVerifier,
    codeChallenge,
    state,
  };
}
