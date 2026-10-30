# 06 — Stack e infraestrutura

> Status: **aprovada** (T1–T4).

## O que os requisitos exigem da arquitetura

| Requisito | Exigência técnica |
|---|---|
| Agendamento no servidor e sobrevivência a reinícios (RF07, RNF02) | **Fila de jobs persistente**, com agendamento por data/hora |
| Processamento de vídeo pela Meta leva minutos (consultas de 1 em 1 min, por até 5 min) | Jobs que se **reagendam**, em vez de requisições longas. Nada de função serverless com timeout curto |
| 50 destinos ao mesmo tempo (D7) | Jobs independentes por destino, com **concorrência controlada** |
| Upload de até 300 MB pelo celular | **Upload direto do navegador para o storage** (URL pré-assinada, multipart), sem passar pelo servidor |
| A Meta baixa a mídia 50× | Storage com **egress gratuito** |
| Conversão de imagem e validação de vídeo (RF05) | Servidor com `ffprobe`/`ffmpeg` e biblioteca de imagem |
| Usuário único, custo perto de zero | **Poucas peças**: um app, um banco, um storage |

## Recomendação

**Um monólito TypeScript, com um processo web e um processo worker, sobre PostgreSQL.**

```
 Celular / Navegador (PWA)
        │  HTTPS
        ▼
 ┌──────────────────────┐        upload direto (URL pré-assinada)
 │  Web — Next.js       │◄──────────────────────────────┐
 │  UI + API + Auth     │                               │
 └─────────┬────────────┘                               │
           │ enfileira jobs                              │
           ▼                                             │
 ┌──────────────────────┐   ┌──────────────────┐   ┌────┴─────────────┐
 │  PostgreSQL          │◄──│  Worker (Node)   │──►│  Cloudflare R2   │
 │  dados + fila pg-boss│   │  publica, agenda,│   │  mídias (URL     │
 └──────────────────────┘   │  limpa, notifica │   │  pública)        │
                            └───┬─────────┬────┘   └────────▲─────────┘
                                │         │                 │ baixa a mídia
                                ▼         ▼                 │
                         Instagram     Resend          Meta (Graph API)
                         Graph API     (e-mail)
```

### Componentes

| Camada | Escolha | Por quê |
|---|---|---|
| Linguagem | **TypeScript** (front e back) | Uma linguagem só, tipos compartilhados entre UI, API e worker |
| Web (UI + API) | **Next.js** (App Router) | UI e API num único deploy. Bom suporte a PWA |
| UI | **Tailwind CSS + shadcn/ui** | Componentes prontos, acessíveis e responsivos, mobile-first |
| Validação | **Zod** | Mesmos schemas no formulário e na API (regras do RF05) |
| Banco | **PostgreSQL** | Relacional e confiável. Também serve de fila |
| ORM / migrations | **Drizzle ORM** | Leve, tipado, migrations em SQL legível |
| Fila e agendador | **pg-boss** (fila sobre o Postgres) | Jobs persistentes, `startAfter` para agendamento, retentativas com backoff, cron para limpeza. **Sem Redis** |
| Worker | Processo Node separado (mesmo repositório) | Publica os destinos, consulta os containers, apaga mídias, envia e-mails |
| Storage | **Cloudflare R2** | **Egress gratuito** (crítico: ~10 GB por Reels publicado em 50 contas), API compatível com S3, 10 GB grátis |
| E-mail | **Resend** | API simples. O plano grátis (~3 mil e-mails/mês) sobra |
| Login | **Auth.js**: provedor Facebook + link mágico por e-mail (Resend) | Ver T3. Sessão longa no celular |
| Imagem | **sharp** + conversão de HEIC | Converte para JPEG e ajusta proporção e largura (RF05) |
| Vídeo | **ffprobe** (ffmpeg) | Valida codec, duração, fps e tamanho antes de enviar à Meta |
| Status em tempo real | Polling a cada ~3 s na tela da publicação | Simples e suficiente para um usuário. SSE seria uma evolução |
| Criptografia de tokens | AES-256-GCM, chave em variável de ambiente | RNF04 |

### Como o fluxo de publicação vira jobs

1. **Publicar/agendar:** cria a publicação e um registro de **destino** por conta, e enfileira um job `publicar-destino` por destino, com `startAfter = horário agendado`.
2. **Worker pega o job:** se o atraso passar de 15 min, o destino vai para `AGUARDANDO_CONFIRMACAO` e um e-mail é enviado (D5). Se não, cria os containers e salva os IDs no destino.
3. **Vídeo processando:** o job se reagenda para daqui a ~60 s (`verificar-container`), sem ficar bloqueado esperando.
4. **`FINISHED`:** chama `media_publish` e salva o `media_id` e o permalink. **Idempotência:** antes de publicar, verifica se o destino já tem `media_id` ou se o container já está `PUBLISHED`.
5. **Fim da publicação** (todos os destinos em estado final): apaga as mídias do R2 se tudo deu certo, ou agenda a limpeza para 24 h depois (D4). Envia e-mail se houve falha.
6. **Cron:** limpeza de mídias órfãs e verificação diária da validade do token da Meta.

Concorrência inicial: ~10 destinos em paralelo, ajustável pelo cabeçalho `X-Business-Use-Case-Usage`.

## Hospedagem — decidido: VPS Hetzner existente

URL: **https://instagram.kvaris.com.br**

### Estado atual da máquina (inspecionado em 30/10/2026)

| Item | Valor |
|---|---|
| Host | `kvaris-test` — Hetzner, Ubuntu 26.04, x86_64, 2 vCPU, 3,7 GB RAM + 2 GB swap, 25 GB livres |
| Docker | 29.5 + Compose v5.1 |
| Já hospeda | **Kvaris staging** (`/opt/kvaris-infra`: nginx-proxy na porta 80, front, back, db, docs, mailpit) e **Bellitas produção** (`/opt/bellitas`) |
| DNS | `kvaris.com.br` na **Cloudflare** |
| Memória | ~1,4 GB disponível. Os containers do Kvaris staging estão **sem `mem_limit`** |

### Padrão adotado: o mesmo do Bellitas

O Bellitas já resolve tudo o que precisamos: compose isolado em `/opt/bellitas`, **túnel da Cloudflare** (nenhuma porta aberta), imagens prontas no **GHCR** publicadas por um CD no GitHub Actions, `.env` gravado a partir dos secrets, **R2** e um container de **backup criptografado para o R2**. O Instagram Manager segue o mesmo modelo, **sem tocar** no nginx nem nas redes do Kvaris staging:

```
Internet → Cloudflare (HTTPS) → túnel (cloudflared, conexão de saída) → web:3000
                                                                          │
                                       worker ──► Postgres ◄──────────────┘
                                         │
                                         ├──► Instagram Graph API
                                         ├──► R2 (mídias)
                                         └──► Resend (e-mail)
```

`/opt/instagram/docker-compose.yml` (projeto `instagram`):

| Serviço | Imagem | `mem_limit` proposto |
|---|---|---|
| `postgres` | `postgres:16-alpine` (banco próprio, isolado) | 256m |
| `web` | `ghcr.io/raphael-sena/instagram-web:sha-…` | 384m |
| `worker` | `ghcr.io/raphael-sena/instagram-worker:sha-…` (inclui `ffprobe`) | 384m |
| `cloudflared` | `cloudflare/cloudflared` — **túnel próprio**, hostname `instagram.kvaris.com.br` → `http://web:3000` | 128m |
| `backup` | `pg_dump` criptografado → bucket R2 `instagram-db-backup`, retenção de 30 dias | 128m |

Consumo real esperado em repouso: ~400–500 MB. Cabe na folga atual, mas com pouca margem. Por isso:
- O worker só **valida** vídeo com `ffprobe` e **não transcodifica** (transcodificar com ffmpeg consumiria CPU e memória da máquina toda). Vídeo fora da especificação é recusado com uma mensagem clara.
- Recomendado (fora deste projeto): definir `mem_limit` nos containers do Kvaris staging.
- Se faltar memória, o próximo degrau é subir o plano da VPS na Hetzner.

### Uploads e o limite de 100 MB da Cloudflare

Requisições que passam pela Cloudflare (proxy ou túnel) no plano grátis são limitadas a **100 MB**. Como os uploads vão **direto do navegador para o R2** (URL pré-assinada, multipart), eles não passam pelo túnel, e Reels de até 300 MB funcionam.

### Mídia para a Meta: bucket privado

O bucket `instagram-midias` é **privado**, como o do Bellitas. A Meta recebe uma **URL pré-assinada de leitura** com validade de algumas horas. Assim nada fica público e indexável, e a mídia é apagada depois (D4). Plano B, se a Meta recusar URLs pré-assinadas nos testes: um subdomínio público do R2 (ex.: `midias-instagram.kvaris.com.br`) com nomes de arquivo aleatórios.

### Credenciais R2 (mesmo princípio do Bellitas)
- Token **app**: leitura e escrita só em `instagram-midias`.
- Token **backup**: escrita em `instagram-db-backup`. O token da aplicação não alcança os backups.

## Custo mensal estimado

| Item | Custo |
|---|---|
| Meta / Instagram Graph API | Grátis |
| Hospedagem | **R$ 0 adicional** (VPS já paga) |
| Cloudflare (DNS, túnel, R2) | Grátis (mídias apagadas logo; bem abaixo de 10 GB) |
| Resend | Grátis |
| Domínio | Já existe (`kvaris.com.br`) |
| **Total** | **R$ 0 adicional/mês** |

## Qualidade e padrões

| Tema | Proposta |
|---|---|
| Repositório | Um repositório só: `src/app` (web), `src/worker`, `src/core` (domínio + integração Meta), `src/db` |
| Integração Meta | Módulo isolado (`MetaClient`) com tipos, tradução de erros e retentativas |
| Testes | **Vitest** (unidade e integração, com a API da Meta simulada) + **Playwright** (fluxos principais no celular e no desktop) |
| Lint/format | ESLint + Prettier |
| CI | GitHub Actions: lint, typecheck e testes em cada PR. Deploy a partir da `main` |
| Ambientes | Local (Docker Compose com Postgres + MinIO/R2 de dev) e produção. Para testes, uma conta do Instagram de teste |
| Segredos | Variáveis de ambiente na plataforma. `.env.example` no repositório, sem valores |

## Configuração e segredos (painel de admin — RF13)

As credenciais de integração são cadastradas **pelo painel** e ficam no banco, **criptografadas** (AES-256-GCM). Só o mínimo necessário para o sistema subir fica no `.env`.

| Onde | O quê | Por quê |
|---|---|---|
| **`.env`** (secrets do GitHub → CD, como no Bellitas) | `DATABASE_URL`, `APP_ENCRYPTION_KEY` (chave-mestra), `AUTH_SECRET` (assina a sessão), `SETUP_TOKEN` (primeiro acesso), `TUNNEL_TOKEN` (container cloudflared), credenciais do backup | Sem eles o sistema não sobe, ou eles servem para proteger os outros segredos |
| **Painel** (banco, criptografado) | App ID e App Secret da Meta, token do System User, credenciais do R2 (bucket de mídias), chave do Resend, e-mail remetente e destinatário dos avisos, ID do Facebook autorizado | Trocar ou girar uma chave sem redeploy, com teste de conexão na hora |

Regras:
- Segredos são **somente escrita**: depois de salvos, aparecem mascarados (`••••a1b2`) e nunca voltam para o navegador.
- Cada integração tem um botão **"Testar"**: Meta (`debug_token` mostra validade, permissões e ativos), R2 (grava e apaga um arquivo de teste) e Resend (envia um e-mail de teste).
- **Log de auditoria**: quem alterou o quê e quando, sem o valor.
- O worker lê as configurações do banco (com cache curto), então uma mudança vale sem reiniciar nada.
- **A chave-mestra não pode se perder.** Ela fica nos secrets do GitHub e num gerenciador de senhas, nunca no backup do banco. Sem ela, os segredos do banco são irrecuperáveis e precisam ser cadastrados de novo.

### Primeiro acesso (bootstrap)

Há um problema de ovo e galinha: o login com Facebook depende do App ID e do App Secret, que serão cadastrados no próprio painel.

1. No primeiro deploy, sem configuração, o sistema abre `/setup`, protegido pelo `SETUP_TOKEN` do `.env`.
2. O assistente pede **App ID e App Secret** da Meta, e o login com Facebook passa a funcionar.
3. **Entrar com Facebook**: o seu ID do Facebook vira o **único usuário autorizado**.
4. O `/setup` é **trancado** para sempre. A partir daí, o restante (token do System User, R2, Resend, e-mails) é configurado no painel normal, já logado.
5. **Recuperação**, se perder o acesso: um comando na VPS (`docker compose exec web npm run admin:reset`) reabre o `/setup`. Só quem tem SSH na máquina consegue.

## Alternativas consideradas

| Alternativa | Por que não (por ora) |
|---|---|
| Python (FastAPI + Celery + Redis) + front React separado | Duas linguagens, dois deploys e Redis a mais. Faria sentido se você preferir Python |
| Supabase (banco + storage + auth) | Bom, mas o storage tem egress cobrado acima da franquia e ainda precisaríamos de um worker separado |
| Redis + BullMQ em vez de pg-boss | Mais uma peça. pg-boss dá conta de milhares de jobs por dia com folga |
| App nativo (React Native) | Uma web responsiva + PWA atende o uso no celular sem lojas de apps |

## Decisões

| # | Tema | Decisão |
|---|---|---|
| T1 | Stack | ✅ TypeScript + Next.js + PostgreSQL + pg-boss + R2 + Resend |
| T2 | Hospedagem | ✅ VPS Hetzner existente (`kvaris-test`), padrão Bellitas, em `instagram.kvaris.com.br` |
| T3 | Login da aplicação | ✅ "Entrar com Facebook" (mesmo app da Meta), restrito ao meu ID do Facebook, + **link mágico** por e-mail (Resend) como alternativa. Recuperação via SSH |
| T4 | Credenciais e configurações | ✅ Painel de admin, segredos criptografados no banco. Só o mínimo de bootstrap no `.env` |
