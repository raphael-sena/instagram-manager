CREATE TABLE "auditoria" (
	"id" serial PRIMARY KEY NOT NULL,
	"acao" text NOT NULL,
	"alvo" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_conta" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "auth_conta_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "auth_sessao" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_token_verificacao" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "auth_token_verificacao_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "auth_usuario" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"email_verified" timestamp,
	"image" text,
	CONSTRAINT "auth_usuario_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "auth_conta" ADD CONSTRAINT "auth_conta_user_id_auth_usuario_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessao" ADD CONSTRAINT "auth_sessao_user_id_auth_usuario_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_usuario"("id") ON DELETE cascade ON UPDATE no action;