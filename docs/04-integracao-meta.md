# 04 — Integração com a Meta (Instagram Graph API)

Fonte: documentação oficial da Meta, consultada em 30/10/2026.
- Publicação de conteúdo: https://developers.facebook.com/docs/instagram-platform/content-publishing
- Referência `IG User/media`: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media

> A API muda com frequência. Revalide limites e especificações antes da implementação e a cada nova versão da Graph API.

## Pré-requisitos

1. Todas as contas do Instagram são **profissionais** (Business ou Creator).
2. Cada conta está **vinculada a uma Página do Facebook** que eu administro.
3. Existe um **app** criado em [Meta for Developers](https://developers.facebook.com/), do tipo Business.
4. Se alguma Página exigir **PPA (Page Publishing Authorization)**, ela precisa ser concluída antes, ou a publicação naquela conta fica bloqueada.

## Custo

- A API é **gratuita**. A Meta não cobra por chamadas nem por publicações.
- **App Review não é necessário** no nosso caso: com *Standard Access*, o app funciona para pessoas que têm papel no próprio app (eu, como admin). Só seria preciso para atender contas de terceiros.

## Autenticação

São três caminhos possíveis. O nosso cenário é: contas ligadas a Páginas, um único dono, automação no servidor.

| Opção | Token | Expira? | Observação |
|---|---|---|---|
| **A. Facebook Login + token de Página** | Page Access Token (um por Página) | Derivado de um token de usuário de longa duração, **não expira** enquanto a permissão for mantida | Mais simples de começar. Se eu trocar a senha ou revogar o acesso, preciso reconectar |
| **B. System User (Business Manager)** | Token de System User | **Não expira** | O mais robusto para automação. Exige que as Páginas e contas estejam num **Business Portfolio** (Business Manager) |
| C. Instagram Login | Token por conta do Instagram | 60 dias (renovável) | Exige login em cada uma das 50 contas. **Descartada** |

**Decisão: opção B (System User).** As contas estão num Business Portfolio (D1). O System User recebe acesso às Páginas e contas do Instagram no Business Manager, e o token dele é configurado uma vez no servidor.

Configuração (manual, uma vez):
1. Business Settings → Users → **System Users** → criar um System User (papel Admin).
2. Atribuir a ele os ativos: as Páginas e as contas do Instagram.
3. Adicionar o app ao Business Portfolio e gerar o token do System User com as permissões abaixo.
4. Contas novas: atribuir ao System User no Business Manager e clicar em "Sincronizar" no sistema.

### Permissões necessárias
- `instagram_basic`
- `instagram_content_publish`
- `pages_show_list` (listar as Páginas)
- `pages_read_engagement`
- `business_management` (opção B / Business Manager)
- `ads_management` e `ads_read`: exigidas quando o usuário tem papel no Business Manager da Página

## Descobrir as contas

Com o token do System User:
```
GET /me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name,profile_picture_url}
```
Retorna as Páginas e, em cada uma, a conta do Instagram vinculada (`instagram_business_account.id` = **IG User ID**, usado em todas as chamadas de publicação). Com 50 contas, a resposta é paginada.

## Fluxo de publicação (por conta)

A mídia **não é enviada como arquivo**: a Meta **baixa de uma URL pública** que fornecemos. Por isso precisamos de um storage com URLs públicas.

```
1. POST /{ig-user-id}/media                → cria o container  → { id: container_id }
2. GET  /{container_id}?fields=status_code → aguarda FINISHED (vídeos levam de segundos a minutos)
3. POST /{ig-user-id}/media_publish        → creation_id=container_id → { id: media_id }
4. GET  /{media_id}?fields=permalink       → link do post (para a tela de status)
```

Parâmetros do passo 1 por tipo:

| Tipo | Parâmetros |
|---|---|
| Post imagem | `image_url`, `caption`, `alt_text` (opcional) |
| Post vídeo | Publicado como Reels: `media_type=REELS`, `share_to_feed=true` (D3) |
| Reels | `media_type=REELS`, `video_url`, `caption`, `share_to_feed`, `cover_url` ou `thumb_offset` |
| Story | `media_type=STORIES`, `image_url` **ou** `video_url` (sem legenda visível) |
| Carrossel | (a) um container filho por item com `is_carousel_item=true`; (b) container pai com `media_type=CAROUSEL`, `children=id1,id2,...`, `caption` |

### Status do container
`IN_PROGRESS` · `FINISHED` (pronto) · `PUBLISHED` · `ERROR` · `EXPIRED` (não publicado em 24 h)

A Meta recomenda consultar o status **no máximo uma vez por minuto, por até 5 minutos**.

### Implicações para o sistema
- **O container é por conta.** Não dá para reaproveitar um container entre contas: cada uma das 50 contas repete o fluxo inteiro, e a Meta baixa a mídia 50 vezes.
- **Carrossel com N itens = N + 1 containers por conta.** Um carrossel de 10 itens em 50 contas soma ~550 containers e ~1.100+ chamadas.
- **A API não tem agendamento para o Instagram.** O agendamento é **nosso**: o servidor dispara o fluxo no horário marcado.
- **Risco de duplicidade:** se o `media_publish` der timeout, o post pode ter saído mesmo assim. Antes de retentar, consultar as mídias recentes da conta (`GET /{ig-user-id}/media`) ou o status do container (`PUBLISHED`).
- **A URL da mídia precisa estar acessível** até o container ficar `FINISHED`.

## Limites

| Limite | Valor | Observação |
|---|---|---|
| Publicações via API por conta | **50 ou 100 por 24 h** (janela móvel) | A doc oficial cita os dois números. Consultar em `GET /{ig-user-id}/content_publishing_limit`. Carrossel conta como 1 |
| Expiração do container | 24 h | |
| Taxa de chamadas | Limite por conta/app (Business Use Case). Respostas trazem o cabeçalho `X-Business-Use-Case-Usage` | Paralelismo controlado + backoff |

Com o uso previsto (alguns posts por dia por conta), o limite de publicações **não é um problema**.

## Especificações de mídia

### Imagem (Post, Carrossel)
- **JPEG apenas**, até 8 MB, sRGB
- Proporção entre **4:5 e 1,91:1**
- Largura de 320 a 1440 px (fora disso, é redimensionada)
- No carrossel, todas as imagens são cortadas na proporção da **primeira** (padrão 1:1)

### Reels
- MP4 ou MOV, H.264 ou HEVC, moov atom no início, até 60 fps, largura máx. 1920 px
- Áudio AAC, até 48 kHz
- **De 3 s a 15 min, até 300 MB**
- Proporção recomendada 9:16
- Capa: JPEG até 8 MB, 9:16 recomendado

### Story
- Imagem: JPEG até 8 MB, 9:16 recomendado
- Vídeo: mesmas especificações técnicas do Reels, **de 3 a 60 s, até 100 MB**

### Carrossel
- **De 2 a 20 itens**, misturando imagens e vídeos. Reels não podem ser item de carrossel.

### Legenda
- Até **2.200 caracteres**, **30 hashtags**, **20 menções**
- `alt_text`: até 1.000 caracteres, só para imagens

## O que a API **não** faz
- Filtros, música do Instagram, stickers ou enquetes em Stories
- Tags de produto (shopping)
- Editar um post já publicado. A legenda só pode ser editada de forma limitada, e trocar a mídia não é possível.
- Publicar em contas pessoais

## Erros comuns a tratar

| Situação | Tratamento |
|---|---|
| Token inválido ou expirado | Marcar a conexão como inválida, pausar os agendamentos e notificar |
| Limite de publicação atingido | `FALHOU` com o motivo e sugerir reagendar |
| Mídia fora da especificação | Evitar com a validação prévia (RF05). Se ocorrer, `FALHOU` com o motivo |
| Container `ERROR` | Ler `status` para obter os detalhes e marcar `FALHOU` |
| Erro temporário (5xx, rate limit) | Retentativa automática com backoff |
| Conta sem permissão ou desvinculada | Marcar a conta como indisponível |
