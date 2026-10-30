// Processo worker: filas e agendamentos (pg-boss). Na fase 1 só mantém o heartbeat; a publicação entra na fase 4.
import { writeFile } from "node:fs/promises";
import { PgBoss } from "pg-boss";
import { db, fecharDb } from "@/db";
import { workerHeartbeat } from "@/db/schema";
import { env } from "@/lib/env";

const FILA_HEARTBEAT = "heartbeat";

async function registrarHeartbeat() {
  const agora = new Date();
  await db()
    .insert(workerHeartbeat)
    .values({ id: 1, vistoEm: agora, versao: env().APP_VERSION })
    .onConflictDoUpdate({ target: workerHeartbeat.id, set: { vistoEm: agora, versao: env().APP_VERSION } });
  // o healthcheck do container lê a data deste arquivo (docker-compose.producao.yml)
  await writeFile(env().HEARTBEAT_FILE, agora.toISOString());
}

const boss = new PgBoss({ connectionString: env().DATABASE_URL, application_name: "instagram-worker", max: 4 });
boss.on("error", (e) => console.error("[pg-boss]", e));

await boss.start();
await boss.createQueue(FILA_HEARTBEAT);
await boss.schedule(FILA_HEARTBEAT, "* * * * *");
await boss.work(FILA_HEARTBEAT, async () => {
  await registrarHeartbeat();
});
await registrarHeartbeat();
console.log(`worker no ar (versão ${env().APP_VERSION})`);

let encerrando = false;
for (const sinal of ["SIGTERM", "SIGINT"] as const) {
  process.on(sinal, async () => {
    if (encerrando) return;
    encerrando = true;
    console.log(`${sinal}: encerrando…`);
    await boss.stop({ graceful: true, timeout: 20_000 });
    await fecharDb();
    process.exit(0);
  });
}
