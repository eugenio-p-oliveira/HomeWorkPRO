import { db, pool, usersTable } from "@workspace/db";
import crypto from "crypto";

function hashPassword(p: string) {
  return crypto.createHash("sha256").update(p + "edusaas_salt").digest("hex");
}

async function main() {
  const hash = hashPassword("senha123");
  const result = await db.update(usersTable).set({ passwordHash: hash });
  console.log(`✅ Senha atualizada para ${result.length} usuários`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
