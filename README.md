# instagram-manager

Publicação e agendamento de posts, carrosséis, Reels e Stories em várias contas do Instagram, com status por conta.

- Documentação do produto, integração com a Meta, stack e plano: [`docs/`](docs/README.md)
- Deploy e operação: [`docs/deploy.md`](docs/deploy.md)

## Desenvolvimento

Requisitos: Node 24+, pnpm 12, Docker.

```sh
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d   # Postgres local (porta 5434)
pnpm install
pnpm db:migrate
pnpm dev            # web em http://localhost:3000
pnpm dev:worker     # worker (outro terminal)
```

| Comando | O quê |
|---|---|
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Qualidade (o mesmo que o CI roda) |
| `pnpm db:generate --name <nome>` | Nova migration a partir de `src/db/schema.ts` |
| `pnpm build` | Build do Next (standalone) + worker e migrations em `dist/` |
| `PGPASSWORD=instagram scripts/backup/testar-backup.sh` | Ensaio de backup/restauração |

## Estrutura

```
src/
  app/      telas e rotas de API (Next.js)
  worker/   processo worker (pg-boss: filas e agendamentos)
  core/     regras de domínio
  db/       schema Drizzle, conexão, migrations
  lib/      utilitários (env, e futuramente crypto, storage, e-mail)
drizzle/    migrations SQL geradas
deploy/     compose de produção
scripts/    build do worker, backup/restauração
poc/        prova de conceito da API da Meta (fase 0)
```
