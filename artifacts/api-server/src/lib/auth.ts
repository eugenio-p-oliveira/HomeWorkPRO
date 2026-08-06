import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Request, Response, NextFunction } from "express";
import { db, usersTable, tenantsTable } from "@workspace/db";
import { eq, and } from "@workspace/db";

const SALT_ROUNDS = 12;
const TOKEN_SECRET = process.env.SESSION_SECRET;

function getTokenSecret(): string {
  if (!TOKEN_SECRET) {
    throw new Error("SESSION_SECRET is required for token signing");
  }
  return TOKEN_SECRET;
}

function signTokenPayload(payload: Record<string, unknown>): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getTokenSecret())
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export async function hashPassword(password: string): Promise<string> {
  const normalized = password.trim();
  return bcrypt.hash(normalized, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password.trim(), hash);
}

/** Legacy fallback for SHA-256 passwords during migration to bcrypt */
export async function verifyPasswordLegacy(password: string, hash: string): Promise<boolean> {
  if (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")) {
    return bcrypt.compare(password.trim(), hash);
  }
  const legacyHash = crypto.createHash("sha256").update(password.trim() + "edusaas_salt").digest("hex");
  return legacyHash === hash;
}

export function generateToken(userId: number, tenantId: number): string {
  return signTokenPayload({ userId, tenantId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
}

export function generateGuardianToken(guardianId: number, tenantId: number): string {
  return signTokenPayload({ guardianId, tenantId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
}

export function verifyToken(token: string): { userId: number; tenantId: number; guardianId?: number } | null {
  try {
    const [encodedPayload, providedSignature] = token.split(".");
    if (!encodedPayload || !providedSignature) return null;
    const expectedSignature = crypto
      .createHmac("sha256", getTokenSecret())
      .update(encodedPayload)
      .digest("base64url");
    const expected = Buffer.from(expectedSignature);
    const provided = Buffer.from(providedSignature);
    if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) return null;
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    if (payload.exp < Date.now()) return null;
    return { userId: payload.userId, tenantId: payload.tenantId, guardianId: payload.guardianId };
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  const [user] = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.id, decoded.userId), eq(usersTable.tenantId, decoded.tenantId)));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, decoded.tenantId));
  if (!tenant) {
    res.status(401).json({ error: "Tenant not found" });
    return;
  }
  (req as any).user = user;
  (req as any).tenant = tenant;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
