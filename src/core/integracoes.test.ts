import { afterEach, describe, expect, it, vi } from "vitest";
import { ErroGraph } from "@/meta/graph";
import { explicarErroMeta, testarEmail, testarMeta, testarR2 } from "./integracoes";

afterEach(() => vi.unstubAllGlobals());

const metaOk = { "meta.app_id": "42", "meta.app_secret": "segredo", "meta.system_user_token": "TOKEN-SECRETO" };

function respostas(...corpos: unknown[]) {
  const fila = [...corpos];
  return vi.fn(async () => new Response(JSON.stringify(fila.shift()), { status: 200 }));
}

describe("testarMeta", () => {
  it("pede os campos que faltam", async () => {
    expect((await testarMeta({})).mensagem).toMatch(/meta.app_id/);
  });

  it("token válido com tudo certo", async () => {
    const fetch = respostas(
      { data: { is_valid: true, app_id: "42", type: "SYSTEM_USER", expires_at: 0, scopes: ["instagram_basic", "instagram_content_publish", "pages_show_list", "pages_read_engagement", "business_management"] } },
      { data: [{ instagram_business_account: { username: "teste" } }, {}] },
    );
    vi.stubGlobal("fetch", fetch);
    const r = await testarMeta(metaOk);
    expect(r.ok).toBe(true);
    expect(r.detalhes).toContain("Expira: nunca");
    expect(r.detalhes).toContain("Páginas: 2 · contas do Instagram: 1");
    // o token vai no cabeçalho; na URL só aparece como input_token do debug_token (exigência da API)
    for (const [url, init] of fetch.mock.calls as unknown as [URL, RequestInit][]) {
      expect(String(url)).not.toContain("access_token=");
      if (!String(url).includes("debug_token")) expect(String(url)).not.toContain("TOKEN-SECRETO");
      expect((init.headers as Record<string, string>).Authorization).toBe("Bearer TOKEN-SECRETO");
      expect(String(url)).toContain("appsecret_proof=");
    }
  });

  it("aponta permissões faltando e app diferente", async () => {
    vi.stubGlobal("fetch", respostas({ data: { is_valid: true, app_id: "99", scopes: ["instagram_basic"] } }, { data: [] }));
    const r = await testarMeta(metaOk);
    expect(r.ok).toBe(false);
    expect(r.detalhes?.join(" ")).toMatch(/outro app/);
    expect(r.detalhes?.join(" ")).toMatch(/instagram_content_publish/);
  });

  it("traduz token inválido", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: { code: 190, message: "x" } }), { status: 401 })));
    expect((await testarMeta(metaOk)).mensagem).toMatch(/Token inválido/);
  });
});

describe("explicarErroMeta", () => {
  it("limite de chamadas", () => {
    expect(explicarErroMeta(new ErroGraph(400, { error: { code: 4, message: "x" } }))).toMatch(/Limite/);
  });
});

describe("testarR2 / testarEmail", () => {
  it("pedem os campos que faltam", async () => {
    expect((await testarR2({})).ok).toBe(false);
    expect((await testarEmail({ "resend.api_key": "k", "email.remetente": "a@b.c" })).mensagem).toMatch(/avisos/);
  });

  it("e-mail: envia para o destinatário dos avisos e repassa erro do Resend", async () => {
    const fetch = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const cfg = { "resend.api_key": "k", "email.remetente": "Instagram <a@b.c>", "email.avisos": "eu@x.com" };
    expect(await testarEmail(cfg)).toMatchObject({ ok: true });
    expect(JSON.parse((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string).to).toEqual(["eu@x.com"]);

    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ message: "domínio não verificado" }), { status: 403 })));
    expect((await testarEmail(cfg)).mensagem).toMatch(/domínio não verificado/);
  });
});
