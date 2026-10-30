import { describe, expect, it } from "vitest";
import { avaliarWorker, LIMITE_HEARTBEAT_MS } from "./saude";

describe("avaliarWorker", () => {
  const agora = new Date("2026-10-30T12:00:00Z");

  it("sem heartbeat: nunca_visto", () => {
    expect(avaliarWorker(null, agora)).toBe("nunca_visto");
  });

  it("dentro do limite: ok (inclusive no limite exato)", () => {
    expect(avaliarWorker(new Date(agora.getTime() - 30_000), agora)).toBe("ok");
    expect(avaliarWorker(new Date(agora.getTime() - LIMITE_HEARTBEAT_MS), agora)).toBe("ok");
  });

  it("além do limite: atrasado", () => {
    expect(avaliarWorker(new Date(agora.getTime() - LIMITE_HEARTBEAT_MS - 1), agora)).toBe("atrasado");
  });
});
