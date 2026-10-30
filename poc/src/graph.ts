// Cliente mínimo da Graph API para a prova de conceito.
// O token vai no cabeçalho Authorization e nunca é impresso; cada chamada leva o appsecret_proof.
import { createHmac } from "node:crypto";

export class GraphError extends Error {
  constructor(
    readonly httpStatus: number,
    readonly corpo: unknown,
  ) {
    const e = (corpo as { error?: { message?: string; code?: number; error_subcode?: number } })?.error;
    super(`HTTP ${httpStatus} · código ${e?.code ?? "?"}/${e?.error_subcode ?? "-"} · ${e?.message ?? JSON.stringify(corpo)}`);
  }
}

export interface ChamadaRegistrada {
  metodo: string;
  caminho: string;
  httpStatus: number;
  ms: number;
  resposta: unknown;
}

export class Graph {
  readonly chamadas: ChamadaRegistrada[] = [];
  private readonly base: string;
  private readonly prova: string;

  constructor(
    private readonly token: string,
    appSecret: string,
    versao: string,
  ) {
    this.base = `https://graph.facebook.com/${versao}`;
    this.prova = createHmac("sha256", appSecret).update(token).digest("hex");
  }

  get<T>(caminho: string, params: Record<string, string> = {}) {
    return this.chamar<T>("GET", caminho, params);
  }

  post<T>(caminho: string, params: Record<string, string> = {}) {
    return this.chamar<T>("POST", caminho, params);
  }

  delete<T>(caminho: string) {
    return this.chamar<T>("DELETE", caminho, {});
  }

  private async chamar<T>(metodo: string, caminho: string, params: Record<string, string>): Promise<T> {
    const url = new URL(`${this.base}/${caminho.replace(/^\//, "")}`);
    url.searchParams.set("appsecret_proof", this.prova);
    let corpo: URLSearchParams | undefined;
    if (metodo === "GET") {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    } else {
      corpo = new URLSearchParams(params);
    }

    const inicio = Date.now();
    const resp = await fetch(url, { method: metodo, headers: { Authorization: `Bearer ${this.token}` }, body: corpo });
    const texto = await resp.text();
    let json: unknown;
    try {
      json = JSON.parse(texto);
    } catch {
      json = { texto };
    }
    this.chamadas.push({ metodo, caminho: caminho.split("?")[0], httpStatus: resp.status, ms: Date.now() - inicio, resposta: json });
    if (!resp.ok) throw new GraphError(resp.status, json);
    return json as T;
  }
}
