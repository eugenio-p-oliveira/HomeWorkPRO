import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { db, usersTable, tenantsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "edusaas_salt").digest("hex");
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
