# Deploy em produção — instagram.kvaris.com.br

Mesmo modelo do Bellitas, na mesma VPS (`kvaris-test`):

```
merge na main → CI verde → CD publica as imagens no GHCR → SSH na VPS → /opt/instagram: backup, pull, up -d, conferência
```

- Compose: [`deploy/docker-compose.producao.yml`](../deploy/docker-compose.producao.yml), copiado para `/opt/instagram/docker-compose.yml`
- Workflow: [`.github/workflows/cd-producao.yml`](../.github/workflows/cd-producao.yml)
- Nenhuma porta aberta na VPS: o tráfego chega pelo túnel da Cloudflare. **Não mexe** no nginx nem nas redes do Kvaris staging.
- Enquanto faltar algum secret, o CD **só publica as imagens** e não toca na VPS.

## Configuração inicial (uma vez)

> 🔒 Os valores vão direto para os secrets do GitHub e para o seu gerenciador de senhas. Nunca no chat nem no repositório.

### 1. Cloudflare R2 — bucket e token de backup
1. **R2 → Criar bucket** `instagram-db-backup` (acesso público desativado).
2. **R2 → Gerenciar tokens de API → Criar token**: nome `instagram-backup`, permissão **Leitura e gravação de objetos**, escopo **só** `instagram-db-backup`.
3. Guarde o Access Key ID e o Secret.

### 2. Cloudflare Tunnel
1. **Zero Trust → Networks → Tunnels → Create a tunnel** → Cloudflared → nome `instagram`.
2. Copie o **token** do comando de instalação (o trecho depois de `--token`). Não instale nada na VPS: o container `cloudflared` do compose faz isso.
3. **Public Hostname**: `instagram.kvaris.com.br` → Service `HTTP` → `web:3000`.

### 3. GitHub — Environment `production`
Repositório → **Settings → Environments → New environment** → `production` → **Add secret**:

| Secret | Valor |
|---|---|
| `SSH_HOST` | IP da VPS |
| `SSH_KEY` | Chave privada de deploy (pode ser a mesma do Bellitas) |
| `SSH_KNOWN_HOSTS` | Saída de `ssh-keyscan -t ed25519 <IP da VPS>` |
| `DB_PASSWORD` | `openssl rand -hex 24` (**precisa ser hexadecimal**: vai dentro da URL do banco) |
| `APP_ENCRYPTION_KEY` | `openssl rand -base64 32` — chave-mestra das credenciais do painel. **Guarde no gerenciador de senhas**: sem ela, tudo que foi cadastrado no painel precisa ser cadastrado de novo |
| `AUTH_SECRET` | `openssl rand -base64 32` (assina as sessões) |
| `SETUP_TOKEN` | `openssl rand -hex 16` — código do primeiro acesso. Guarde: é pedido no `/setup` |
| `BACKUP_PASSPHRASE` | `openssl rand -base64 32` — **guarde no gerenciador de senhas**: sem ela os backups não abrem |
| `R2_ACCOUNT_ID` | Account ID da Cloudflare |
| `R2_BACKUP_ACCESS_KEY_ID` | Do passo 1 |
| `R2_BACKUP_SECRET_ACCESS_KEY` | Do passo 1 |
| `CLOUDFLARE_TUNNEL_TOKEN` | Do passo 2 |
| `BACKUP_HEARTBEAT_URL` | (opcional) URL do healthchecks.io para avisar se o backup parar |
| `SSH_USER` / `SSH_PORT` | (opcionais) padrão `root` / `22` |

Pelo terminal (o valor é pedido sem aparecer na tela):
```sh
gh secret set DB_PASSWORD --env production --body "$(openssl rand -hex 24)"
gh secret set CLOUDFLARE_TUNNEL_TOKEN --env production   # cola o valor quando pedir
```

### 4. Facebook Login no app da Meta
No app criado na fase 0: **adicionar o produto Facebook Login** (ou Facebook Login for Business) e, em **Configurações → URIs de redirecionamento do OAuth válidos**, cadastrar:
```
https://instagram.kvaris.com.br/api/auth/callback/facebook
```

### 5. Primeiro deploy
**Actions → CD · Produção → Run workflow** (ou o próximo merge na `main`). Na primeira vez não há backup pré-atualização. Ao fim, `https://instagram.kvaris.com.br/api/health` responde:
```json
{"status":"ok","versao":"sha-…","banco":"ok","worker":"ok"}
```

### 6. Primeiro acesso
1. Abra `https://instagram.kvaris.com.br` → cai em `/setup`.
2. Informe o `SETUP_TOKEN`, o App ID, o App Secret e (opcional) o seu e-mail para o link mágico.
3. **Entrar com Facebook** no mesmo navegador: a sua conta do Facebook vira a única autorizada e o `/setup` se fecha.
4. No **Painel de admin**: token do System User, credenciais do R2 (bucket de mídias) e Resend — cada um com o botão de teste.

## Operação

| Tarefa | Como |
|---|---|
| Ver estado | `ssh kvaris-test 'cd /opt/instagram && docker compose ps'` |
| Logs | `ssh kvaris-test 'cd /opt/instagram && docker compose logs --tail 100 web worker'` |
| Voltar uma versão | **Run workflow** informando a imagem anterior (`sha-…`, ver em Actions ou no GHCR) |
| Backup agora | `ssh kvaris-test 'cd /opt/instagram && docker compose exec -T backup bash scripts/backup/backup.sh'` |
| Restaurar | Baixar o `.tar.gpg` do bucket `instagram-db-backup` e rodar `scripts/backup/restaurar.sh <arquivo> --banco instagram_restaurado` (restaura num banco **novo**; conferir antes de trocar) |
| Recuperar acesso (perdeu o Facebook e o e-mail) | `ssh kvaris-test 'cd /opt/instagram && docker compose exec web node dist/admin-reset.mjs'` → encerra as sessões e reabre o `/setup` (pede o `SETUP_TOKEN`) |
| Ensaio de backup | `PGPASSWORD=… scripts/backup/testar-backup.sh` (também roda em todo CI) |

## Memória

Tetos (`mem_limit`): postgres 256m, web 384m, worker 384m, cloudflared 128m, backup 128m. Medido em repouso no ensaio local: ~115 MB no total.
