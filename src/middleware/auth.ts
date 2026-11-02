import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { config } from "../config.js";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// BetterAuth's JWT plugin signs tokens with a private key and publishes the public keys at /api/auth/jwks.
// jose fetches and caches them, so this server never needs the signing secret.
const jwks = createRemoteJWKSet(new URL(config.jwksUrl));

function readBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = readBearerToken(req);
  if (!token) {
    res.status(401).json({ message: "Please log in to continue" });
    return;
  }

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: config.authBaseUrl,
      audience: config.authBaseUrl,
    });

    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    if (!email) {
      res.status(401).json({ message: "Your session is missing an email address. Please log in again" });
      return;
    }

    req.user = {
      id: String(payload.id ?? payload.sub ?? ""),
      email,
      name: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : email.split("@")[0],
    };
    next();
  } catch (error) {
    const expired = typeof error === "object" && error !== null && (error as { code?: string }).code === "ERR_JWT_EXPIRED";
    res.status(401).json({
      message: expired ? "Your session has expired. Please log in again" : "Your session is not valid. Please log in again",
    });
  }
}
