"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn } from "@/auth";
import { COOKIE_SETUP, criarCookieSetup, VALIDADE_SETUP_MS } from "@/core/acesso";
import { lerConfig, registrarAuditoria, salvarConfig } from "@/core/config";
import { iguais } from "@/lib/crypto";
import { envWeb } from "@/lib/env";
import { LimiteTentativas } from "@/lib/limite";

const limiteSetup = new LimiteTentativas(5, 15 * 60_000);

const dados = z.object({
  token: z.string().min(1, "Informe o código de instalação."),
  appId: z.string().trim().regex(/^\d{5,25}$/, "O App ID tem só números."),
  appSecret: z.string().trim().regex(/^[0-9a-f]{32}$/i, "O App Secret tem 32 caracteres (0-9, a-f)."),
  adminEmail: z.union([z.literal(""), z.email("E-mail inválido.")]),
});

export type EstadoSetup = { erro?: string };

export async function iniciarSetup(_: EstadoSetup, form: FormData): Promise<EstadoSetup> {
  if ((await lerConfig())["setup.concluido"]) return { erro: "O primeiro acesso já foi concluído." };
  if (!limiteSetup.tentar("setup")) return { erro: "Muitas tentativas. Aguarde 15 minutos." };

  const r = dados.safeParse({
    token: form.get("token"),
    appId: form.get("appId"),
    appSecret: form.get("appSecret"),
    adminEmail: String(form.get("adminEmail") ?? "").trim(),
  });
  if (!r.success) return { erro: r.error.issues[0]?.message };
  if (!iguais(r.data.token, envWeb().SETUP_TOKEN)) {
    await registrarAuditoria("setup.codigo_incorreto");
    return { erro: "Código de instalação incorreto." };
  }

  await salvarConfig(
    {
      "meta.app_id": r.data.appId,
      "meta.app_secret": r.data.appSecret,
      "auth.admin_email": r.data.adminEmail || undefined,
    },
    "setup.iniciado",
  );
  (await cookies()).set(COOKIE_SETUP, criarCookieSetup(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: VALIDADE_SETUP_MS / 1000,
  });
  redirect("/setup");
}

export async function entrarComFacebook() {
  await signIn("facebook", { redirectTo: "/admin" });
}
