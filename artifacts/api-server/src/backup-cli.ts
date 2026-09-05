import path from "node:path";
import {
  getDatabaseBackupConfig,
  restoreDatabaseBackup,
  runDatabaseBackup,
} from "./lib/database-backup";

const cliArgs = process.argv.slice(2);
if (cliArgs[1] === "--") cliArgs.splice(1, 1);
const [command, backupPath, destinationPath] = cliArgs;

try {
  if (command === "backup") {
    const result = await runDatabaseBackup();
    console.log(
      JSON.stringify(
        {
          backupPath: result.backupPath,
          restoreCheckedAt: result.restoreCheckedAt,
          retainedBackups: result.retainedBackups,
        },
        null,
        2,
      ),
    );
  } else if (command === "restore" && backupPath && destinationPath) {
    await restoreDatabaseBackup(backupPath, path.resolve(destinationPath));
    console.log(`Restore verified at ${path.resolve(destinationPath)}`);
  } else {
    console.error(
      "Usage: pnpm --filter @workspace/api-server run backup | " +
        "pnpm --filter @workspace/api-server run restore -- <backup.sqlite> <new-database.sqlite>",
    );
    console.error(`Configured backup directory: ${getDatabaseBackupConfig().directory}`);
    process.exitCode = 2;
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}