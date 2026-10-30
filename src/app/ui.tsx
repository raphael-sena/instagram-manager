// Peças visuais compartilhadas (sem biblioteca de componentes por enquanto).
export function Cartao({ titulo, descricao, children }: { titulo: string; descricao?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-base font-semibold">{titulo}</h2>
      {descricao && <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{descricao}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export const estiloCampo =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:ring-neutral-800";

export const estiloBotao =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200";

export const estiloBotaoSecundario =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800";

export function Aviso({ tipo = "info", children }: { tipo?: "info" | "erro" | "ok"; children: React.ReactNode }) {
  const cores = {
    info: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100",
    erro: "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
    ok: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100",
  };
  return <div className={`rounded-lg border px-3 py-2 text-sm ${cores[tipo]}`}>{children}</div>;
}
