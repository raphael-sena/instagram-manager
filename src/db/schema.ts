import type { AdapterAccountType } from "next-auth/adapters";
import { integer, pgTable, primaryKey, serial, text, timestamp } from "drizzle-orm/pg-core";

/** Configurações e credenciais de integração, cifradas com APP_ENCRYPTION_KEY (src/core/config.ts). */
export const configuracao = pgTable("configuracao", {
  chave: text().primaryKey(),
  valorCifrado: text().notNull(),
  atualizadoEm: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** O quê mudou e quando — nunca o valor. */
export const auditoria = pgTable("auditoria", {
  id: serial().primaryKey(),
  acao: text().notNull(),
  alvo: text(),
  criadoEm: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** Linha única atualizada pelo worker a cada minuto; o /api/health a usa para saber se o worker está vivo. */
export const workerHeartbeat = pgTable("worker_heartbeat", {
  id: integer().primaryKey().default(1),
  vistoEm: timestamp({ withTimezone: true }).notNull(),
  versao: text().notNull(),
});

// ── Auth.js (formato exigido pelo @auth/drizzle-adapter) ─────────────────────
export const authUsuario = pgTable("auth_usuario", {
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text(),
  email: text().unique(),
  emailVerified: timestamp({ mode: "date" }),
  image: text(),
});

export const authConta = pgTable(
  "auth_conta",
  {
    userId: text()
      .notNull()
      .references(() => authUsuario.id, { onDelete: "cascade" }),
    type: text().$type<AdapterAccountType>().notNull(),
    provider: text().notNull(),
    providerAccountId: text().notNull(),
    // tokens do provedor não são guardados (src/auth.ts): o login só identifica, não publica
    refresh_token: text(),
    access_token: text(),
    expires_at: integer(),
    token_type: text(),
    scope: text(),
    id_token: text(),
    session_state: text(),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const authSessao = pgTable("auth_sessao", {
  sessionToken: text().primaryKey(),
  userId: text()
    .notNull()
    .references(() => authUsuario.id, { onDelete: "cascade" }),
  expires: timestamp({ mode: "date" }).notNull(),
});

export const authTokenVerificacao = pgTable(
  "auth_token_verificacao",
  {
    identifier: text().notNull(),
    token: text().notNull(),
    expires: timestamp({ mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);
