// Quem pode entrar (RF12): só o ID do Facebook autorizado, ou o e-mail do admin pelo link mágico.
// No primeiro acesso ainda não há ID autorizado: ele é vinculado no login com Facebook, mas só no navegador que
// acabou de passar pelo /setup com o SETUP_TOKEN (cookie assinado). Sem isso, qualquer um que achasse a URL entre
// o cadastro do App ID e o primeiro login viraria o admin.
import { assinar, iguais } from "@/lib/crypto";
import type { Config } from "./config";

export const COOKIE_SETUP = "im_setup";
export const VALIDADE_SETUP_MS = 30 * 60_000;

export function criarCookieSetup(agora: number = Date.now(), segredo?: string): string {
  const expira = agora + VALIDADE_SETUP_MS;
  return `${expira}.${assinar(`setup:${expira}`, segredo)}`;
}

export function cookieSetupValido(valor: string | undefined, agora: number = Date.now(), segredo?: string): boolean {
  if (!valor) return false;
  const [expira, assinatura] = valor.split(".");
  if (!expira || !assinatura || !/^\d+$/.test(expira) || Number(expira) < agora) return false;
  return iguais(assinatura, assinar(`setup:${expira}`, segredo));
}

export interface TentativaLogin {
  provedor: string;
  idNoProvedor?: string;
  email?: string | null;
}

export type DecisaoLogin = { permitido: false } | { permitido: true; vincularFacebook?: string };

export function decidirLogin(t: TentativaLogin, cfg: Config, setupPendente: boolean): DecisaoLogin {
  if (t.provedor === "facebook" && t.idNoProvedor) {
    const autorizado = cfg["auth.facebook_user_id"];
    if (autorizado) return { permitido: iguais(t.idNoProvedor, autorizado) };
    return setupPendente ? { permitido: true, vincularFacebook: t.idNoProvedor } : { permitido: false };
  }
  if (t.provedor === "resend" && t.email) {
    const admin = cfg["auth.admin_email"]?.trim().toLowerCase();
    return { permitido: !!admin && t.email.trim().toLowerCase() === admin };
  }
  return { permitido: false };
}
