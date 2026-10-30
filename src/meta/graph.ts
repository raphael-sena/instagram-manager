// Cliente da Graph API. O token vai no cabeçalho Authorization (nunca em log) e cada chamada leva o appsecret_proof.
// Versão fixada: revisar a cada nova versão da Graph API (docs/04).
import { createHmac } from "node:crypto";

export const VERSAO_GRAPH = "v26.0";

export class ErroGraph extends Error {
  readonly codigo?: number;
  readonly subcodigo?: number;

  constructor(
    readonly httpStatus: number,
    readonly corpo: unknown,
  ) {
    const e = (corpo as { error?: { message?: string; code?: number; error_subcode?: number } })?.error;
    super(e?.message ?? `HTTP ${httpStatus}`);
    this.codigo = e?.code;
    this.subcodigo = e?.error_subcode;
  }
}

export class Graph {
  private readonly prova: string;

  constructor(
    private readonly token: string,
    appSecret: string,
    private readonly base = `https://graph.facebook.com/${VERSAO_GRAPH}`,
  ) {
    this.prova = createHmac("sha256", appSecret).update(token).digest("hex");
  }

  get<T>(caminho: string, params: Record<string, string> = {}) {
    return this.chamar<T>("GET", caminho, params);
  }

  post<T>(caminho: string, params: Record<string, string> = {}) {
    return this.chamar<T>("POST", caminho, params);
  }

  private async chamar<T>(metodo: "GET" | "POST", caminho: string, params: Record<string, string>): Promise<T> {
    const url = new URL(`${this.base}/${caminho.replace(/^\//, "")}`);
    url.searchParams.set("appsecret_proof", this.prova);
    if (metodo === "GET") for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const resp = await fetch(url, {
      method: metodo,
      headers: { Authorization: `Bearer ${this.token}` },
      body: metodo === "POST" ? new URLSearchParams(params) : undefined,
      signal: AbortSignal.timeout(30_000),
    });
    const texto = await resp.text();
    let json: unknown;
    try {
      json = JSON.parse(texto);
    } catch {
      json = { texto };
    }
    if (!resp.ok) throw new ErroGraph(resp.status, json);
    return json as T;
  }
}
