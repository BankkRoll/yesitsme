"use node";

import * as crypto from "crypto";

function getEnvOrThrow(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function deriveKey(
  masterKey: Buffer,
  salt: Buffer,
  info: string,
  length: number = 32,
): Buffer {
  const derived = crypto.hkdfSync("sha256", masterKey, salt, info, length);
  return Buffer.from(derived);
}

let cachedKeys: {
  hashKey: Buffer;
  encKey: Buffer;
} | null = null;

function getKeys() {
  if (cachedKeys) return cachedKeys;

  const masterKeyHex = getEnvOrThrow("MASTER_KEY");
  const appSaltHex = getEnvOrThrow("APP_SALT");

  const masterKey = Buffer.from(masterKeyHex, "hex");
  const appSalt = Buffer.from(appSaltHex, "hex");

  if (masterKey.length < 32) {
    throw new Error("MASTER_KEY must be at least 32 bytes (64 hex characters)");
  }

  cachedKeys = {
    hashKey: deriveKey(masterKey, appSalt, "hashing-v1", 32),
    encKey: deriveKey(masterKey, appSalt, "encryption-v1", 32),
  };

  return cachedKeys;
}

export function hashPII(value: string): string {
  const { hashKey } = getKeys();
  const hmac = crypto.createHmac("sha256", hashKey);
  hmac.update(value);
  return hmac.digest("base64url");
}

export function encrypt(plaintext: string): {
  ciphertext: string;
  nonce: string;
} {
  const { encKey } = getKeys();
  const nonce = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv("aes-256-gcm", encKey, nonce);
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([
    Buffer.from(encrypted, "base64"),
    authTag,
  ]).toString("base64");

  return {
    ciphertext: combined,
    nonce: nonce.toString("base64"),
  };
}

export function decrypt(ciphertext: string, nonce: string): string {
  const { encKey } = getKeys();

  const nonceBuffer = Buffer.from(nonce, "base64");
  const combined = Buffer.from(ciphertext, "base64");

  const authTag = combined.subarray(-16);
  const encrypted = combined.subarray(0, -16);

  const decipher = crypto.createDecipheriv("aes-256-gcm", encKey, nonceBuffer);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf8");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string): string {
  const hasPlus = phone.trim().startsWith("+");
  const digits = phone.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

export function hashEmail(email: string): string {
  return hashPII(normalizeEmail(email));
}

export function hashPhone(phone: string): string {
  return hashPII(normalizePhone(phone));
}

export const CURRENT_KEY_VERSION = 1;
