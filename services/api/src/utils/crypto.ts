import crypto from "crypto";
import { env } from "../env";

/**
 * AES-256-GCM string encryption for storing sensitive user-supplied tokens/codes.
 * - Deterministic encryption is NOT used (we use random IV) to avoid leaking equality.
 * - The quest/scoring system remains deterministic because it never depends on encryption output.
 */
const KEY = crypto.createHash("sha256").update(env.JWT_SECRET).digest(); // 32 bytes

export function encryptString(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64url");
}

export function decryptString(ciphertextB64Url: string): string {
  const buf = Buffer.from(ciphertextB64Url, "base64url");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

export function sha256Hex(data: string | Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}
