import { CAMPOS, type Config, lerConfig, paraTela, ultimasAuditorias } from "@/core/config";
import { Aviso, Cartao } from "../../ui";
import { type CampoTela, FormSecao } from "./secao";
import { type IdSecao, SECOES } from "./secoes";

export const dynamic = "force-dynamic";

function pendencias(cfg: Config): string[] {
  const p: string[] = [];
  if (!cfg["meta.system_user_token"]) p.push("Token do System User da Meta (sem ele não há publicação).");
  if (!cfg["r2.secret_access_key"]) p.push("Credenciais do R2 (sem elas não há upload de mídia).");
  if (!cfg["resend.api_key"]) p.push("Chave do Resend (sem ela não há avisos por e-mail nem link mágico).");
  return p;
}

export default async function Admin() {
  const cfg = await lerConfig();
  const auditorias = await ultimasAuditorias(15);
  const faltando = pendencias(cfg);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Painel de admin</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Credenciais ficam cifradas no banco. Depois de salvos, os segredos não são exibidos de novo.
        </p>
      </div>

      {faltando.length > 0 && (
        <Aviso>
          <p className="font-medium">Falta configurar:</p>
          <ul className="mt-1 list-disc pl-5">
            {faltando.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </Aviso>
      )}

      {(Object.keys(SECOES) as IdSecao[]).map((id) => {
        const s = SECOES[id];
        const campos: CampoTela[] = s.campos.map((chave) => ({
          chave,
          rotulo: CAMPOS[chave].rotulo,
          secreto: CAMPOS[chave].secreto,
          ...paraTela(chave, cfg[chave]),
        }));
        return (
          <Cartao key={id} titulo={s.titulo} descricao={s.descricao}>
            {id === "geral" && (
              <p className="mb-3 text-sm">
                ID do Facebook autorizado: <code>{cfg["auth.facebook_user_id"] ?? "—"}</code>
              </p>
            )}
            <FormSecao secao={id} campos={campos} rotuloTeste={s.testar} />
          </Cartao>
        );
      })}

      <Cartao titulo="Últimas alterações">
        {auditorias.length === 0 ? (
          <p className="text-sm text-neutral-500">Nada ainda.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
            {auditorias.map((a) => (
              <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  {a.acao}
                  {a.alvo && <span className="text-neutral-500"> · {a.alvo}</span>}
                </span>
                <time className="text-neutral-500">
                  {a.criadoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}
