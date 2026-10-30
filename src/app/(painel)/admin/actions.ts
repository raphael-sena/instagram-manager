"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSessao } from "@/auth";
import { CAMPOS, type Chave, type Config, lerConfig, registrarAuditoria, salvarConfig } from "@/core/config";
import { type ResultadoTeste, testarEmail, testarMeta, testarR2 } from "@/core/integracoes";
import { type IdSecao, SECOES } from "./secoes";

const inteiro = (rotulo: string, min: number, max: number) =>
  z.coerce
    .number({ error: `${rotulo}: informe um número` })
    .int(`${rotulo}: use um número inteiro`)
    .min(min, `${rotulo}: mínimo ${min}`)
    .max(max, `${rotulo}: máximo ${max}`)
    .transform(String);

const VALIDACAO: Partial<Record<Chave, z.ZodType<string>>> = {
  "meta.app_id": z.string().regex(/^\d{5,25}$/, "App ID: só números"),
  "auth.admin_email": z.email("E-mail do admin inválido"),
  "email.avisos": z.email("E-mail dos avisos inválido"),
  "email.remetente": z.string().regex(/^(.+<)?[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>?$/, "Remetente: e-mail ou Nome <e-mail>"),
  "param.retencao_falha_horas": inteiro("Retenção", 1, 168),
  "param.tolerancia_atraso_min": inteiro("Tolerância de atraso", 1, 1440),
  "param.concorrencia": inteiro("Publicações em paralelo", 1, 50),
};

export type EstadoSecao = { ok?: string; erro?: string; teste?: ResultadoTeste };

export async function salvarSecao(secao: IdSecao, _: EstadoSecao, form: FormData): Promise<EstadoSecao> {
  await exigirSessao();
  const valores: Config = {};
  for (const chave of SECOES[secao].campos) {
    const bruto = String(form.get(chave) ?? "").trim();
    if (form.get(`limpar:${chave}`) === "on") {
      valores[chave] = "";
      continue;
    }
    // segredo em branco = manter o atual
    if (CAMPOS[chave].secreto && bruto === "") continue;
    if (bruto === "") {
      valores[chave] = "";
      continue;
    }
    const regra = VALIDACAO[chave];
    if (regra) {
      const r = regra.safeParse(bruto);
      if (!r.success) return { erro: r.error.issues[0]?.message };
      valores[chave] = r.data;
    } else {
      valores[chave] = bruto;
    }
  }
  await salvarConfig(valores);
  revalidatePath("/admin");
  return { ok: "Salvo." };
}

export async function testarSecao(secao: IdSecao): Promise<EstadoSecao> {
  await exigirSessao();
  const cfg = await lerConfig();
  const teste = secao === "meta" ? await testarMeta(cfg) : secao === "r2" ? await testarR2(cfg) : await testarEmail(cfg);
  await registrarAuditoria(`teste.${secao}.${teste.ok ? "ok" : "falhou"}`);
  revalidatePath("/admin");
  return { teste };
}
