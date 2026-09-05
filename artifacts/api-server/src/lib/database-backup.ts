import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { sqliteDatabasePath } from "@workspace/db";
import { logger } from "./logger";

const DAY_MS = 24 * 60 * 60 * 1000;
const BACKUP_FILE_PATTERN = /^edusaas-\d{8}T\d{6}\.\d{3}Z-\d+-\d+\.sqlite$/;

type BackupState = {
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastBackupPath: string | null;
  lastRestoreCheckAt: string | null;
};

export type DatabaseBackupConfig = {
  directory: string;
  retentionDays: number;
  intervalHours: number;
};

export type DatabaseBackupResult = {
  backupPath: string;
  restoreCheckedAt: string;
  retainedBackups: number;
};

const backupState: BackupState = {
  lastSuccessAt: null,
  lastFailureAt: null,
  lastBackupPath: null,
  lastRestoreCheckAt: null,
};

function positiveInteger(value: string | undefined, fallback: number, label: string): number {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer, received "${value}".`);
  }
  return parsed;
}

export function getDatabaseBackupConfig(): DatabaseBackupConfig {
  return {
    directory: path.resolve(
      process.env.EDUSAAS_SQLITE_BACKUP_DIR?.trim() ||
        path.join(path.dirname(sqliteDatabasePath), "backups"),
    ),
    retentionDays: positiveInteger(
      process.env.EDUSAAS_SQLITE_BACKUP_RETENTION_DAYS,
      14,
      "EDUSAAS_SQLITE_BACKUP_RETENTION_DAYS",
    ),
    intervalHours: positiveInteger(
      process.env.EDUSAAS_SQLITE_BACKUP_INTERVAL_HOURS,
      6,
      "EDUSAAS_SQLITE_BACKUP_INTERVAL_HOURS",
    ),
  };
}

function checkIntegrity(database: Database.Database, label: string): void {
  const integrity = database
    .prepare("PRAGMA integrity_check")
    .get() as { integrity_check?: string };
  if (integrity.integrity_check !== "ok") {
    throw new Error(`${label} failed SQLite integrity_check: ${integrity.integrity_check ?? "unknown result"}.`);
  }

  const foreignKeyViolations = database.prepare("PRAGMA foreign_key_check").all();
  if (foreignKeyViolations.length > 0) {
    throw new Error(
      `${label} failed SQLite foreign_key_check with ${foreignKeyViolations.length} violation(s).`,
    );
  }
}

function backupFileName(now: Date): string {
  const timestamp = now.toISOString().replace(/:/g, "").replace(/-/g, "");
  return `edusaas-${timestamp}-${process.pid}-${Date.now()}.sqlite`;
}

async function removeIfPresent(filePath: string): Promise<void> {
  await fs.rm(filePath, { force: true });
}

/**
 * Restores a backup into a new destination without overwriting an existing
 * file, then validates the restored copy. The destination is intentionally
 * separate from the live database so every scheduled backup exercises the
 * restore path.
 */
export async function restoreDatabaseBackup(
  backupPath: string,
  destinationPath: string,
): Promise<void> {
  const absoluteBackupPath = path.resolve(backupPath);
  const absoluteDestinationPath = path.resolve(destinationPath);
  if (!existsSync(absoluteBackupPath)) {
    throw new Error(`Backup file was not found at "${absoluteBackupPath}".`);
  }
  if (existsSync(absoluteDestinationPath)) {
    throw new Error(
      `Restore destination "${absoluteDestinationPath}" already exists; refusing to overwrite it.`,
    );
  }

  await fs.mkdir(path.dirname(absoluteDestinationPath), { recursive: true });
  const source = new Database(absoluteBackupPath, {
    readonly: true,
    fileMustExist: true,
  });
  try {
    await source.backup(absoluteDestinationPath);
  } catch (error) {
    await removeIfPresent(absoluteDestinationPath);
    throw error;
  } finally {
    source.close();
  }

  try {
    const restored = new Database(absoluteDestinationPath, {
      readonly: true,
      fileMustExist: true,
    });
    try {
      checkIntegrity(restored, "Restored database");
    } finally {
      restored.close();
    }
  } catch (error) {
    await removeIfPresent(absoluteDestinationPath);
    throw error;
  }
}

async function verifyRestoration(backupPath: string, directory: string): Promise<string> {
  const restorePath = path.join(
    directory,
    `.edusaas-restore-${process.pid}-${Date.now()}.sqlite`,
  );
  try {
    await restoreDatabaseBackup(backupPath, restorePath);
    return new Date().toISOString();
  } finally {
    await removeIfPresent(restorePath);
  }
}

async function pruneBackups(config: DatabaseBackupConfig): Promise<number> {
  const entries = await fs.readdir(config.directory, { withFileTypes: true });
  const backups: Array<{ name: string; modifiedAt: number }> = [];
  for (const entry of entries) {
    if (!entry.isFile() || !BACKUP_FILE_PATTERN.test(entry.name)) continue;
    const filePath = path.join(config.directory, entry.name);
    const stats = await fs.stat(filePath);
    backups.push({ name: entry.name, modifiedAt: stats.mtimeMs });
  }

  const cutoff = Date.now() - config.retentionDays * DAY_MS;
  const sorted = backups.sort((a, b) => b.modifiedAt - a.modifiedAt);
  const maxBackups = config.retentionDays * 4;
  const keep = sorted.filter(
    (backup, index) => backup.modifiedAt >= cutoff && index < maxBackups,
  );
  const keepNames = new Set(keep.map((backup) => backup.name));
  await Promise.all(
    sorted
      .filter((backup) => !keepNames.has(backup.name))
      .map((backup) => removeIfPresent(path.join(config.directory, backup.name))),
  );
  return keep.length;
}

export async function createDatabaseBackup(): Promise<DatabaseBackupResult> {
  const config = getDatabaseBackupConfig();
  await fs.mkdir(config.directory, { recursive: true });

  const now = new Date();
  const finalPath = path.join(config.directory, backupFileName(now));
  const temporaryPath = `${finalPath}.tmp`;
  const source = new Database(sqliteDatabasePath, {
    readonly: true,
    fileMustExist: true,
  });

  try {
    checkIntegrity(source, "Live database");
    await source.backup(temporaryPath);
  } catch (error) {
    await removeIfPresent(temporaryPath);
    throw error;
  } finally {
    source.close();
  }

  try {
    await fs.rename(temporaryPath, finalPath);
    const restoreCheckedAt = await verifyRestoration(finalPath, config.directory);
    const retainedBackups = await pruneBackups(config);
    backupState.lastSuccessAt = new Date().toISOString();
    backupState.lastFailureAt = null;
    backupState.lastBackupPath = finalPath;
    backupState.lastRestoreCheckAt = restoreCheckedAt;
    return { backupPath: finalPath, restoreCheckedAt, retainedBackups };
  } catch (error) {
    await removeIfPresent(temporaryPath);
    await removeIfPresent(finalPath);
    throw error;
  }
}

export async function runDatabaseBackup(): Promise<DatabaseBackupResult> {
  try {
    const result = await createDatabaseBackup();
    logger.info(
      {
        backupPath: result.backupPath,
        restoreCheckedAt: result.restoreCheckedAt,
        retainedBackups: result.retainedBackups,
      },
      "SQLite backup created and restore verified",
    );
    return result;
  } catch (error) {
    backupState.lastFailureAt = new Date().toISOString();
    logger.error({ err: error, sqliteDatabasePath }, "SQLite backup failed");
    throw error;
  }
}

let activeBackup: Promise<DatabaseBackupResult> | null = null;

async function runWithoutOverlap(): Promise<DatabaseBackupResult> {
  if (!activeBackup) {
    activeBackup = runDatabaseBackup().finally(() => {
      activeBackup = null;
    });
  }
  return activeBackup;
}

export async function startDatabaseBackupScheduler(): Promise<NodeJS.Timeout> {
  const config = getDatabaseBackupConfig();
  await runWithoutOverlap();
  const interval = setInterval(() => {
    void runWithoutOverlap().catch(() => {
      // The failure is already recorded and logged by runDatabaseBackup.
    });
  }, config.intervalHours * 60 * 60 * 1000);
  interval.unref();
  logger.info(
    {
      directory: config.directory,
      intervalHours: config.intervalHours,
      retentionDays: config.retentionDays,
    },
    "SQLite backup scheduler started",
  );
  return interval;
}

export function getDatabaseBackupHealth(): {
  healthy: boolean;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastBackupPath: string | null;
  lastRestoreCheckAt: string | null;
} {
  if (process.env.NODE_ENV !== "production") {
    return {
      healthy: true,
      lastSuccessAt: null,
      lastFailureAt: null,
      lastBackupPath: null,
      lastRestoreCheckAt: null,
    };
  }
  return { healthy: backupState.lastFailureAt === null && backupState.lastSuccessAt !== null, ...backupState };
}