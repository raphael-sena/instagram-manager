import { expect, test } from "@playwright/test";
import { entrarComoAdmin, fecharBanco, limparBanco } from "./banco";

const SETUP_TOKEN = process.env.SETUP_TOKEN!;
const APP_ID = "1234567890";
const APP_SECRET = "0123456789abcdef0123456789abcdef";

test.beforeEach(async () => {
  await limparBanco();
});
test.afterAll(async () => {
  await fecharBanco();
});

test("primeiro acesso: código errado é recusado; código certo leva ao login com Facebook do app cadastrado", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/setup$/);

  await page.getByLabel("Código de instalação").fill("codigo-errado");
  await page.getByLabel("App ID da Meta").fill(APP_ID);
  await page.getByLabel("App Secret da Meta").fill(APP_SECRET);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("Código de instalação incorreto.")).toBeVisible();

  await page.getByLabel("Código de instalação").fill(SETUP_TOKEN);
  await page.getByLabel("App ID da Meta").fill(APP_ID);
  await page.getByLabel("App Secret da Meta").fill(APP_SECRET);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "2. Entre com o seu Facebook" })).toBeVisible();
  await expect(page.getByText("/api/auth/callback/facebook")).toBeVisible();

  // o clique leva ao diálogo OAuth do Facebook: interceptado, só conferimos o endereço
  const dialogo = page.waitForRequest((r) => r.url().includes("facebook.com") && r.url().includes("oauth"));
  await page.route(/facebook\.com/, (r) => r.abort());
  await page.getByRole("button", { name: "Entrar com Facebook" }).click();
  const url = new URL((await dialogo).url());
  expect(url.searchParams.get("client_id")).toBe(APP_ID);
  expect(url.searchParams.get("redirect_uri")).toBe("http://localhost:3997/api/auth/callback/facebook");
});

test("sem sessão, o painel manda para o login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
});

test("painel: salva campos, mascara segredos, valida e testa", async ({ page, context }) => {
  await entrarComoAdmin(context);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Painel de admin" })).toBeVisible();
  await expect(page.getByText("Falta configurar:")).toBeVisible();

  const meta = page.locator("section", { has: page.getByRole("heading", { name: "Meta (Instagram)" }) });
  await meta.getByLabel("App ID").fill(APP_ID);
  await meta.getByLabel("App Secret").fill(APP_SECRET);
  await meta.getByRole("button", { name: "Salvar" }).click();
  await expect(meta.getByText("Salvo.")).toBeVisible();

  await page.reload();
  const metaDepois = page.locator("section", { has: page.getByRole("heading", { name: "Meta (Instagram)" }) });
  await expect(metaDepois.getByLabel("App ID")).toHaveValue(APP_ID);
  await expect(metaDepois.getByLabel("App Secret")).toHaveAttribute("placeholder", /••••cdef/);
  expect(await page.content()).not.toContain(APP_SECRET);

  // sem o token do System User, o teste diz o que falta (não chama a Meta)
  await metaDepois.getByRole("button", { name: "Testar conexão" }).click();
  await expect(metaDepois.getByText(/Preencha antes: meta.system_user_token/)).toBeVisible();

  const email = page.locator("section", { has: page.getByRole("heading", { name: "E-mail (Resend)" }) });
  await email.getByLabel("Remetente").fill("isso não é e-mail");
  await email.getByRole("button", { name: "Salvar" }).click();
  await expect(email.getByText(/Remetente: e-mail ou Nome/)).toBeVisible();

  const geral = page.locator("section", { has: page.getByRole("heading", { name: "Acesso e parâmetros" }) });
  await geral.getByLabel(/Publicações em paralelo/).fill("99");
  await geral.getByRole("button", { name: "Salvar" }).click();
  await expect(geral.getByText("Publicações em paralelo: máximo 50")).toBeVisible();

  await page.reload();
  await expect(page.getByText("config.alterada · meta.app_secret")).toHaveCount(1);
});
