"use client";

import { useActionState } from "react";
import { Aviso, estiloBotao, estiloCampo } from "../ui";
import { iniciarSetup, type EstadoSetup } from "./actions";

export function FormularioSetup() {
  const [estado, enviar, enviando] = useActionState<EstadoSetup, FormData>(iniciarSetup, {});
  const campo = (nome: string, rotulo: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{rotulo}</span>
      <input name={nome} className={estiloCampo} autoComplete="off" {...extra} />
    </label>
  );
  return (
    <form action={enviar} className="flex flex-col gap-4">
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {campo("token", "Código de instalação (SETUP_TOKEN)", { type: "password", required: true })}
      {campo("appId", "App ID da Meta", { inputMode: "numeric", required: true })}
      {campo("appSecret", "App Secret da Meta", { type: "password", required: true })}
      {campo("adminEmail", "Seu e-mail (para o link mágico — opcional)", { type: "email" })}
      <button className={estiloBotao} disabled={enviando}>
        {enviando ? "Salvando…" : "Continuar"}
      </button>
    </form>
  );
}
