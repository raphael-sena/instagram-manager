import { describe, expect, it } from "vitest";
import { cookieSetupValido, criarCookieSetup, decidirLogin, VALIDADE_SETUP_MS } from "./acesso";

const segredo = "s".repeat(32);

describe("cookie do setup", () => {
  it("vale até expirar e só com a assinatura certa", () => {
    const c = criarCookieSetup(1000, segredo);
    expect(cookieSetupValido(c, 1000, segredo)).toBe(true);
    expect(cookieSetupValido(c, 1000 + VALIDADE_SETUP_MS + 1, segredo)).toBe(false);
    expect(cookieSetupValido(c, 1000, "outro-segredo-".repeat(3))).toBe(false);
    const [expira, assinatura] = c.split(".");
    expect(cookieSetupValido(`${Number(expira) + 99999}.${assinatura}`, 1000, segredo)).toBe(false);
    expect(cookieSetupValido(undefined, 1000, segredo)).toBe(false);
    expect(cookieSetupValido("lixo", 1000, segredo)).toBe(false);
  });
});

describe("decidirLogin", () => {
  const cfg = { "auth.facebook_user_id": "111", "auth.admin_email": "Admin@Exemplo.com" };

  it("Facebook: só o ID autorizado", () => {
    expect(decidirLogin({ provedor: "facebook", idNoProvedor: "111" }, cfg, false)).toEqual({ permitido: true });
    expect(decidirLogin({ provedor: "facebook", idNoProvedor: "222" }, cfg, true)).toEqual({ permitido: false });
  });

  it("primeiro acesso: vincula o ID só com o setup pendente neste navegador", () => {
    expect(decidirLogin({ provedor: "facebook", idNoProvedor: "333" }, {}, true)).toEqual({
      permitido: true,
      vincularFacebook: "333",
    });
    expect(decidirLogin({ provedor: "facebook", idNoProvedor: "333" }, {}, false)).toEqual({ permitido: false });
  });

  it("link mágico: só o e-mail do admin, sem diferenciar maiúsculas", () => {
    expect(decidirLogin({ provedor: "resend", email: " admin@exemplo.COM " }, cfg, false).permitido).toBe(true);
    expect(decidirLogin({ provedor: "resend", email: "outro@exemplo.com" }, cfg, false).permitido).toBe(false);
    expect(decidirLogin({ provedor: "resend", email: "admin@exemplo.com" }, {}, false).permitido).toBe(false);
  });

  it("provedor desconhecido ou sem identificação: negado", () => {
    expect(decidirLogin({ provedor: "google", idNoProvedor: "111" }, cfg, true).permitido).toBe(false);
    expect(decidirLogin({ provedor: "facebook" }, cfg, true).permitido).toBe(false);
  });
});
