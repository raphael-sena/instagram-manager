import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** Configurações e credenciais de integração, cifradas com APP_ENCRYPTION_KEY (preenchida pelo painel, fase 2). */
export const configuracao = pgTable("configuracao", {
  chave: text().primaryKey(),
  valorCifrado: text().notNull(),
  atualizadoEm: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** Linha única atualizada pelo worker a cada minuto; o /api/health a usa para saber se o worker está vivo. */
export const workerHeartbeat = pgTable("worker_heartbeat", {
  id: integer().primaryKey().default(1),
  vistoEm: timestamp({ withTimezone: true }).notNull(),
  versao: text().notNull(),
});
