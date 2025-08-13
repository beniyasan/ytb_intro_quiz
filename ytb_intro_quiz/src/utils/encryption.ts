import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { appConfig } from '../config/app';

// Encryption data structure
export interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
}

/**
 * Encryption Service using AES-256-GCM
 * Provides authenticated encryption with additional data integrity
 */
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor() {
    this.key = Buffer.from(appConfig.encryption.key, 'hex');
    
    // Validate key length (32 bytes for AES-256)
    if (this.key.length !== 32) {
      throw new Error('Encryption key must be exactly 32 bytes (64 hex characters)');
    }
  }

  /**
   * Encrypt plaintext string
   */
  encrypt(text: string): EncryptedData {
    try {
      // Generate random IV (16 bytes for AES)
      const iv = randomBytes(16);
      
      // Create cipher
      const cipher = createCipheriv(this.algorithm, this.key, iv);
      
      // Encrypt data
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get authentication tag
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt encrypted data
   */
  decrypt(data: EncryptedData): string {
    try {
      // Create decipher
      const decipher = createDecipheriv(
        this.algorithm,
        this.key,
        Buffer.from(data.iv, 'hex')
      );
      
      // Set auth tag for verification
      decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
      
      // Decrypt data
      let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Hash data using SHA-256
   */
  hash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate secure random bytes
   */
  generateRandomBytes(length: number): Buffer {
    return randomBytes(length);
  }

  /**
   * Generate secure random string
   */
  generateRandomString(length: number): string {
    return randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}

// Singleton instance
export const encryptionService = new EncryptionService();

/**
 * Utility functions for common encryption tasks
 */

// Encrypt sensitive data for storage
export function encryptForStorage(data: string): string {
  const encrypted = encryptionService.encrypt(data);
  return JSON.stringify(encrypted);
}

// Decrypt sensitive data from storage
export function decryptFromStorage(encryptedData: string): string {
  try {
    const data = JSON.parse(encryptedData) as EncryptedData;
    return encryptionService.decrypt(data);
  } catch (error) {
    throw new Error('Invalid encrypted data format');
  }
}

// Generate cryptographically secure session ID
export function generateSessionId(): string {
  return encryptionService.generateRandomString(64);
}

// Generate secure token for various purposes
export function generateSecureToken(length = 32): string {
  return encryptionService.generateRandomString(length);
}

// Hash data with salt
export function hashWithSalt(data: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || encryptionService.generateRandomString(32);
  const hash = encryptionService.hash(data + actualSalt);
  
  return { hash, salt: actualSalt };
}

// Verify hashed data
export function verifyHash(data: string, hash: string, salt: string): boolean {
  const computedHash = encryptionService.hash(data + salt);
  return encryptionService.constantTimeCompare(computedHash, hash);
}

// Generate CSRF token
export function generateCSRFToken(): string {
  return encryptionService.generateRandomString(32);
}

// Validate hex string format
export function isValidHexString(str: string, expectedLength?: number): boolean {
  const hexRegex = /^[0-9a-fA-F]+$/;
  
  if (!hexRegex.test(str)) {
    return false;
  }
  
  if (expectedLength && str.length !== expectedLength) {
    return false;
  }
  
  return true;
}