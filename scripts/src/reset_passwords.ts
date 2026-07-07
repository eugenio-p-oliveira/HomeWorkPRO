import { db, pool, usersTable } from "@workspace/db";
import crypto from "crypto";

const DEFAULT_PASSWORD = "senha123";
const SALT = "edusaas_salt";

function hashPassword(password: string) {
  return crypto
    .createHash("sha256")
    .update(password + SALT)
    .digest("hex");
}

async function main() {
  try {
    console.log("🔐 Iniciando reset de senhas...");

    const hash = hashPassword(DEFAULT_PASSWORD);

    const result = await db
      .update(usersTable)
      .set({
        passwordHash: hash,
      });

    console.log("✅ Senha atualizada para todos os usuários");
    console.log("ℹ️ Senha padrão:", DEFAULT_PASSWORD);
    console.log("🔢 Hash aplicado:", hash);
    console.log("👥 Usuários afetados:", result?.rowCount ?? "indefinido");

  } catch (error) {
    console.error("❌ Erro ao resetar senhas:", error);
  } finally {
    await pool.end();
    console.log("🔌 Conexão encerrada");
  }
}

main();