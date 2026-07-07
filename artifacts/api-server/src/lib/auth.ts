import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Request, Response, NextFunction } from "express";
import { db, usersTable, tenantsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Legacy fallback for SHA-256 passwords during migration to bcrypt */
export async function verifyPasswordLegacy(password: string, hash: string): Promise<boolean> {
  if (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")) {
    return bcrypt.compare(password, hash);
  }
  const legacyHash = crypto.createHash("sha256").update(password + "edusaas_salt").digest("hex");
  return legacyHash === hash;
}

export function generateToken(userId: number, tenantId: number): string {
  const payload = JSON.stringify({ userId, tenantId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  return Buffer.from(payload).toString("base64");
}

export function verifyToken(token: string): { userId: number; tenantId: number; guardianId?: number } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, "base64").toString("utf8"));
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
