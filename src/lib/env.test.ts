import { describe, expect, it } from "vitest";
import { lerEnv } from "./env";

describe("lerEnv", () => {
  it("aceita a configuração mínima e aplica os padrões", () => {
    const e = lerEnv({ DATABASE_URL: "postgres://u:s@localhost:5432/db" });
    expect(e.APP_VERSION).toBe("dev");
    expect(e.HEARTBEAT_FILE).toBe("/tmp/worker-heartbeat");
  });

  it("recusa DATABASE_URL ausente ou de outro protocolo, sem ecoar o valor", () => {
    expect(() => lerEnv({})).toThrow(/DATABASE_URL/);
    expect(() => lerEnv({ DATABASE_URL: "mysql://u:segredo@h/db" })).toThrow(/postgres/);
    expect(() => lerEnv({ DATABASE_URL: "mysql://u:segredo@h/db" })).not.toThrow(/segredo/);
  });
});
