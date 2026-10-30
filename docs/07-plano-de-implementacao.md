# 07 — Plano de implementação

Princípios:
- **Riscos primeiro.** Antes de construir telas, uma prova de conceito confirma que a API da Meta se comporta como a documentação diz.
- **Cada fase termina em produção** (`instagram.kvaris.com.br`), funcionando e testada. Nada fica "quase pronto" em branch.
- **Um PR por entrega**, com CI verde. O merge na `main` publica.
- Tamanho relativo de cada fase: **P** (pequena), **M** (média), **G** (grande).

## Visão geral

| Fase | Entrega | Requisitos | Tamanho |
|---|---|---|---|
| 0 | Preparação das contas de serviço + prova de conceito da API | — | P |
| 1 | Fundação: repositório, CI/CD, deploy na VPS | RNF | M |
| 2 | Setup, login e painel de admin | RF01, RF12, RF13 | M |
| 3 | Contas e grupos | RF02, RF03 | P |
| 4 | Publicação imediata: imagem e carrossel | RF04–RF06, RF08, RF09 | G |
| 5 | Publicação imediata: Reels, vídeo e Story | RF04, RF05 | M |
| 6 | Agendamento, histórico e calendário | RF07, RF10 | M |
| 7 | Notificações e robustez | RF11, RNF02, RNF05 | M |
| 8 | Entrada em produção com as 50 contas | — | P |

Ao fim da **fase 5** você já publica tudo nas 50 contas manualmente ("publicar agora"). As **fases 6 e 7** acrescentam o agendamento e os avisos.

---

## Fase 0 — Preparação e prova de conceito (P)

### Tarefas manuais — passo a passo em [guias/fase-0-preparacao.md](guias/fase-0-preparacao.md)
- [ ] **Criar uma conta do Instagram de teste** (profissional, vinculada a uma Página nova no Business Portfolio).
- [ ] **Meta for Developers**: criar o app (tipo Business), em modo desenvolvimento.
- [ ] **Business Manager**: criar o **System User** (Admin) com acesso **só à conta de teste**, e gerar o token com as permissões do [doc 04](04-integracao-meta.md#permissões-necessárias).
- [ ] **Cloudflare R2**: criar o bucket `instagram-midias` e o token "app".

Ficam para a fase 1: bucket e token de backup, Resend (domínio + DNS), túnel da Cloudflare e Facebook Login (fase 2).

### Prova de conceito (script, fora do produto)
Um script TypeScript, rodando local, contra a conta de teste, que responde:
- [ ] O token do System User funciona com o app em **modo desenvolvimento**?
- [ ] A Meta aceita **URL pré-assinada do R2** como `image_url`/`video_url`? Se não, ativamos o plano B (subdomínio público).
- [ ] Publicação ponta a ponta de: imagem, carrossel misto, Reels, Story de imagem e Story de vídeo.
- [ ] Qual é o limite real retornado por `content_publishing_limit` (50 ou 100)?
- [ ] Como se comporta o retry de `media_publish` (o mesmo container publica duas vezes?)

**Pronto quando:** as respostas estão registradas no doc 04 e as decisões ajustadas, se for o caso.

---

## Fase 1 — Fundação (M)

- [ ] Manual: bucket `instagram-db-backup` + token "backup" no R2, túnel `instagram` na Cloudflare (`instagram.kvaris.com.br` → `http://web:3000`), domínio de envio no Resend + DNS (SPF/DKIM), secrets no GitHub.
- [x] Projeto Next.js + TypeScript (pnpm), ESLint, Prettier, Vitest.
- [x] Estrutura de pastas:
  ```
  src/
    app/        # telas e rotas de API (Next.js)
    worker/     # entrada do processo worker (pg-boss)
    core/       # domínio: publicação, destino, regras de mídia
    meta/       # MetaClient: chamadas, tipos, tradução de erros
    db/         # schema Drizzle, migrations
    lib/        # crypto, storage (R2), e-mail, config
  ```
- [x] `docker-compose.dev.yml`: Postgres (o storage S3 local entra na fase 4).
- [x] Drizzle configurado, primeira migration, tabela de configurações.
- [x] Dockerfiles `web` e `worker` (o worker inclui `ffprobe`).
- [x] Healthcheck: `/api/health` (web) e heartbeat no banco (worker).
- [x] **CI** (GitHub Actions): lint, typecheck e testes em cada PR.
- [x] **CD** no padrão do Bellitas: build → GHCR (`sha-<commit>`), cópia do `docker-compose.yml` para `/opt/instagram`, `.env` gerado a partir dos secrets e `docker compose up -d`.
- [x] Compose de produção: `postgres`, `web`, `worker`, `cloudflared`, `backup`, com `mem_limit`.
- [x] Backup diário criptografado do banco para o R2 + **teste de restauração** (roda em todo CI).

Código pronto (PR da fundação). Falta a parte manual (primeira linha) e o primeiro deploy — ver [deploy.md](deploy.md).

**Pronto quando:** `https://instagram.kvaris.com.br` responde com uma página-placeholder, o deploy acontece sozinho no merge e o backup roda.

---

## Fase 2 — Setup, login e painel de admin (M)

- [x] Módulo de criptografia (AES-256-GCM com `APP_ENCRYPTION_KEY`) + testes.
- [x] Tabelas: `configuracao` (chave, valor criptografado, atualizado_em) e `auditoria`.
- [x] Assistente **`/setup`**, protegido por `SETUP_TOKEN`: App ID/Secret → login com Facebook → trava.
- [x] **Auth.js**: provedor Facebook (aceita só o ID autorizado) + **link mágico** via Resend (só o e-mail do admin, uso único, 15 min, limite de tentativas).
- [x] Comando `admin:reset` (reabre o `/setup`).
- [x] **Painel de admin**: Meta, R2, Resend e configurações gerais. Campos somente escrita, botões "Testar", log de auditoria.
- [x] Layout base responsivo (cabeçalho com sessão e "Sair"; o menu de navegação entra junto com as telas de contas e publicação).

Código pronto, com testes E2E (celular e desktop) do setup e do painel. Falta validar com o app real da Meta: login com Facebook, link mágico e os botões de teste.

**Pronto quando:** consigo entrar pelo Facebook e pelo link mágico, e todas as integrações passam no "Testar".

---

## Fase 3 — Contas e grupos (P)

- [ ] `MetaClient`: listar Páginas e contas do Instagram (com paginação) e consultar `content_publishing_limit`.
- [ ] Tabela `conta` + sincronização (novas, removidas, indisponíveis com motivo).
- [ ] Tela de contas: foto, @usuário, Página, status, uso do limite diário, ativar/desativar.
- [ ] Grupos: criar, editar, excluir e associar contas.

**Pronto quando:** as 50 contas aparecem corretamente e consigo montar grupos.

---

## Fase 4 — Publicação imediata: imagem e carrossel (G)

O coração do sistema. Aqui o pipeline de publicação é construído e validado.

- [ ] Modelo de dados: `publicacao`, `midia`, `destino`, `destino_evento` (log de cada chamada à Meta).
- [ ] **Upload direto para o R2** (URL pré-assinada, multipart, barra de progresso, retomada em conexão ruim).
- [ ] Processamento de imagem: HEIC/PNG → JPEG, ajuste de largura, proporção validada (RF05).
- [ ] Tela **Nova publicação**: tipo Post (imagem) ou Carrossel, reordenação, legenda com contadores, pré-visualização, rascunho.
- [ ] **Seleção de contas**: busca, todas, por grupo, bloqueio das indisponíveis.
- [ ] **Worker**: job por destino → containers (filhos + pai no carrossel) → `media_publish` → permalink. Concorrência configurável, backoff, **idempotência**.
- [ ] Tela de **status** da publicação (atualização a cada ~3 s), resumo e detalhes do erro.
- [ ] **Tentar de novo** (por destino e todas as falhas), com checagem anti-duplicação.
- [ ] **Limpeza de mídia** (D4): imediata se tudo foi publicado, ou após 24 h se houve falha.
- [ ] Tradução dos erros da Meta para o português.
- [ ] Testes: unitários do pipeline com a Meta simulada (sucesso, erro, timeout, publicado em dobro).

**Pronto quando:** publico um carrossel na conta de teste e depois em 3 contas reais, vejo o status correto em cada uma e consigo retentar uma falha simulada.

---

## Fase 5 — Reels, vídeo e Story (M)

- [ ] Validação de vídeo com `ffprobe` (codec, duração, fps, resolução, tamanho) por tipo.
- [ ] Reels: capa (imagem ou instante do vídeo) e `share_to_feed`. Post de vídeo = Reels no feed (D3).
- [ ] Story: imagem ou vídeo, com aviso de que a legenda não aparece.
- [ ] Vídeo como item de carrossel.
- [ ] Ciclo de consulta do container (`IN_PROGRESS` → reagenda em 60 s, tempo máximo → `FALHOU`).

**Pronto quando:** os 4 tipos de publicação funcionam ponta a ponta em contas reais.

---

## Fase 6 — Agendamento, histórico e calendário (M)

- [ ] Agendar (fuso America/Sao_Paulo, armazenado em UTC), editar, reagendar e cancelar.
- [ ] Agendamento atrasado > 15 min → `AGUARDANDO_CONFIRMACAO`, com tela para publicar agora, reagendar ou cancelar (D5).
- [ ] Histórico com filtros e miniaturas vindas do Instagram.
- [ ] Calendário (mês/semana; no celular, lista por dia).
- [ ] Duplicar publicação (sem as mídias).
- [ ] Teste: reiniciar o worker com agendamentos pendentes e conferir que nada se perde nem duplica.

**Pronto quando:** um post agendado sai no horário com o celular desligado, e um agendamento "perdido" pede confirmação.

---

## Fase 7 — Notificações e robustez (M)

- [ ] E-mails (RF11): publicação com falhas, aguardando confirmação, token inválido.
- [ ] Cron diário: validade do token da Meta (pausa os agendamentos e avisa se estiver inválido).
- [ ] Cron: limpeza de mídias órfãs e de uploads abandonados.
- [ ] Detecção de destinos presos em `PROCESSANDO`.
- [ ] PWA: manifest, ícone, instalável na tela inicial.
- [ ] Testes E2E (Playwright) dos fluxos principais em viewport de celular e desktop.

**Pronto quando:** uma falha provocada gera o e-mail certo, e o app instala no celular.

---

## Fase 8 — Entrada em produção (P)

- [ ] Publicação real em 5 contas, depois em 20, depois nas 50.
- [ ] Conferência do uso de memória da VPS com tudo rodando (ajustar `mem_limit`).
- [ ] Documento de operação: como fazer deploy, restaurar backup, girar chaves e recuperar acesso.
- [ ] Revisão de segurança (`/security-review`) antes de abrir para uso diário.

---

## Modelo de dados (rascunho)

```
configuracao   (chave PK, valor_cifrado, atualizado_em)
auditoria      (id, acao, alvo, criado_em)
usuario / sessao / token_verificacao   ← tabelas do Auth.js

conta          (id, ig_user_id UK, username, nome, foto_url, pagina_id, pagina_nome,
                status[ATIVA|DESATIVADA|INDISPONIVEL], motivo, sincronizada_em)
grupo          (id, nome)
grupo_conta    (grupo_id, conta_id)

publicacao     (id, tipo[POST|CARROSSEL|REELS|STORY], legenda, share_to_feed,
                status[RASCUNHO|AGENDADA|EM_ANDAMENTO|CONCLUIDA|CANCELADA],
                agendada_para, criada_em, midias_apagadas_em)
midia          (id, publicacao_id, ordem, tipo[IMAGEM|VIDEO], chave_r2, papel[ITEM|CAPA],
                largura, altura, duracao_ms, bytes)
destino        (id, publicacao_id, conta_id, UK(publicacao_id, conta_id),
                status[AGENDADO|PROCESSANDO|PUBLICADO|FALHOU|CANCELADO|AGUARDANDO_CONFIRMACAO],
                container_id, filhos_container_ids[], media_id, permalink,
                tentativas, erro_codigo, erro_mensagem, iniciado_em, finalizado_em)
destino_evento (id, destino_id, etapa, requisicao_resumo, resposta, http_status, criado_em)
```

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| A Meta não aceita URL pré-assinada | Testado na fase 0. Plano B: subdomínio público com nomes aleatórios |
| Token do System User exige app em modo Live | Testado na fase 0. A trava do login continua pelo ID do Facebook |
| Post duplicado em retentativa | Idempotência por destino + consulta ao container e às mídias recentes antes de retentar |
| Memória da VPS (dividida com Kvaris staging e Bellitas) | `mem_limit` em tudo, sem transcodificação, monitoramento na fase 8 |
| A Meta muda a API ou os limites | `MetaClient` isolado, versão da Graph API fixada, revisão a cada nova versão |
| O Instagram restringe contas por publicação simultânea idêntica | Começar com poucas contas (fase 8). Se ocorrer, reavaliar D7 (espaçar) |
