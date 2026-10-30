import { describe, expect, it } from "vitest";
import { LimiteTentativas } from "./limite";

describe("LimiteTentativas", () => {
  it("bloqueia depois do máximo e libera quando a janela passa", () => {
    const l = new LimiteTentativas(2, 1000);
    expect(l.tentar("a", 0)).toBe(true);
    expect(l.tentar("a", 10)).toBe(true);
    expect(l.tentar("a", 20)).toBe(false);
    expect(l.tentar("b", 20)).toBe(true);
    expect(l.tentar("a", 1011)).toBe(true);
  });
});
