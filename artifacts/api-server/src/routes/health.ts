import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { getDatabaseBackupHealth } from "../lib/database-backup";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const backupHealth = getDatabaseBackupHealth();
  const data = HealthCheckResponse.parse({
    status: backupHealth.healthy ? "ok" : "degraded",
  });
  res.json(data);
});

export default router;
