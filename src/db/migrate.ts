// Aplica as migrations pendentes. Roda no boot do container web, antes do servidor (ver Dockerfile).
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, fecharDb } from "./index";

const pasta = process.env.MIGRATIONS_DIR ?? "./drizzle";
try {
  await migrate(db(), { migrationsFolder: pasta });
  console.log(`migrations aplicadas (${pasta})`);
} finally {
  await fecharDb();
}
