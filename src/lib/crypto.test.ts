import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { assinar, cifrar, decifrar, iguais } from "./crypto";

const chave = randomBytes(32);

describe("cifrar/decifrar", () => {
  it("ida e volta, com IV novo a cada vez", () => {
    const a = cifrar("token-secreto", "meta.app_secret", chave);
    const b = cifrar("token-secreto", "meta.app_secret", chave);
    expect(a).not.toBe(b);
    expect(a).not.toContain("token-secreto");
    expect(decifrar(a, "meta.app_secret", chave)).toBe("token-secreto");
  });

  it("recusa outra chave, outro contexto ou valor adulterado", () => {
    const c = cifrar("valor", "r2.secret_access_key", chave);
    expect(() => decifrar(c, "r2.secret_access_key", randomBytes(32))).toThrow();
    expect(() => decifrar(c, "resend.api_key", chave)).toThrow();
    const partes = c.split(".");
    partes[3] = Buffer.from("outro").toString("base64url");
    expect(() => decifrar(partes.join("."), "r2.secret_access_key", chave)).toThrow();
    expect(() => decifrar("lixo", "r2.secret_access_key", chave)).toThrow(/formato/);
  });

  it("aceita texto vazio e unicode", () => {
    expect(decifrar(cifrar("", "x", chave), "x", chave)).toBe("");
    expect(decifrar(cifrar("ação ✓", "x", chave), "x", chave)).toBe("ação ✓");
  });
});

describe("iguais/assinar", () => {
  it("compara em tempo constante e lida com tamanhos diferentes", () => {
    expect(iguais("abc", "abc")).toBe(true);
    expect(iguais("abc", "abd")).toBe(false);
    expect(iguais("abc", "abcd")).toBe(false);
  });

  it("assinatura depende do segredo", () => {
    expect(assinar("x", "s1")).toBe(assinar("x", "s1"));
    expect(assinar("x", "s1")).not.toBe(assinar("x", "s2"));
  });
});
