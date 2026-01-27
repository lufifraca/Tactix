import jwt from "jsonwebtoken";
import { env } from "../env";

export type SessionToken = {
  sub: string; // userId
  iat: number;
  exp: number;
};

export function signSessionToken(userId: string, days: number = 30): string {
  const exp = Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;
  return jwt.sign({ sub: userId, exp }, env.JWT_SECRET);
}

export function verifySessionToken(token: string): SessionToken | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    if (!decoded?.sub) return null;
    return decoded as SessionToken;
  } catch {
    return null;
  }
}

/**
 * Short-lived signed state token used for OAuth/OpenID redirects.
 */
export function signState(payload: Record<string, any>, minutes: number = 10): string {
  const exp = Math.floor(Date.now() / 1000) + minutes * 60;
  return jwt.sign({ ...payload, exp }, env.JWT_SECRET);
}

export function verifyState(token: string): Record<string, any> | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as any;
  } catch {
    return null;
  }
}
