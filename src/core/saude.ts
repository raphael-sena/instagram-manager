/** O worker grava o heartbeat a cada minuto; três minutos sem sinal significa que ele parou. */
export const LIMITE_HEARTBEAT_MS = 3 * 60_000;

export type EstadoWorker = "ok" | "atrasado" | "nunca_visto";

export function avaliarWorker(vistoEm: Date | null | undefined, agora: Date = new Date()): EstadoWorker {
  if (!vistoEm) return "nunca_visto";
  return agora.getTime() - vistoEm.getTime() <= LIMITE_HEARTBEAT_MS ? "ok" : "atrasado";
}
