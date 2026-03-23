/**
 * Token encryption/decryption utility
 * Uses AES-256-GCM for authenticated encryption
 */

import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';

// Validate encryption key is configured
if (!ENCRYPTION_KEY) {
  console.warn('[SECURITY] ENCRYPTION_KEY not configured - tokens will be stored unencrypted. Set ENCRYPTION_KEY env var for production.');
}

interface EncryptedData {
  encrypted: string; // base64 encoded
  iv: string; // base64 encoded
  authTag: string; // base64 encoded
}

/**
 * Encrypt sensitive data (like OAuth tokens)
 * Returns encrypted data in base64 format for database storage
 */
export function encryptToken(token: string): string {
  if (!ENCRYPTION_KEY) {
    console.warn('[SECURITY] ENCRYPTION_KEY not set - returning unencrypted token');
    return token;
  }

  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    const encryptedData: EncryptedData = {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };

    // Return as JSON string encoded in base64
    return Buffer.from(JSON.stringify(encryptedData)).toString('base64');
  } catch (error) {
    console.error('Token encryption failed:', error);
    throw new Error('Failed to encrypt token');
  }
}

/**
 * Decrypt token from base64 encrypted format
 */
export function decryptToken(encryptedString: string): string {
  if (!ENCRYPTION_KEY) {
    console.warn('[SECURITY] ENCRYPTION_KEY not set - token is unencrypted');
    return encryptedString;
  }

  try {
    // Decode base64
    const encryptedData: EncryptedData = JSON.parse(
      Buffer.from(encryptedString, 'base64').toString('utf8')
    );

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      Buffer.from(encryptedData.iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Token decryption failed:', error);
    throw new Error('Failed to decrypt token');
  }
}

/**
 * Generate a secure encryption key
 * Run this once to generate a key: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
