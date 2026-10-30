import { exigirSessao, signOut } from "@/auth";
import { estiloBotaoSecundario } from "../ui";

export const dynamic = "force-dynamic";

export default async function Painel({ children }: { children: React.ReactNode }) {
  const sessao = await exigirSessao();

  async function sair() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="min-h-dvh bg-neutral-50 dark:bg-neutral-950">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <span className="font-semibold">Instagram Manager</span>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-neutral-500 sm:inline">{sessao.user?.name ?? sessao.user?.email}</span>
            <form action={sair}>
              <button className={estiloBotaoSecundario}>Sair</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
