import type { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyOptions } from "jose";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let jwksUrl: string | null = null;

function getJwks() {
  const url = process.env.JWT_JWKS_URL;

  if (!url) {
    throw new Error("JWT_JWKS_URL is missing from environment variables.");
  }

  if (!jwks || jwksUrl !== url) {
    jwks = createRemoteJWKSet(new URL(url));
    jwksUrl = url;
  }

  return jwks;
}

export async function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Authentication token is required.",
      });
      return;
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Authentication token is required.",
      });
      return;
    }

    const options: JWTVerifyOptions = {};

    if (process.env.JWT_ISSUER) {
      options.issuer = process.env.JWT_ISSUER;
    }

    if (process.env.JWT_AUDIENCE) {
      options.audience = process.env.JWT_AUDIENCE;
    }

    const { payload } = await jwtVerify(token, getJwks(), options);

    const id = payload.sub;
    const name = payload.name;
    const email = payload.email;

    if (
      typeof id !== "string" ||
      typeof name !== "string" ||
      typeof email !== "string"
    ) {
      res.status(401).json({
        success: false,
        message: "Token does not contain valid user information.",
      });
      return;
    }

    req.user = { id, name, email };

    next();
    } catch (error) {
    console.error("JWT Verification Error:", error);

    res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
  }
}

// Optional authentication
// Public requests are allowed without a token.
// If a token is provided, it must be valid.

export async function optionalVerifyToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authorization = req.headers.authorization;

  if (!authorization) {
    next();
    return;
  }

  await verifyToken(req, res, next);
}