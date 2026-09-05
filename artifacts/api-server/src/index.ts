import app from "./app";
import { logger } from "./lib/logger";
import { autoSeedIfEmpty } from "./seed";
import { startDatabaseBackupScheduler } from "./lib/database-backup";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start() {
  if (process.env.NODE_ENV === "production") {
    // A production process is not allowed to start until a verified backup
    // exists. This makes backup failures visible to deployment monitoring.
    await startDatabaseBackupScheduler();
  } else {
    try {
      await autoSeedIfEmpty();
    } catch (err) {
      logger.error({ err }, "Auto-seed failed, continuing startup");
    }
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

start().catch((err) => {
  logger.fatal({ err }, "Production startup checks failed");
  process.exit(1);
});
