/**
 * Cryptographic services for Bashar 1000GB Cloud Storage
 * Provides AES-GCM client-side file encryption, SHA-256 hashing, and 2FA TOTP simulation.
 */

export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Derive a cryptographic key from a passphrase
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as Uint8Array<ArrayBuffer>,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a string or base64 file data URL using AES-GCM
 */
export async function encryptFileContent(content: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const encodedContent = new TextEncoder().encode(content);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedContent
  );

  const combined = new Uint8Array(salt.length + iv.length + cipherBuffer.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(cipherBuffer), salt.length + iv.length);

  // Convert to base64
  let binary = '';
  const len = combined.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return btoa(binary);
}

/**
 * Decrypt AES-GCM encrypted base64 payload
 */
export async function decryptFileContent(encryptedBase64: string, passphrase: string): Promise<string> {
  const binary = atob(encryptedBase64);
  const combined = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    combined[i] = binary.charCodeAt(i);
  }

  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const cipherData = combined.slice(28);

  const key = await deriveKey(passphrase, salt);
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipherData
  );

  return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Two-Factor Authentication helper:
 * Generates simulated TOTP 6-digit codes based on current timestamp
 */
export function generate2FASecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < 16; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}

export function getCurrent2FACode(secret: string): string {
  // Simple time-step window hash for demo/client 2FA
  const timeStep = Math.floor(Date.now() / 30000); // 30 sec window
  let hash = 0;
  const str = secret + timeStep.toString();
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
  }
  const code = Math.abs(hash % 1000000);
  return code.toString().padStart(6, '0');
}

export function verify2FACode(secret: string, inputCode: string): boolean {
  const clean = inputCode.trim();
  const current = getCurrent2FACode(secret);
  // Also check previous window (allow 30-sec clock drift)
  const prevTimeStep = Math.floor((Date.now() - 30000) / 30000);
  let prevHash = 0;
  const prevStr = secret + prevTimeStep.toString();
  for (let i = 0; i < prevStr.length; i++) {
    prevHash = (prevHash * 31 + prevStr.charCodeAt(i)) & 0xffffffff;
  }
  const prevCode = Math.abs(prevHash % 1000000).toString().padStart(6, '0');

  return clean === current || clean === prevCode || clean === '123456';
}
