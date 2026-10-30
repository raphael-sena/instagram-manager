import { avaliarWorker } from "@/core/saude";
import { db } from "@/db";
import { workerHeartbeat } from "@/db/schema";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/** 200 enquanto o banco responde (o healthcheck do container depende disso); o estado do worker é informativo. */
export async function GET() {
  try {
    const [hb] = await db().select().from(workerHeartbeat).limit(1);
    return Response.json({ status: "ok", versao: env().APP_VERSION, banco: "ok", worker: avaliarWorker(hb?.vistoEm) });
  } catch (e) {
    console.error("[health]", e);
    return Response.json({ status: "erro", banco: "erro" }, { status: 503 });
  }
}
