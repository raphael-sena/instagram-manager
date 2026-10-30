// Login (RF12): "Entrar com Facebook" + link mágico por e-mail. A configuração é montada a cada requisição porque
// App ID, App Secret e a chave do Resend vêm do banco (painel de admin), não do .env.
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import type { Adapter } from "next-auth/adapters";
import Facebook from "next-auth/providers/facebook";
import Resend from "next-auth/providers/resend";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_SETUP, cookieSetupValido, decidirLogin } from "@/core/acesso";
import { lerConfig, salvarConfig } from "@/core/config";
import { db } from "@/db";
import { authConta, authSessao, authTokenVerificacao, authUsuario } from "@/db/schema";
import { LimiteTentativas } from "@/lib/limite";

const TRINTA_DIAS = 30 * 24 * 3600;
const limiteLinkMagico = new LimiteTentativas(5, 15 * 60_000);

function adaptador(): Adapter {
  const base = DrizzleAdapter(db(), {
    usersTable: authUsuario,
    accountsTable: authConta,
    sessionsTable: authSessao,
    verificationTokensTable: authTokenVerificacao,
  });
  // o login só identifica quem entra: os tokens do Facebook não servem para nada aqui e não são guardados
  return {
    ...base,
    linkAccount: (conta) =>
      base.linkAccount!({ ...conta, access_token: undefined, refresh_token: undefined, id_token: undefined }),
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth(async () => {
  const cfg = await lerConfig();
  const providers = [];
  if (cfg["meta.app_id"] && cfg["meta.app_secret"]) {
    providers.push(Facebook({ clientId: cfg["meta.app_id"], clientSecret: cfg["meta.app_secret"] }));
  }
  if (cfg["resend.api_key"] && cfg["email.remetente"] && cfg["auth.admin_email"]) {
    providers.push(Resend({ apiKey: cfg["resend.api_key"], from: cfg["email.remetente"], maxAge: 15 * 60 }));
  }

  return {
    adapter: adaptador(),
    providers,
    session: { strategy: "database", maxAge: TRINTA_DIAS },
    trustHost: true,
    pages: { signIn: "/login", verifyRequest: "/login?enviado=1", error: "/login" },
    callbacks: {
      async signIn({ user, account, email }) {
        const jar = await cookies();
        const setupPendente = cookieSetupValido(jar.get(COOKIE_SETUP)?.value);
        const decisao = decidirLogin(
          { provedor: account?.provider ?? "", idNoProvedor: account?.providerAccountId, email: user.email },
          await lerConfig(),
          setupPendente,
        );

        if (account?.provider === "resend") {
          // pedido do link: mesmo destino para e-mail autorizado ou não (não revela qual é o do admin)
          if (email?.verificationRequest && (!decisao.permitido || !limiteLinkMagico.tentar("link"))) {
            return "/login?enviado=1";
          }
          return decisao.permitido;
        }

        if (decisao.permitido && decisao.vincularFacebook) {
          await salvarConfig({ "auth.facebook_user_id": decisao.vincularFacebook, "setup.concluido": "1" }, "setup.concluido");
          jar.delete(COOKIE_SETUP);
        }
        return decisao.permitido ? true : "/login?erro=negado";
      },
    },
  };
});

/** Para server components e server actions do painel: sem sessão, volta ao login. */
export async function exigirSessao() {
  const sessao = await auth();
  if (!sessao) redirect("/login");
  return sessao;
}
