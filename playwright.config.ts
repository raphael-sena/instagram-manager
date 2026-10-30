import { defineConfig, devices } from "@playwright/test";

// Testa o build de produção (pnpm build antes). Usa o banco do DATABASE_URL — em dev, o do docker-compose.dev.yml.
const PORTA = 3997;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${PORTA}`, trace: "retain-on-failure" },
  projects: [
    { name: "celular", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "node .next/standalone/server.js",
    url: `http://localhost:${PORTA}/api/health`,
    reuseExistingServer: !process.env.CI,
    env: { PORT: String(PORTA), AUTH_URL: `http://localhost:${PORTA}` },
  },
});
