// Integração com o Postgres (roda quando DATABASE_URL existe: CI e `docker compose -f docker-compose.dev.yml up`).
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

process.env.APP_ENCRYPTION_KEY ??= Buffer.alloc(32, 9).toString("base64");

const { db, fecharDb } = await import("@/db");
const { auditoria, configuracao } = await import("@/db/schema");
const { lerConfig, salvarConfig, invalidarCacheConfig } = await import("./config");

describe.skipIf(!process.env.DATABASE_URL)("config no banco", () => {
  beforeEach(async () => {
    await db().delete(configuracao);
    invalidarCacheConfig();
  });
  afterAll(async () => {
    await db().delete(configuracao);
    await fecharDb();
  });

  it("grava cifrado, lê decifrado e audita sem o valor", async () => {
    await salvarConfig({ "meta.app_secret": "segredo-1234567890", "meta.app_id": "123456" });
    const [linha] = await db().select().from(configuracao).where(eq(configuracao.chave, "meta.app_secret"));
    expect(linha.valorCifrado).not.toContain("segredo");
    const cfg = await lerConfig();
    expect(cfg["meta.app_secret"]).toBe("segredo-1234567890");
    expect(cfg["param.concorrencia"]).toBe("10");
    const auds = await db().select().from(auditoria).where(eq(auditoria.alvo, "meta.app_secret"));
    expect(auds.length).toBeGreaterThan(0);
    expect(JSON.stringify(auds)).not.toContain("segredo");
  });

  it("undefined mantém, vazio apaga", async () => {
    await salvarConfig({ "resend.api_key": "chave-a", "email.remetente": "a@b.c" });
    await salvarConfig({ "resend.api_key": undefined, "email.remetente": "" });
    const cfg = await lerConfig();
    expect(cfg["resend.api_key"]).toBe("chave-a");
    expect(cfg["email.remetente"]).toBeUndefined();
  });

  it("valor copiado para outra chave não decifra (AAD)", async () => {
    await salvarConfig({ "meta.app_secret": "segredo-x" });
    const [linha] = await db().select().from(configuracao).where(eq(configuracao.chave, "meta.app_secret"));
    await db().insert(configuracao).values({ chave: "resend.api_key", valorCifrado: linha.valorCifrado });
    invalidarCacheConfig();
    expect((await lerConfig())["resend.api_key"]).toBeUndefined();
  });
});
