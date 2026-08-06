import { db, usersTable } from "@workspace/db";
import crypto from "crypto";

const DEFAULT_PASSWORD = "senha123";
const SALT = "edusaas_salt";

function hashPassword(password: string) {
  return crypto.createHash("sha256").update(password + SALT).digest("hex");
}

async function main() {
  try {
    console.log("Iniciando reset de senhas...");

    const users = await db.select().from(usersTable);

    if (!users.length) {
      console.log("Nenhum usuário encontrado");
      return;
    }

    const hash = hashPassword(DEFAULT_PASSWORD);
    await db.update(usersTable).set({ passwordHash: hash });

    console.log("Senhas resetadas com sucesso");
    console.log("Usuários:", users.length);
    console.log("Senha padrão:", DEFAULT_PASSWORD);
  } catch (error) {
    console.error("Erro ao resetar senhas:", error);
    process.exitCode = 1;
  }
}

main();