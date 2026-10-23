import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "flyers_admin";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

// The token is "<expiresAt>.<hmac>". The HMAC key is the admin password,
// so changing the password invalidates every existing session.
function sign(expiresAt: number): string {
  return createHmac("sha256", requireEnv("ADMIN_PASSWORD"))
    .update(`admin:${expiresAt}`)
    .digest("hex");
}

export function passwordMatches(input: string): boolean {
  const expected = Buffer.from(requireEnv("ADMIN_PASSWORD"));
  const given = Buffer.from(input);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function startAdminSession() {
  const expiresAt = Date.now() + SESSION_SECONDS * 1000;
  (await cookies()).set({
    name: COOKIE_NAME,
    value: `${expiresAt}.${sign(expiresAt)}`,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function endAdminSession() {
  (await cookies()).delete(COOKIE_NAME);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return false;

  const [expiresRaw, signature] = token.split(".");
  const expiresAt = Number(expiresRaw);
  if (!signature || !Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    return false;
  }

  const expected = Buffer.from(sign(expiresAt));
  const given = Buffer.from(signature);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
