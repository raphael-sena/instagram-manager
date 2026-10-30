// Variáveis de ambiente. Só o bootstrap mora aqui: as credenciais de integração ficam no banco, geridas pelo painel
// de admin (docs/06, "Configuração e segredos"). O worker recebe só o necessário; os segredos de login são do web.
import { z } from "zod";

const chave32 = z
  .string({ error: "APP_ENCRYPTION_KEY ausente" })
  .refine((v) => Buffer.from(v, "base64").length === 32, "APP_ENCRYPTION_KEY deve ter 32 bytes em base64 (openssl rand -base64 32)");

const base = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/, error: "DATABASE_URL deve ser uma URL postgres://" }),
  APP_VERSION: z.string().min(1).default("dev"),
  HEARTBEAT_FILE: z.string().min(1).default("/tmp/worker-heartbeat"),
  /** Chave-mestra que cifra as credenciais guardadas no banco. Perdê-la = recadastrar tudo no painel. */
  APP_ENCRYPTION_KEY: chave32,
});

const web = base.extend({
  /** Assina a sessão (Auth.js) e o cookie do primeiro acesso. */
  AUTH_SECRET: z.string({ error: "AUTH_SECRET ausente" }).min(32, "AUTH_SECRET deve ter pelo menos 32 caracteres"),
  /** Código do assistente /setup (primeiro acesso e recuperação). */
  SETUP_TOKEN: z.string({ error: "SETUP_TOKEN ausente" }).min(24, "SETUP_TOKEN deve ter pelo menos 24 caracteres"),
});

export type Env = z.infer<typeof base>;
export type EnvWeb = z.infer<typeof web>;

type Fonte = Record<string, string | undefined>;

function validar<T extends z.ZodType>(schema: T, fonte: Fonte): z.infer<T> {
  const r = schema.safeParse(fonte);
  if (!r.success) throw new Error(`Configuração inválida:\n${z.prettifyError(r.error)}`);
  return r.data;
}

export const lerEnv = (fonte: Fonte = process.env): Env => validar(base, fonte);
export const lerEnvWeb = (fonte: Fonte = process.env): EnvWeb => validar(web, fonte);

let cache: Env | undefined;
let cacheWeb: EnvWeb | undefined;
export const env = (): Env => (cache ??= lerEnv());
export const envWeb = (): EnvWeb => (cacheWeb ??= lerEnvWeb());
