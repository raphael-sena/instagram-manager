// Botões "Testar" do painel de admin (RF13). Nenhum resultado inclui segredos.
import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { enviarEmail } from "@/lib/email";
import { ErroGraph, Graph } from "@/meta/graph";
import type { Config } from "./config";

export interface ResultadoTeste {
  ok: boolean;
  mensagem: string;
  detalhes?: string[];
}

export const PERMISSOES_META = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
];

const falta = (cfg: Config, chaves: (keyof Config)[]) => chaves.filter((c) => !cfg[c]);

export function explicarErroMeta(e: unknown): string {
  if (!(e instanceof ErroGraph)) return e instanceof Error ? e.message : String(e);
  if (e.codigo === 190) return "Token inválido, expirado ou revogado. Gere um novo token do System User.";
  if (e.codigo === 10 || e.codigo === 200) return `Permissão insuficiente: ${e.message}`;
  if (e.codigo === 4 || e.codigo === 17 || e.codigo === 32) return "Limite de chamadas da Meta atingido. Tente em alguns minutos.";
  return `Erro da Meta (${e.codigo ?? e.httpStatus}): ${e.message}`;
}

export async function testarMeta(cfg: Config): Promise<ResultadoTeste> {
  const faltando = falta(cfg, ["meta.app_id", "meta.app_secret", "meta.system_user_token"]);
  if (faltando.length) return { ok: false, mensagem: `Preencha antes: ${faltando.join(", ")}` };
  const token = cfg["meta.system_user_token"]!;
  const graph = new Graph(token, cfg["meta.app_secret"]!);
  try {
    const { data } = await graph.get<{
      data: { is_valid: boolean; app_id: string; type?: string; expires_at?: number; scopes?: string[] };
    }>("debug_token", { input_token: token });
    if (!data.is_valid) return { ok: false, mensagem: "A Meta diz que o token não é válido." };
    const detalhes = [
      `Tipo: ${data.type ?? "?"}`,
      `Expira: ${!data.expires_at ? "nunca" : new Date(data.expires_at * 1000).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
    ];
    if (data.app_id !== cfg["meta.app_id"]) detalhes.push(`⚠️ O token é de outro app (${data.app_id}).`);
    const semPermissao = PERMISSOES_META.filter((p) => !data.scopes?.includes(p));
    if (semPermissao.length) detalhes.push(`⚠️ Permissões faltando: ${semPermissao.join(", ")}`);

    const paginas = await graph.get<{ data: { instagram_business_account?: { username: string } }[] }>("me/accounts", {
      fields: "instagram_business_account{username}",
      limit: "100",
    });
    const contas = paginas.data.flatMap((p) => (p.instagram_business_account ? [p.instagram_business_account.username] : []));
    detalhes.push(`Páginas: ${paginas.data.length} · contas do Instagram: ${contas.length}`);
    const ok = semPermissao.length === 0 && data.app_id === cfg["meta.app_id"];
    return { ok, mensagem: ok ? "Conexão com a Meta funcionando." : "Conectou, mas há pendências.", detalhes };
  } catch (e) {
    return { ok: false, mensagem: explicarErroMeta(e) };
  }
}

export async function testarR2(cfg: Config): Promise<ResultadoTeste> {
  const faltando = falta(cfg, ["r2.account_id", "r2.bucket", "r2.access_key_id", "r2.secret_access_key"]);
  if (faltando.length) return { ok: false, mensagem: `Preencha antes: ${faltando.join(", ")}` };
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${cfg["r2.account_id"]}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: cfg["r2.access_key_id"]!, secretAccessKey: cfg["r2.secret_access_key"]! },
  });
  const chave = `teste/${randomUUID()}.txt`;
  try {
    await s3.send(new PutObjectCommand({ Bucket: cfg["r2.bucket"], Key: chave, Body: "teste do painel", ContentType: "text/plain" }));
    await s3.send(new DeleteObjectCommand({ Bucket: cfg["r2.bucket"], Key: chave }));
    return { ok: true, mensagem: `Gravou e apagou um arquivo de teste em "${cfg["r2.bucket"]}".` };
  } catch (e) {
    return { ok: false, mensagem: `Falha no R2: ${e instanceof Error ? e.message : String(e)}` };
  } finally {
    s3.destroy();
  }
}

export async function testarEmail(cfg: Config): Promise<ResultadoTeste> {
  const faltando = falta(cfg, ["resend.api_key", "email.remetente"]);
  const para = cfg["email.avisos"] || cfg["auth.admin_email"];
  if (faltando.length) return { ok: false, mensagem: `Preencha antes: ${faltando.join(", ")}` };
  if (!para) return { ok: false, mensagem: "Preencha o e-mail que recebe os avisos (ou o do admin)." };
  try {
    await enviarEmail(
      { apiKey: cfg["resend.api_key"]!, remetente: cfg["email.remetente"]! },
      para,
      "Instagram Manager — e-mail de teste",
      "Se você recebeu esta mensagem, os avisos por e-mail estão funcionando.",
    );
    return { ok: true, mensagem: `E-mail de teste enviado para ${para}.` };
  } catch (e) {
    return { ok: false, mensagem: e instanceof Error ? e.message : String(e) };
  }
}
