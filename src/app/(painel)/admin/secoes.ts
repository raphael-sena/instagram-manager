import type { Chave } from "@/core/config";

/** Agrupamento dos campos do painel. "testar" indica qual botão de teste a seção tem. */
export const SECOES = {
  meta: {
    titulo: "Meta (Instagram)",
    descricao: "App ID e App Secret em Meta for Developers. O token é o do System User do Business Portfolio (guia da fase 0).",
    campos: ["meta.app_id", "meta.app_secret", "meta.system_user_token"],
    testar: "Testar conexão",
  },
  r2: {
    titulo: "Cloudflare R2 (mídias)",
    descricao: "Token com leitura e gravação só no bucket de mídias.",
    campos: ["r2.account_id", "r2.bucket", "r2.access_key_id", "r2.secret_access_key"],
    testar: "Testar bucket",
  },
  email: {
    titulo: "E-mail (Resend)",
    descricao: "Usado nos avisos de falha e no link mágico de login. O remetente precisa ser de um domínio verificado no Resend.",
    campos: ["resend.api_key", "email.remetente", "email.avisos"],
    testar: "Enviar e-mail de teste",
  },
  geral: {
    titulo: "Acesso e parâmetros",
    descricao: "O ID do Facebook autorizado é definido no primeiro acesso; para trocá-lo, use o comando de recuperação na VPS.",
    campos: ["auth.admin_email", "param.retencao_falha_horas", "param.tolerancia_atraso_min", "param.concorrencia"],
    testar: undefined,
  },
} as const satisfies Record<string, { titulo: string; descricao: string; campos: readonly Chave[]; testar?: string }>;

export type IdSecao = keyof typeof SECOES;
