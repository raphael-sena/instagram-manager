import Link from "next/link";
import { cookies, headers } from "next/headers";
import { COOKIE_SETUP, cookieSetupValido } from "@/core/acesso";
import { lerConfig } from "@/core/config";
import { Aviso, Cartao, estiloBotao } from "../ui";
import { entrarComFacebook } from "./actions";
import { FormularioSetup } from "./formulario";

export const dynamic = "force-dynamic";

export default async function Setup() {
  const cfg = await lerConfig();
  const pendente = cookieSetupValido((await cookies()).get(COOKIE_SETUP)?.value);
  const origem = process.env.AUTH_URL ?? `https://${(await headers()).get("host")}`;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">Primeiro acesso</h1>
      {cfg["setup.concluido"] ? (
        <Aviso tipo="ok">
          O primeiro acesso já foi concluído. <Link className="underline" href="/login">Entrar</Link>.
        </Aviso>
      ) : pendente ? (
        <Cartao
          titulo="2. Entre com o seu Facebook"
          descricao="A conta do Facebook que entrar agora passa a ser a única autorizada no sistema."
        >
          <form action={entrarComFacebook}>
            <button className={`${estiloBotao} w-full`}>Entrar com Facebook</button>
          </form>
          <p className="mt-3 text-xs text-neutral-500">
            No app da Meta, a URL de redirecionamento do Facebook Login deve ser{" "}
            <code className="break-all">{origem}/api/auth/callback/facebook</code>.
          </p>
        </Cartao>
      ) : (
        <Cartao
          titulo="1. App da Meta"
          descricao="O código de instalação está no .env do servidor (SETUP_TOKEN). App ID e App Secret ficam em Meta for Developers → Configurações do app → Básico."
        >
          <FormularioSetup />
        </Cartao>
      )}
    </main>
  );
}
