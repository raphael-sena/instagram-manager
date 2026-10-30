// Prova de conceito da fase 0 (docs/07-plano-de-implementacao.md).
// Publica SÓ na conta de teste (IG_USERNAME_TESTE) e responde às perguntas abertas sobre a API.
//
//   pnpm start                       todos os testes
//   pnpm start --so imagem,reels     só alguns (imagem, carrossel, reels, story-imagem, story-video)
//   pnpm start --manter              não apaga os posts publicados no fim
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Graph, GraphError } from "./graph.js";
import { gerarMidias } from "./midias.js";
import { R2 } from "./r2.js";

const TESTES = ["imagem", "carrossel", "reels", "story-imagem", "story-video"] as const;
type Teste = (typeof TESTES)[number];

const PERMISSOES = ["instagram_basic", "instagram_content_publish", "pages_show_list", "pages_read_engagement", "business_management"];

// ── configuração ──────────────────────────────────────────────────────────────
function env(nome: string): string {
  const v = process.env[nome]?.trim();
  if (!v) {
    console.error(`Falta ${nome} no poc/.env (veja poc/.env.example).`);
    process.exit(1);
  }
  return v;
}

const argv = process.argv.slice(2);
const so = argv.includes("--so") ? argv[argv.indexOf("--so") + 1]?.split(",") : undefined;
const testes = TESTES.filter((t) => !so || so.includes(t));
const manter = argv.includes("--manter");

const token = env("META_SYSTEM_USER_TOKEN");
const graph = new Graph(token, env("META_APP_SECRET"), process.env.META_GRAPH_VERSION?.trim() || "v26.0");
const r2 = new R2(env("R2_ACCOUNT_ID"), env("R2_ACCESS_KEY_ID"), env("R2_SECRET_ACCESS_KEY"), env("R2_BUCKET"));
const usernameTeste = env("IG_USERNAME_TESTE").replace(/^@/, "").toLowerCase();
const appId = env("META_APP_ID");

// ── relatório ─────────────────────────────────────────────────────────────────
interface ResultadoTeste {
  teste: Teste;
  ok: boolean;
  etapas: string[];
  containerId?: string;
  statusFinal?: string;
  mediaId?: string;
  permalink?: string;
  mediaProductType?: string;
  segundos?: number;
  erro?: string;
  apagado?: string;
}

const relatorio = {
  executado_em: new Date().toISOString(),
  versao_graph: process.env.META_GRAPH_VERSION?.trim() || "v26.0",
  token: {} as Record<string, unknown>,
  contas_alcancadas: [] as string[],
  limite_publicacao: {} as Record<string, unknown>,
  testes: [] as ResultadoTeste[],
  republicar_mesmo_container: {} as Record<string, unknown>,
  respostas: {} as Record<string, string>,
};

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
const marcador = `[teste instagram-manager ${relatorio.executado_em}]`;

// ── API ───────────────────────────────────────────────────────────────────────
async function criarContainer(igId: string, params: Record<string, string>): Promise<string> {
  const { id } = await graph.post<{ id: string }>(`${igId}/media`, params);
  return id;
}

/** Consulta o container até sair de IN_PROGRESS (a cada 10 s, por até 5 min). */
async function aguardar(containerId: string): Promise<{ status_code: string; status?: string }> {
  for (let i = 0; i < 30; i++) {
    const s = await graph.get<{ status_code: string; status?: string }>(containerId, { fields: "status_code,status" });
    if (s.status_code !== "IN_PROGRESS") return s;
    await esperar(10_000);
  }
  return { status_code: "TEMPO_ESGOTADO" };
}

async function executar(igId: string, teste: Teste, url: (k: string) => string): Promise<ResultadoTeste> {
  const r: ResultadoTeste = { teste, ok: false, etapas: [] };
  const inicio = Date.now();
  const legenda = `${marcador} ${teste}`;
  try {
    let containerId: string;
    if (teste === "carrossel") {
      const filhos: string[] = [];
      for (const [k, params] of [
        ["feed1", { image_url: url("feed1") }],
        ["feed2", { image_url: url("feed2") }],
        ["videoFeed", { media_type: "VIDEO", video_url: url("videoFeed") }],
      ] as const) {
        const id = await criarContainer(igId, { ...params, is_carousel_item: "true" });
        const s = await aguardar(id);
        r.etapas.push(`filho ${k}: ${s.status_code}`);
        if (s.status_code !== "FINISHED") throw new Error(`filho ${k} terminou em ${s.status_code}: ${s.status ?? ""}`);
        filhos.push(id);
      }
      containerId = await criarContainer(igId, { media_type: "CAROUSEL", children: filhos.join(","), caption: legenda });
    } else {
      const params: Record<string, Record<string, string>> = {
        imagem: { image_url: url("feed1"), caption: legenda, alt_text: "Imagem de teste" },
        reels: { media_type: "REELS", video_url: url("reels"), caption: legenda, share_to_feed: "true" },
        "story-imagem": { media_type: "STORIES", image_url: url("story") },
        "story-video": { media_type: "STORIES", video_url: url("reels") },
      };
      containerId = await criarContainer(igId, params[teste]);
    }
    r.containerId = containerId;
    r.etapas.push("container criado");

    const s = await aguardar(containerId);
    r.statusFinal = s.status_code;
    r.etapas.push(`status: ${s.status_code}`);
    if (s.status_code !== "FINISHED") throw new Error(`container terminou em ${s.status_code}: ${s.status ?? ""}`);

    const { id: mediaId } = await graph.post<{ id: string }>(`${igId}/media_publish`, { creation_id: containerId });
    r.mediaId = mediaId;
    r.etapas.push("publicado");

    const d = await graph.get<{ permalink?: string; media_product_type?: string }>(mediaId, {
      fields: "permalink,media_type,media_product_type,timestamp",
    });
    r.permalink = d.permalink;
    r.mediaProductType = d.media_product_type;
    r.ok = true;
  } catch (e) {
    r.erro = msg(e);
  }
  r.segundos = Math.round((Date.now() - inicio) / 1000);
  return r;
}

/** Chama media_publish de novo com o mesmo container: duplica, dá erro ou devolve o mesmo post? */
async function testarRepublicacao(igId: string, imagem: ResultadoTeste) {
  const out: Record<string, unknown> = {};
  try {
    const { id } = await graph.post<{ id: string }>(`${igId}/media_publish`, { creation_id: imagem.containerId! });
    out.segunda_chamada = id === imagem.mediaId ? "devolveu o MESMO media_id" : `devolveu OUTRO media_id (${id})`;
    out.segundo_media_id = id;
  } catch (e) {
    out.segunda_chamada = `erro: ${msg(e)}`;
  }
  const s = await graph.get<{ status_code: string }>(imagem.containerId!, { fields: "status_code" });
  out.status_container_depois = s.status_code;
  const recentes = await graph.get<{ data: { id: string; caption?: string }[] }>(`${igId}/media`, { fields: "id,caption", limit: "10" });
  out.posts_com_a_legenda = recentes.data.filter((m) => m.caption?.includes(`${marcador} imagem`)).length;
  return out;
}

// ── roteiro ───────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Prova de conceito · Graph ${relatorio.versao_graph} · testes: ${testes.join(", ")}\n`);

  // 1) token
  const dbg = await graph.get<{ data: Record<string, unknown> & { scopes?: string[] } }>("debug_token", { input_token: token });
  const d = dbg.data;
  const faltando = PERMISSOES.filter((p) => !d.scopes?.includes(p));
  relatorio.token = {
    valido: d.is_valid,
    tipo: d.type,
    app_confere: d.app_id === appId,
    expira_em: d.expires_at === 0 ? "nunca" : d.expires_at,
    permissoes: d.scopes,
    permissoes_faltando: faltando,
  };
  console.log("Token:", relatorio.token);
  if (!d.is_valid) throw new Error("Token inválido.");

  // 2) contas alcançadas pelo token
  const paginas = await graph.get<{ data: { name: string; instagram_business_account?: { id: string; username: string } }[] }>(
    "me/accounts",
    { fields: "name,instagram_business_account{id,username}", limit: "100" },
  );
  const contas = paginas.data.flatMap((p) => (p.instagram_business_account ? [p.instagram_business_account] : []));
  relatorio.contas_alcancadas = contas.map((c) => `@${c.username}`);
  console.log(`Páginas: ${paginas.data.length} · contas do Instagram: ${relatorio.contas_alcancadas.join(", ") || "nenhuma"}`);
  const conta = contas.find((c) => c.username.toLowerCase() === usernameTeste);
  if (!conta) throw new Error(`O token não alcança @${usernameTeste}. Confira a etapa C do guia (atribuir ativos ao System User).`);
  if (contas.length > 1) console.warn(`AVISO: o token alcança ${contas.length} contas. Publicando só em @${conta.username}.`);

  // 3) limite de publicação
  relatorio.limite_publicacao = await graph.get(`${conta.id}/content_publishing_limit`, { fields: "config,quota_usage" });
  console.log("Limite de publicação:", JSON.stringify(relatorio.limite_publicacao));

  // 4) mídias → R2 → URLs pré-assinadas
  const arquivos = await gerarMidias();
  const chaves: Record<string, string> = {};
  const urls: Record<string, string> = {};
  try {
    for (const [k, caminho] of Object.entries(arquivos)) {
      chaves[k] = await r2.enviar(caminho);
      urls[k] = await r2.urlLeitura(chaves[k]);
    }
    console.log(`Mídias enviadas ao R2: ${Object.keys(chaves).length}\n`);

    // 5) publicações
    for (const t of testes) {
      process.stdout.write(`→ ${t}… `);
      const r = await executar(conta.id, t, (k) => urls[k]);
      relatorio.testes.push(r);
      console.log(r.ok ? `ok (${r.segundos}s) ${r.permalink ?? ""}` : `FALHOU (${r.segundos}s): ${r.erro}`);
    }

    const imagem = relatorio.testes.find((r) => r.teste === "imagem" && r.ok);
    if (imagem) {
      relatorio.republicar_mesmo_container = await testarRepublicacao(conta.id, imagem);
      console.log("\nRepublicar o mesmo container:", relatorio.republicar_mesmo_container);
    }
  } finally {
    for (const chave of Object.values(chaves)) await r2.apagar(chave).catch(() => {});
  }

  // 6) limpeza dos posts
  if (!manter) {
    const ids = relatorio.testes.filter((r) => r.mediaId).map((r) => r);
    const extra = relatorio.republicar_mesmo_container.segundo_media_id as string | undefined;
    for (const r of ids) {
      try {
        await graph.delete(r.mediaId!);
        r.apagado = "sim";
      } catch (e) {
        r.apagado = `não (${msg(e)})`;
      }
    }
    if (extra && !ids.some((r) => r.mediaId === extra)) await graph.delete(extra).catch(() => {});
  }

  // 7) respostas às perguntas da fase 0
  const algumOk = relatorio.testes.some((r) => r.ok);
  const erroDownload = relatorio.testes.find((r) => /download|fetch|url|media/i.test(r.erro ?? ""));
  relatorio.respostas = {
    "System User em modo desenvolvimento": algumOk ? "funciona (publicou)" : "não confirmado: nenhuma publicação deu certo",
    "URL pré-assinada do R2": algumOk ? "aceita" : erroDownload ? `possivelmente recusada: ${erroDownload.erro}` : "não confirmado",
    "Limite de publicação (24 h)": JSON.stringify(relatorio.limite_publicacao),
    "Republicar o mesmo container": String(relatorio.republicar_mesmo_container.segunda_chamada ?? "não testado"),
    "Apagar post pela API": relatorio.testes.find((r) => r.apagado)?.apagado ?? (manter ? "não testado (--manter)" : "não testado"),
  };
}

const pastaSaida = fileURLToPath(new URL("../saida", import.meta.url));
try {
  await main();
} catch (e) {
  relatorio.respostas.erro_geral = msg(e);
  console.error("\nERRO:", msg(e));
  if (e instanceof GraphError) console.error(JSON.stringify(e.corpo, null, 2));
  process.exitCode = 1;
} finally {
  mkdirSync(pastaSaida, { recursive: true });
  const arquivo = `${pastaSaida}/resultado-${relatorio.executado_em.replace(/[:.]/g, "-")}.json`;
  writeFileSync(arquivo, JSON.stringify({ ...relatorio, chamadas: graph.chamadas }, null, 2));
  console.log("\n══ Respostas ══");
  for (const [p, r] of Object.entries(relatorio.respostas)) console.log(`• ${p}: ${r}`);
  console.log(`\nRelatório completo (sem segredos): ${arquivo}`);
  console.log("Me mande a saída acima e, se eu pedir, o arquivo de relatório.");
}
