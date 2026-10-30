// Recuperação de acesso (RF12): desfaz o vínculo do Facebook autorizado, encerra todas as sessões e reabre o /setup.
// Só quem tem SSH na VPS roda:  docker compose exec web node dist/admin-reset.mjs
import { inArray } from "drizzle-orm";
import { db, fecharDb } from "./index";
import { auditoria, authSessao, configuracao } from "./schema";

try {
  await db().transaction(async (tx) => {
    await tx.delete(configuracao).where(inArray(configuracao.chave, ["auth.facebook_user_id", "setup.concluido"]));
    await tx.delete(authSessao);
    await tx.insert(auditoria).values({ acao: "admin.reset" });
  });
  console.log("Acesso redefinido: sessões encerradas e /setup reaberto (use o SETUP_TOKEN do .env).");
} finally {
  await fecharDb();
}
