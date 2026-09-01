/**
 * Task 4: Password hashing via WebCrypto PBKDF2
 *
 * Bug #5 fix: bcrypt/Argon2 use native C extensions that crash in Workers V8 isolates.
 * WebCrypto PBKDF2 is available natively in all Workers + browser runtimes.
 *
 * Format: "pbkdf2:sha256:<iterations>:<salt_hex>:<hash_hex>"
 */

const ITERATIONS = 100_000; // Cloudflare Workers caps PBKDF2 at 100k; verify reads count from the stored hash
const KEY_LENGTH = 32;      // 256-bit output

function arrayToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToArray(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Hash a plaintext password.
 * Returns a self-describing string safe to store in the DB.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
    key,
    KEY_LENGTH * 8
  );
  return `pbkdf2:sha256:${ITERATIONS}:${arrayToHex(salt.buffer as ArrayBuffer)}:${arrayToHex(bits)}`;
}

/**
 * Verify a plaintext password against a stored hash string.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(':');
  if (parts.length !== 5 || parts[0] !== 'pbkdf2' || parts[1] !== 'sha256') return false;

  const iterations = parseInt(parts[2], 10);
  const salt = hexToArray(parts[3]);
  const expectedHash = parts[4];

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    KEY_LENGTH * 8
  );

  const actualHash = arrayToHex(bits);

  // Constant-time comparison to prevent timing attacks
  if (actualHash.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < actualHash.length; i++) {
    diff |= actualHash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  }
  return diff === 0;
}
