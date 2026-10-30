import { describe, expect, it } from "vitest";
import { lerEnv, lerEnvWeb } from "./env";

const minimo = {
  DATABASE_URL: "postgres://u:s@localhost:5432/db",
  APP_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
};
const minimoWeb = { ...minimo, AUTH_SECRET: "a".repeat(32), SETUP_TOKEN: "s".repeat(24) };

describe("lerEnv (worker e web)", () => {
  it("aceita a configuração mínima e aplica os padrões", () => {
    const e = lerEnv(minimo);
    expect(e.APP_VERSION).toBe("dev");
    expect(e.HEARTBEAT_FILE).toBe("/tmp/worker-heartbeat");
  });

  it("recusa DATABASE_URL ausente ou de outro protocolo, sem ecoar o valor", () => {
    expect(() => lerEnv({ ...minimo, DATABASE_URL: undefined })).toThrow(/DATABASE_URL/);
    expect(() => lerEnv({ ...minimo, DATABASE_URL: "mysql://u:segredo@h/db" })).toThrow(/postgres/);
    expect(() => lerEnv({ ...minimo, DATABASE_URL: "mysql://u:segredo@h/db" })).not.toThrow(/segredo/);
  });

  it("exige chave-mestra de 32 bytes", () => {
    expect(() => lerEnv({ ...minimo, APP_ENCRYPTION_KEY: Buffer.alloc(16).toString("base64") })).toThrow(/32 bytes/);
  });
});

describe("lerEnvWeb", () => {
  it("exige os segredos de login só no web", () => {
    expect(() => lerEnv(minimo)).not.toThrow();
    expect(lerEnvWeb(minimoWeb).SETUP_TOKEN).toHaveLength(24);
    expect(() => lerEnvWeb(minimo)).toThrow(/AUTH_SECRET/);
    expect(() => lerEnvWeb({ ...minimoWeb, SETUP_TOKEN: "curto" })).toThrow(/SETUP_TOKEN/);
  });
});
