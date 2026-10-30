// Configurações do painel de admin (RF13): guardadas cifradas na tabela "configuracao", lidas com cache curto.
import { desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { auditoria, configuracao } from "@/db/schema";
import { cifrar, decifrar } from "@/lib/crypto";

export const CAMPOS = {
  "meta.app_id": { rotulo: "App ID", secreto: false },
  "meta.app_secret": { rotulo: "App Secret", secreto: true },
  "meta.system_user_token": { rotulo: "Token do System User", secreto: true },
  "r2.account_id": { rotulo: "Account ID", secreto: false },
  "r2.bucket": { rotulo: "Bucket", secreto: false, padrao: "instagram-midias" },
  "r2.access_key_id": { rotulo: "Access Key ID", secreto: false },
  "r2.secret_access_key": { rotulo: "Secret Access Key", secreto: true },
  "resend.api_key": { rotulo: "Chave da API", secreto: true },
  "email.remetente": { rotulo: "Remetente", secreto: false },
  "email.avisos": { rotulo: "E-mail que recebe os avisos", secreto: false },
  "auth.admin_email": { rotulo: "E-mail do admin (link mágico)", secreto: false },
  "auth.facebook_user_id": { rotulo: "ID do Facebook autorizado", secreto: false },
  "param.retencao_falha_horas": { rotulo: "Retenção de mídia com falha (horas)", secreto: false, padrao: "24" },
  "param.tolerancia_atraso_min": { rotulo: "Tolerância de atraso do agendamento (min)", secreto: false, padrao: "15" },
  "param.concorrencia": { rotulo: "Publicações em paralelo", secreto: false, padrao: "10" },
  "setup.concluido": { rotulo: "Primeiro acesso concluído", secreto: false },
} as const satisfies Record<string, { rotulo: string; secreto: boolean; padrao?: string }>;

export type Chave = keyof typeof CAMPOS;
export type Config = Partial<Record<Chave, string>>;

const TTL_MS = 15_000;
let cache: { em: number; valores: Config } | undefined;

/** Todas as configurações decifradas, com os padrões aplicados. Cache de 15 s por processo. */
export async function lerConfig(): Promise<Config> {
  if (cache && Date.now() - cache.em < TTL_MS) return cache.valores;
  const linhas = await db().select().from(configuracao);
  const valores: Config = {};
  for (const [chave, campo] of Object.entries(CAMPOS)) {
    if ("padrao" in campo) valores[chave as Chave] = campo.padrao;
  }
  for (const l of linhas) {
    if (!(l.chave in CAMPOS)) continue;
    try {
      valores[l.chave as Chave] = decifrar(l.valorCifrado, l.chave);
    } catch {
      // chave-mestra trocada ou valor corrompido: tratado como não configurado (o painel mostra o campo vazio)
      console.error(`[config] não foi possível decifrar "${l.chave}"`);
    }
  }
  cache = { em: Date.now(), valores };
  return valores;
}

/**
 * Grava (ou apaga, com valor vazio) as chaves informadas e registra na auditoria. Valores `undefined` são ignorados:
 * é assim que um campo secreto deixado em branco no formulário mantém o valor atual.
 */
export async function salvarConfig(valores: Config, acao = "config.alterada"): Promise<void> {
  const entradas = Object.entries(valores).filter(([, v]) => v !== undefined) as [Chave, string][];
  if (entradas.length === 0) return;
  await db().transaction(async (tx) => {
    const apagar = entradas.filter(([, v]) => v === "").map(([k]) => k);
    if (apagar.length) await tx.delete(configuracao).where(inArray(configuracao.chave, apagar));
    for (const [chave, valor] of entradas.filter(([, v]) => v !== "")) {
      const valorCifrado = cifrar(valor, chave);
      await tx
        .insert(configuracao)
        .values({ chave, valorCifrado })
        .onConflictDoUpdate({ target: configuracao.chave, set: { valorCifrado, atualizadoEm: new Date() } });
    }
    await tx.insert(auditoria).values(entradas.map(([chave]) => ({ acao, alvo: chave })));
  });
  cache = undefined;
}

export async function registrarAuditoria(acao: string, alvo?: string) {
  await db().insert(auditoria).values({ acao, alvo });
}

export async function ultimasAuditorias(limite = 20) {
  return db().select().from(auditoria).orderBy(desc(auditoria.id)).limit(limite);
}

export function invalidarCacheConfig() {
  cache = undefined;
}

/** Como um valor aparece no painel: segredos mascarados, nunca o valor real. */
export function paraTela(chave: Chave, valor: string | undefined): { definido: boolean; exibicao: string } {
  if (!valor) return { definido: false, exibicao: "" };
  if (!CAMPOS[chave].secreto) return { definido: true, exibicao: valor };
  return { definido: true, exibicao: `••••${valor.length > 8 ? valor.slice(-4) : ""}` };
}
