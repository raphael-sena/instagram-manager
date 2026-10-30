// Acesso direto ao banco nos testes E2E: limpar o estado e criar uma sessão sem passar pelo Facebook.
import { randomUUID } from "node:crypto";
import type { BrowserContext } from "@playwright/test";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export async function limparBanco() {
  await pool.query("delete from auth_sessao; delete from auth_conta; delete from auth_usuario; delete from configuracao; delete from auditoria;");
}

/** Cria usuário + sessão no banco e põe o cookie no navegador (equivale a ter entrado). */
export async function entrarComoAdmin(contexto: BrowserContext) {
  const usuario = randomUUID();
  const token = randomUUID();
  await pool.query("insert into auth_usuario (id, name) values ($1, 'Admin E2E')", [usuario]);
  await pool.query("insert into auth_sessao (session_token, user_id, expires) values ($1, $2, now() + interval '1 day')", [
    token,
    usuario,
  ]);
  await contexto.addCookies([{ name: "authjs.session-token", value: token, url: "http://localhost:3997" }]);
}

export const fecharBanco = () => pool.end();
