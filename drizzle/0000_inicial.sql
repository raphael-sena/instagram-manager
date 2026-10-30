CREATE TABLE "configuracao" (
	"chave" text PRIMARY KEY NOT NULL,
	"valor_cifrado" text NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worker_heartbeat" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"visto_em" timestamp with time zone NOT NULL,
	"versao" text NOT NULL
);
