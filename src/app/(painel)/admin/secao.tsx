"use client";

import { useActionState } from "react";
import { Aviso, estiloBotao, estiloBotaoSecundario, estiloCampo } from "../../ui";
import { type EstadoSecao, salvarSecao, testarSecao } from "./actions";
import type { IdSecao } from "./secoes";

export interface CampoTela {
  chave: string;
  rotulo: string;
  secreto: boolean;
  definido: boolean;
  exibicao: string;
}

export function FormSecao({ secao, campos, rotuloTeste }: { secao: IdSecao; campos: CampoTela[]; rotuloTeste?: string }) {
  const [salvo, salvar, salvando] = useActionState<EstadoSecao, FormData>(salvarSecao.bind(null, secao), {});
  const [testado, testar, testando] = useActionState<EstadoSecao>(testarSecao.bind(null, secao), {});

  return (
    <div className="flex flex-col gap-4">
      <form action={salvar} className="flex flex-col gap-3">
        {campos.map((c) => (
          <label key={c.chave} className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{c.rotulo}</span>
            {c.secreto ? (
              <>
                <input
                  name={c.chave}
                  type="password"
                  autoComplete="new-password"
                  placeholder={c.definido ? `${c.exibicao} (deixe em branco para manter)` : "Não configurado"}
                  className={estiloCampo}
                />
                {c.definido && (
                  <span className="flex items-center gap-2 text-xs text-neutral-500">
                    <input type="checkbox" name={`limpar:${c.chave}`} /> Remover este valor
                  </span>
                )}
              </>
            ) : (
              <input name={c.chave} defaultValue={c.exibicao} autoComplete="off" className={estiloCampo} />
            )}
          </label>
        ))}
        {salvo.erro && <Aviso tipo="erro">{salvo.erro}</Aviso>}
        {salvo.ok && !salvando && <Aviso tipo="ok">{salvo.ok}</Aviso>}
        <div className="flex flex-wrap gap-2">
          <button className={estiloBotao} disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>

      {rotuloTeste && (
        <form action={testar} className="flex flex-col gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <button className={estiloBotaoSecundario} disabled={testando}>
            {testando ? "Testando…" : rotuloTeste}
          </button>
          {testado.teste && (
            <Aviso tipo={testado.teste.ok ? "ok" : "erro"}>
              <p>{testado.teste.mensagem}</p>
              {testado.teste.detalhes && (
                <ul className="mt-1 list-disc pl-5">
                  {testado.teste.detalhes.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              )}
            </Aviso>
          )}
        </form>
      )}
    </div>
  );
}
