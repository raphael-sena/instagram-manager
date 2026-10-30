import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { lerConfig } from "@/core/config";
import { Aviso, Cartao, estiloBotao, estiloBotaoSecundario, estiloCampo } from "../ui";

export const dynamic = "force-dynamic";

const ERROS: Record<string, string> = {
  negado: "Esta conta do Facebook não tem acesso ao sistema.",
  Verification: "O link expirou ou já foi usado. Peça um novo.",
};

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (await auth()) redirect("/admin");
  const { enviado, erro } = await searchParams;
  const cfg = await lerConfig();
  const comFacebook = !!(cfg["meta.app_id"] && cfg["meta.app_secret"]);
  const comEmail = !!(cfg["resend.api_key"] && cfg["email.remetente"] && cfg["auth.admin_email"]);

  async function entrarFacebook() {
    "use server";
    await signIn("facebook", { redirectTo: "/admin" });
  }

  async function pedirLink(dados: FormData) {
    "use server";
    await signIn("resend", { email: String(dados.get("email") ?? ""), redirectTo: "/admin" });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">Instagram Manager</h1>
      {enviado && <Aviso tipo="ok">Se o e-mail estiver autorizado, o link chega em instantes. Ele vale por 15 minutos.</Aviso>}
      {erro && <Aviso tipo="erro">{ERROS[erro] ?? "Não foi possível entrar. Tente de novo."}</Aviso>}

      {!comFacebook && !comEmail ? (
        <Aviso>
          O sistema ainda não foi configurado. Faça o <Link className="underline" href="/setup">primeiro acesso</Link>.
        </Aviso>
      ) : (
        <Cartao titulo="Entrar">
          <div className="flex flex-col gap-4">
            {comFacebook && (
              <form action={entrarFacebook}>
                <button className={`${estiloBotao} w-full`}>Entrar com Facebook</button>
              </form>
            )}
            {comEmail && (
              <form action={pedirLink} className="flex flex-col gap-2">
                <label htmlFor="email" className="text-sm text-neutral-600 dark:text-neutral-400">
                  {comFacebook ? "Ou receba um link de acesso por e-mail" : "Receba um link de acesso por e-mail"}
                </label>
                <input id="email" name="email" type="email" required autoComplete="email" className={estiloCampo} />
                <button className={estiloBotaoSecundario}>Enviar link</button>
              </form>
            )}
          </div>
        </Cartao>
      )}
    </main>
  );
}
