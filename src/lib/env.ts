// Variáveis de ambiente do processo (web e worker). Só o bootstrap mora aqui: as credenciais de integração
// ficam no banco, geridas pelo painel de admin (docs/06, "Configuração e segredos").
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/, error: "DATABASE_URL deve ser uma URL postgres://" }),
  APP_VERSION: z.string().min(1).default("dev"),
  HEARTBEAT_FILE: z.string().min(1).default("/tmp/worker-heartbeat"),
});

export type Env = z.infer<typeof schema>;

export function lerEnv(fonte: Record<string, string | undefined> = process.env): Env {
  const r = schema.safeParse(fonte);
  if (!r.success) throw new Error(`Configuração inválida:\n${z.prettifyError(r.error)}`);
  return r.data;
}

let cache: Env | undefined;
export const env = (): Env => (cache ??= lerEnv());
