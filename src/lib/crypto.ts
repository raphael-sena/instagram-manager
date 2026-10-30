// Cifra das credenciais guardadas no banco: AES-256-GCM com a chave-mestra APP_ENCRYPTION_KEY.
// O nome da configuração entra como dado autenticado (AAD): um valor cifrado não pode ser copiado para outra chave.
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env, envWeb } from "./env";

const VERSAO = "v1";

const chaveMestra = () => Buffer.from(env().APP_ENCRYPTION_KEY, "base64");

export function cifrar(texto: string, contexto: string, chave: Buffer = chaveMestra()): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave, iv).setAAD(Buffer.from(contexto));
  const dados = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return [VERSAO, iv, c.getAuthTag(), dados].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

export function decifrar(cifrado: string, contexto: string, chave: Buffer = chaveMestra()): string {
  const [versao, iv, tag, dados] = cifrado.split(".");
  if (versao !== VERSAO || !iv || !tag || dados === undefined) throw new Error("valor cifrado em formato desconhecido");
  const d = createDecipheriv("aes-256-gcm", chave, Buffer.from(iv, "base64url"))
    .setAAD(Buffer.from(contexto))
    .setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(dados, "base64url")), d.final()]).toString("utf8");
}

/** Comparação em tempo constante (tokens, assinaturas). */
export function iguais(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function assinar(texto: string, segredo: string = envWeb().AUTH_SECRET): string {
  return createHmac("sha256", segredo).update(texto).digest("base64url");
}
