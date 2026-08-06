import { Router } from "express";
import { db, usersTable, tenantsTable } from "@workspace/db";
import { eq, and } from "@workspace/db";
import { LoginBody, RegisterTenantBody } from "@workspace/api-zod";
import { hashPassword, verifyPasswordLegacy, generateToken, requireAuth } from "../lib/auth";
import slugify from "../lib/slugify";

const router = Router();

router.post("/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;
  const [user] = await db
    .select({ user: usersTable, tenant: tenantsTable })
    .from(usersTable)
    .innerJoin(tenantsTable, eq(usersTable.tenantId, tenantsTable.id))
    .where(eq(usersTable.email, email));
  if (!user || !(await verifyPasswordLegacy(password, user.user.passwordHash))) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = generateToken(user.user.id, user.user.tenantId);
  const { passwordHash: _, ...safeUser } = user.user;
  res.json({
    token,
    user: {
      ...safeUser,
      createdAt: safeUser.createdAt.toISOString(),
      updatedAt: safeUser.updatedAt.toISOString(),
      tenant: {
        ...user.tenant,
        createdAt: user.tenant.createdAt.toISOString(),
        updatedAt: user.tenant.updatedAt.toISOString(),
      },
    },
  });
});

router.post("/register", async (req, res) => {
  const parsed = RegisterTenantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }
  const { institutionName, adminName, email, password, plan } = parsed.data;
  const slug = slugify(institutionName) + "-" + Date.now().toString(36);
  const [tenant] = await db.insert(tenantsTable).values({
    name: institutionName,
    slug,
    plan: (plan as any) ?? "free",
    educationalLevels: ["fundamental", "medio"],
  }).returning();
  const [user] = await db.insert(usersTable).values({
    tenantId: tenant.id,
    name: adminName,
    email,
    passwordHash: await hashPassword(password),
    role: "admin",
  }).returning();
  const token = generateToken(user.id, tenant.id);
  const { passwordHash: _, ...safeUser } = user;
  res.status(201).json({
    token,
    user: {
      ...safeUser,
      createdAt: safeUser.createdAt.toISOString(),
      updatedAt: safeUser.updatedAt.toISOString(),
      tenant: {
        ...tenant,
        createdAt: tenant.createdAt.toISOString(),
        updatedAt: tenant.updatedAt.toISOString(),
      },
    },
  });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const tenant = (req as any).tenant;
  const { passwordHash: _, ...safeUser } = user;
  res.json({
    ...safeUser,
    createdAt: safeUser.createdAt.toISOString(),
    updatedAt: safeUser.updatedAt.toISOString(),
    tenant: {
      ...tenant,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
    },
  });
});

router.post("/logout", (_req, res) => {
  res.json({ success: true, message: "Logged out" });
});

export default router;
