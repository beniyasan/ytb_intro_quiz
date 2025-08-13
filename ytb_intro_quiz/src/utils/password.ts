import bcrypt from 'bcrypt';
import { z } from 'zod';
import { appConfig } from '../config/app';
import { PasswordValidationResult } from '../types/auth';
import { WeakPasswordException } from '../types/errors';

/**
 * Password validation schema based on security requirements
 */
const passwordSchema = z.string()
  .min(appConfig.password.minLength, `Password must be at least ${appConfig.password.minLength} characters long`)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
  .max(128, 'Password must not exceed 128 characters');

/**
 * Password Service for secure password handling
 */
export class PasswordService {
  private readonly saltRounds = appConfig.password.bcryptRounds;

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    // Validate password first
    this.validatePassword(password);

    try {
      return await bcrypt.hash(password, this.saltRounds);
    } catch (error) {
      throw new Error(`Password hashing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }

    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      // Log error but don't expose internal details
      throw new Error('Password verification failed');
    }
  }

  /**
   * Validate password against security requirements
   */
  validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];

    try {
      passwordSchema.parse(password);
      return { isValid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        for (const issue of error.issues) {
          errors.push(issue.message);
        }
      } else {
        errors.push('Password validation failed');
      }

      return { isValid: false, errors };
    }
  }

  /**
   * Throw exception if password is invalid
   */
  validatePasswordOrThrow(password: string): void {
    const validation = this.validatePassword(password);
    if (!validation.isValid) {
      throw new WeakPasswordException(validation.errors);
    }
  }

  /**
   * Check password strength score (0-5)
   * 0: Very weak, 1: Weak, 2: Fair, 3: Good, 4: Strong, 5: Very strong
   */
  checkPasswordStrength(password: string): {
    score: number;
    feedback: string[];
  } {
    let score = 0;
    const feedback: string[] = [];

    // Length check
    if (password.length >= 8) score++;
    else feedback.push('Use at least 8 characters');

    if (password.length >= 12) score++;
    else if (password.length >= 8) feedback.push('Consider using more characters for better security');

    // Character variety
    if (/[a-z]/.test(password)) score++;
    else feedback.push('Add lowercase letters');

    if (/[A-Z]/.test(password)) score++;
    else feedback.push('Add uppercase letters');

    if (/[0-9]/.test(password)) score++;
    else feedback.push('Add numbers');

    if (/[^A-Za-z0-9]/.test(password)) score++;
    else feedback.push('Add special characters');

    // Advanced checks
    if (password.length >= 16 && score >= 4) {
      score = Math.min(score + 1, 5);
    }

    // Common patterns that reduce security
    if (/(.)\1{2,}/.test(password)) {
      feedback.push('Avoid repeated characters');
      score = Math.max(score - 1, 0);
    }

    if (/123|abc|qwe/i.test(password)) {
      feedback.push('Avoid common sequences');
      score = Math.max(score - 1, 0);
    }

    return { score, feedback };
  }

  /**
   * Generate secure random password
   */
  generateSecurePassword(length = 16): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + special;
    
    let password = '';
    
    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    // Fill remaining length
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle password to avoid predictable pattern
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Check if password has been used recently (for password history)
   */
  async checkPasswordHistory(
    newPassword: string,
    passwordHistory: string[]
  ): Promise<boolean> {
    for (const oldHash of passwordHistory) {
      if (await this.verifyPassword(newPassword, oldHash)) {
        return true; // Password found in history
      }
    }
    return false; // Password not in history
  }

  /**
   * Get password requirements as human-readable text
   */
  getPasswordRequirements(): string[] {
    return [
      `At least ${appConfig.password.minLength} characters long`,
      'At least one uppercase letter (A-Z)',
      'At least one lowercase letter (a-z)',
      'At least one number (0-9)',
      'At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)',
      'Maximum 128 characters'
    ];
  }

  /**
   * Estimate password crack time
   */
  estimateCrackTime(password: string): string {
    const charsets = {
      lowercase: 26,
      uppercase: 26,
      numbers: 10,
      special: 32
    };

    let charsetSize = 0;
    if (/[a-z]/.test(password)) charsetSize += charsets.lowercase;
    if (/[A-Z]/.test(password)) charsetSize += charsets.uppercase;
    if (/[0-9]/.test(password)) charsetSize += charsets.numbers;
    if (/[^A-Za-z0-9]/.test(password)) charsetSize += charsets.special;

    // Total possible combinations
    const totalCombinations = Math.pow(charsetSize, password.length);
    
    // Assuming 1 billion guesses per second (modern GPU)
    const guessesPerSecond = 1e9;
    const secondsToCrack = totalCombinations / (2 * guessesPerSecond);

    if (secondsToCrack < 60) return 'Less than 1 minute';
    if (secondsToCrack < 3600) return `${Math.ceil(secondsToCrack / 60)} minutes`;
    if (secondsToCrack < 86400) return `${Math.ceil(secondsToCrack / 3600)} hours`;
    if (secondsToCrack < 31536000) return `${Math.ceil(secondsToCrack / 86400)} days`;
    if (secondsToCrack < 3153600000) return `${Math.ceil(secondsToCrack / 31536000)} years`;
    
    return 'Centuries';
  }
}

// Singleton instance
export const passwordService = new PasswordService();

// Export commonly used functions
export const hashPassword = (password: string) => passwordService.hashPassword(password);
export const verifyPassword = (password: string, hash: string) => passwordService.verifyPassword(password, hash);
export const validatePassword = (password: string) => passwordService.validatePassword(password);
export const checkPasswordStrength = (password: string) => passwordService.checkPasswordStrength(password);