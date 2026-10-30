// Empacota os processos Node que rodam fora do Next (worker e migrations) em arquivos únicos em dist/.
import { build } from "esbuild";

await build({
  entryPoints: { worker: "src/worker/index.ts", migrate: "src/db/migrate.ts", "admin-reset": "src/db/admin-reset.ts" },
  outdir: "dist",
  outExtension: { ".js": ".mjs" },
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  sourcemap: true,
  // dependências CommonJS empacotadas em ESM ainda chamam require()
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  external: ["pg-native"],
  logLevel: "info",
});
