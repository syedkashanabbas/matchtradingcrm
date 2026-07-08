import crypto from 'crypto';

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits

// Derive encryption key from password using PBKDF2
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha256');
}

// Get encryption key from environment or use a default for development
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    // For development only - in production, always set ENCRYPTION_KEY
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY environment variable is required in production');
    }
    return Buffer.from('development-encryption-key-32-chars!', 'utf8').slice(0, KEY_LENGTH);
  }
  
  return Buffer.from(key, 'utf8').slice(0, KEY_LENGTH);
}

// Encrypt data using AES-256-GCM
export function encryptData(data: string): string {
  try {
    const plaintext = Buffer.from(data, 'utf8');
    const key = getEncryptionKey();
    
    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Derive key from password and salt
    const derivedKey = deriveKey(key.toString('utf8'), salt);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, derivedKey, iv);
    cipher.setAAD(salt); // Use salt as additional authenticated data
    
    // Encrypt data
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    
    // Get authentication tag
    const tag = cipher.getAuthTag();
    
    // Combine all components: salt + iv + tag + encrypted
    const combined = Buffer.concat([salt, iv, tag, encrypted]);
    
    // Return as base64 string
    return combined.toString('base64');
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

// Decrypt data using AES-256-GCM
export function decryptData(encryptedData: string): string {
  try {
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract components
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    
    // Derive key from password and salt
    const key = getEncryptionKey();
    const derivedKey = deriveKey(key.toString('utf8'), salt);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, derivedKey, iv);
    decipher.setAAD(salt); // Use salt as additional authenticated data
    decipher.setAuthTag(tag);
    
    // Decrypt data
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

// Hash sensitive data (for API keys, passwords, etc.)
export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Verify data hash
export function verifyHash(data: string, hash: string): boolean {
  const computedHash = hashData(data);
  return computedHash === hash;
}

// Generate secure random token
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

// Generate API key with prefix
export function generateApiKey(): { key: string; prefix: string } {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  const prefix = randomBytes.substring(0, 8).toUpperCase();
  const key = `mt_${prefix}_${randomBytes}`;
  
  return { key, prefix };
}

// Generate device fingerprint
export function generateDeviceFingerprint(deviceInfo: {
  accountLogin: string;
  brokerServer: string;
  computerName: string;
  eaVersion: string;
}): string {
  const fingerprintData = {
    accountLogin: deviceInfo.accountLogin,
    brokerServer: deviceInfo.brokerServer,
    computerName: deviceInfo.computerName,
    eaVersion: deviceInfo.eaVersion,
  };
  
  const fingerprintString = JSON.stringify(fingerprintData, Object.keys(fingerprintData).sort());
  return crypto.createHash('sha256').update(fingerprintString).digest('hex');
}

// Compare two device fingerprints (allowing for some variations)
export function compareDeviceFingerprints(fp1: string, fp2: string, threshold: number = 0.9): boolean {
  if (fp1 === fp2) return true;
  
  // Simple similarity check - in production, you might use more sophisticated algorithms
  const similarity = calculateStringSimilarity(fp1, fp2);
  return similarity >= threshold;
}

// Calculate string similarity (Levenshtein distance)
function calculateStringSimilarity(str1: string, str2: string): number {
  const matrix = [];
  const len1 = str1.length;
  const len2 = str2.length;
  
  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const distance = matrix[len2][len1];
  const maxLength = Math.max(len1, len2);
  return maxLength > 0 ? (maxLength - distance) / maxLength : 1;
}

// Secure comparison to prevent timing attacks
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}
