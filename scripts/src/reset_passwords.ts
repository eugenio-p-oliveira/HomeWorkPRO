import { db, pool, usersTable } from "@workspace/db";
import crypto from "crypto";

const DEFAULT_PASSWORD = "senha123";
const SALT = "edusaas_salt";

function hashPassword(password: string) {
  return crypto.createHash("sha256").update(password + SALT).digest("hex");
}

async function main() {
  try {
    console.log("\ud83d\udd10 Iniciando reset de senhas...");

    const users = await db.select().from(usersTable);

    if (!users.length) {
      console.log("\u26a0\ufe0f Nenhum usu\u00e1rio encontrado");
      return;
    }

    const hash = hashPassword(DEFAULT_PASSWORD);

    const result = await db
      .update(usersTable)
      .set({
        passwordHash: hash,
      });

    console.log("\u2705 Senhas resetadas com sucesso");
    console.log("\ud83d\udc65 Usu\u00e1rios:", users.length);
    console.log("\ud83d\udd22 Hash aplicado:", hash);
    console.log("\u2139\ufe0f Senha padr\u00e3o:", DEFAULT_PASSWORD);

  } catch (error) {
    console.error("\u274c Erro ao resetar senhas:", error);
  } finally {
    await pool.end();
    console.log("\ud83d\udd0c Conex\u00e3o encerrada");
  }
}

main();
