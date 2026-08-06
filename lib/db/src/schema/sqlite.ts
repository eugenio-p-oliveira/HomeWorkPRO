import { customType } from "drizzle-orm/sqlite-core";

/**
 * The migrated SQLite database stores timestamps as ISO text. Expose them as
 * Date values to the application while keeping the on-disk representation
 * compatible with the existing database.
 */
export const sqliteTimestamp = customType<{
  dataType: "text";
  data: Date;
  driverData: string;
}>({
  dataType() {
    return "text";
  },
  fromDriver(value) {
    const parsed = new Date(value);
    // Older migrated rows may contain SQLite's literal CURRENT_TIMESTAMP
    // default instead of the expanded ISO value.
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  },
  toDriver(value) {
    return value.toISOString();
  },
});