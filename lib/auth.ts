/**
 * Tiny HMAC-signed cookie auth. One passcode, one cookie.
 * Web Crypto only — works in Edge middleware.
 */

const COOKIE_NAME = "tra_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  const secret = process.env.AUTH_COOKIE_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_COOKIE_SECRET must be at least 16 characters.");
  }
  return secret;
}

function getPasscode(): string {
  const code = process.env.DEMO_PASSCODE;
  if (!code) throw new Error("DEMO_PASSCODE is not set.");
  return code;
}

const enc = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return toBase64Url(new Uint8Array(sig));
}

export async function signSession(): Promise<string> {
  const issuedAt = Date.now();
  const payload = `v1.${issuedAt}`;
  const sig = await hmac(payload);
  return `${payload}.${sig}`;
}

export async function verifySession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const version = parts[0];
  const issuedAtStr = parts[1];
  const providedSig = parts[2];
  if (!version || !issuedAtStr || !providedSig) return false;
  if (version !== "v1") return false;
  const issuedAt = Number(issuedAtStr);
  if (!Number.isFinite(issuedAt)) return false;
  const age = Date.now() - issuedAt;
  if (age < 0 || age > COOKIE_MAX_AGE * 1000) return false;

  // If AUTH_COOKIE_SECRET is missing (env not configured yet), treat the session
  // as invalid rather than throwing — the user gets redirected to /login,
  // which surfaces the misconfiguration via the login attempt.
  let expectedSig: string;
  try {
    expectedSig = await hmac(`${version}.${issuedAtStr}`);
  } catch {
    return false;
  }
  // Constant-time comparison
  if (expectedSig.length !== providedSig.length) return false;
  let diff = 0;
  for (let i = 0; i < expectedSig.length; i++) {
    diff |= expectedSig.charCodeAt(i) ^ providedSig.charCodeAt(i);
  }
  return diff === 0;
}

export function passcodeMatches(input: string): boolean {
  const expected = getPasscode();
  if (input.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ input.charCodeAt(i);
  }
  return diff === 0;
}

export const sessionCookieName = COOKIE_NAME;
export const sessionCookieMaxAge = COOKIE_MAX_AGE;
