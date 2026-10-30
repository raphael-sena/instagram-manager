import { describe, expect, it } from "vitest";
import { paraTela } from "./config";

describe("paraTela", () => {
  it("mostra valores comuns e mascara segredos", () => {
    expect(paraTela("meta.app_id", "123")).toEqual({ definido: true, exibicao: "123" });
    expect(paraTela("meta.app_secret", "abcdefghijkl1234")).toEqual({ definido: true, exibicao: "••••1234" });
  });

  it("segredo curto não revela nenhum caractere", () => {
    expect(paraTela("resend.api_key", "abc").exibicao).toBe("••••");
  });

  it("vazio = não definido", () => {
    expect(paraTela("meta.app_secret", undefined)).toEqual({ definido: false, exibicao: "" });
    expect(paraTela("meta.app_id", "")).toEqual({ definido: false, exibicao: "" });
  });
});
