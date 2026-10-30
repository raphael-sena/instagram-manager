// Gera as mídias de teste com o ffmpeg, já dentro das especificações da Meta (docs/04-integracao-meta.md).
// Uso direto: pnpm midias
import { execFile } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const exec = promisify(execFile);
export const PASTA_MIDIAS = fileURLToPath(new URL("../midias", import.meta.url));

export const MIDIAS = {
  feed1: "feed-1.jpg", // 1080x1350 (4:5)
  feed2: "feed-2.jpg",
  story: "story.jpg", // 1080x1920 (9:16)
  reels: "reels.mp4", // 1080x1920, 6 s
  videoFeed: "video-feed.mp4", // 1080x1350, 4 s (item de carrossel)
} as const;

const VIDEO = [
  "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", "30", "-g", "30",
  "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart",
];

async function ffmpeg(args: string[]) {
  await exec("ffmpeg", ["-y", "-loglevel", "error", ...args]);
}

export async function gerarMidias(): Promise<Record<keyof typeof MIDIAS, string>> {
  mkdirSync(PASTA_MIDIAS, { recursive: true });
  const caminho = (k: keyof typeof MIDIAS) => join(PASTA_MIDIAS, MIDIAS[k]);
  const falta = (k: keyof typeof MIDIAS) => !existsSync(caminho(k));

  if (falta("feed1")) await ffmpeg(["-f", "lavfi", "-i", "testsrc2=size=1080x1350", "-frames:v", "1", "-q:v", "2", caminho("feed1")]);
  if (falta("feed2"))
    await ffmpeg(["-f", "lavfi", "-i", "smptehdbars=size=1080x1350", "-frames:v", "1", "-q:v", "2", caminho("feed2")]);
  if (falta("story")) await ffmpeg(["-f", "lavfi", "-i", "testsrc2=size=1080x1920", "-frames:v", "1", "-q:v", "2", caminho("story")]);
  if (falta("reels"))
    await ffmpeg([
      "-f", "lavfi", "-i", "testsrc2=size=1080x1920:rate=30",
      "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000",
      "-t", "6", ...VIDEO, caminho("reels"),
    ]);
  if (falta("videoFeed"))
    await ffmpeg([
      "-f", "lavfi", "-i", "testsrc2=size=1080x1350:rate=30",
      "-f", "lavfi", "-i", "sine=frequency=660:sample_rate=48000",
      "-t", "4", ...VIDEO, caminho("videoFeed"),
    ]);

  return Object.fromEntries(Object.keys(MIDIAS).map((k) => [k, caminho(k as keyof typeof MIDIAS)])) as Record<
    keyof typeof MIDIAS,
    string
  >;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arquivos = await gerarMidias();
  console.log("Mídias em", PASTA_MIDIAS, arquivos);
}
