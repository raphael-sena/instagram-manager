// Envio de e-mail pela API do Resend (sem SDK: uma chamada HTTP).
export interface ConfigEmail {
  apiKey: string;
  remetente: string;
}

export async function enviarEmail(cfg: ConfigEmail, para: string, assunto: string, texto: string): Promise<void> {
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: cfg.remetente, to: [para], subject: assunto, text: texto }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!resp.ok) {
    const corpo = (await resp.json().catch(() => ({}))) as { message?: string };
    throw new Error(`Resend respondeu ${resp.status}: ${corpo.message ?? "erro desconhecido"}`);
  }
}
