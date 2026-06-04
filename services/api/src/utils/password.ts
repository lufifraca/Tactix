import crypto from "crypto";

/**
 * Password hashing for email/password accounts.
 *
 * Uses Node's built-in scrypt (memory-hard KDF) so we don't pull in a native
 * dependency like bcrypt/argon2. Stored format is self-describing:
 *
 *   scrypt$<N>$<saltB64url>$<hashB64url>
 *
 * The cost parameter N is encoded so hashes stay verifiable if we tune it later.
 */

const SCHEME = "scrypt";
const N = 16384; // CPU/memory cost (2^14)
const KEYLEN = 64;
const SALT_BYTES = 16;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_BYTES);
  const derived = crypto.scryptSync(password, salt, KEYLEN, { N });
  return [SCHEME, N, salt.toString("base64url"), derived.toString("base64url")].join("$");
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== SCHEME) return false;

  const cost = Number(parts[1]);
  if (!Number.isFinite(cost) || cost < 2) return false;

  const salt = Buffer.from(parts[2], "base64url");
  const expected = Buffer.from(parts[3], "base64url");
  if (expected.length === 0) return false;

  let derived: Buffer;
  try {
    derived = crypto.scryptSync(password, salt, expected.length, { N: cost });
  } catch {
    return false;
  }

  // Constant-time comparison (lengths already match by construction).
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}
