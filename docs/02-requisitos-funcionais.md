# 02 — Requisitos funcionais

Prioridade: **P0** = MVP obrigatório · **P1** = MVP desejável · **P2** = pós-MVP.

---

## RF01 — Conectar a conta Meta (P0)

**Como** dono das contas, **quero** conectar minha conta Meta uma única vez **para** que o sistema acesse todas as minhas contas do Instagram.

- [ ] Conexão via **token de System User** do Business Portfolio (D1), cadastrado no painel de admin (RF13). Ver [04 — Integração](04-integracao-meta.md#autenticação).
- [ ] O sistema verifica periodicamente se o token continua válido. Se não estiver, mostra um alerta, pausa os agendamentos e envia e-mail.
- [ ] Tokens nunca aparecem na interface.

## RF02 — Sincronizar contas (P0)

**Quero** que as contas do Instagram vinculadas apareçam automaticamente **para** não ter que cadastrá-las à mão.

- [ ] Lista cada conta com foto, @usuário, nome e a Página do Facebook vinculada.
- [ ] Um botão "Sincronizar" busca contas novas e marca as que perderam acesso.
- [ ] Contas pessoais (não profissionais) ou sem permissão aparecem como **indisponíveis**, com o motivo.
- [ ] Posso **desativar** uma conta para que ela não apareça na seleção.
- [ ] Mostra quanto do limite diário de publicações cada conta já usou.

## RF03 — Grupos de contas (P1)

**Quero** salvar seleções de contas **para** não ter que marcar as mesmas contas toda vez.

- [ ] Criar, renomear, editar e excluir grupos.
- [ ] Uma conta pode estar em vários grupos.
- [ ] Na seleção de destinos, escolher um grupo marca as contas dele, e ainda posso ajustar a seleção à mão.

## RF04 — Criar publicação (P0)

**Quero** criar uma publicação uma única vez **para** distribuí-la em várias contas.

- [ ] Escolho o tipo: **Post**, **Carrossel**, **Reels** ou **Story**.
- [ ] Post com vídeo é publicado como Reels que também aparece no feed (D3).
- [ ] Faço upload das mídias pelo celular (galeria ou câmera) ou pelo computador.
- [ ] Carrossel: de 2 a 20 itens, misturando imagens e vídeos, com reordenação por arrastar.
- [ ] Legenda única, com contador de caracteres (máx. 2.200), hashtags (máx. 30) e menções (máx. 20).
- [ ] Reels: posso escolher a capa (imagem ou instante do vídeo) e se o Reels aparece no feed.
- [ ] Story: aviso que **a legenda não aparece em Stories**.
- [ ] Pré-visualização de como o post vai ficar.
- [ ] Posso salvar como **rascunho**.

## RF05 — Validar mídia antes de publicar (P0)

**Quero** saber antes de publicar se a mídia vai ser recusada **para** não descobrir o erro em 50 contas ao mesmo tempo.

- [ ] Valida formato, tamanho, proporção e duração conforme o tipo. Ver [especificações](04-integracao-meta.md#especificações-de-mídia).
- [ ] Converte imagens para **JPEG** automaticamente. Fotos de iPhone vêm em HEIC e PNG não é aceito.
- [ ] Mostra um aviso claro quando algo não pode ser corrigido sozinho (ex.: vídeo de 20 minutos).

## RF06 — Selecionar contas de destino (P0)

**Quero** escolher em quais contas cada publicação vai.

- [ ] Lista de contas com busca, opção "selecionar todas" e seleção por grupo.
- [ ] Contador de contas selecionadas.
- [ ] Contas indisponíveis ou sem limite diário restante aparecem bloqueadas, com o motivo.

## RF07 — Publicar agora ou agendar (P0)

**Quero** publicar imediatamente ou numa data e hora futuras.

- [ ] Opções: "Publicar agora" ou "Agendar" (data e hora no fuso **America/Sao_Paulo**).
- [ ] Publicações agendadas podem ser **editadas, reagendadas ou canceladas** até começarem a ser processadas.
- [ ] O agendamento é executado no servidor. Funciona com o celular ou computador desligado.
- [ ] Margem tolerada: a publicação acontece em até ~5 minutos depois do horário marcado.
- [ ] Todos os destinos começam **ao mesmo tempo** (D7).
- [ ] **Agendamento perdido** (servidor fora do ar e mais de 15 min de atraso, valor a calibrar): o sistema **não publica sozinho** (D5). Os destinos vão para `AGUARDANDO_CONFIRMACAO`, um e-mail é enviado e eu escolho entre **publicar agora**, **reagendar** ou **cancelar**.

## RF08 — Acompanhar status por conta (P0)

**Quero** ver se a publicação deu certo em cada conta.

- [ ] Cada destino tem um status: `AGENDADO` → `PROCESSANDO` → `PUBLICADO` | `FALHOU` | `CANCELADO`, além de `AGUARDANDO_CONFIRMACAO` (agendamento perdido, RF07).
- [ ] A publicação mostra um resumo, por exemplo "47 publicados · 3 falharam".
- [ ] Destino publicado: link direto para o post no Instagram.
- [ ] Destino com falha: mensagem compreensível em português, com o erro técnico disponível para consulta.
- [ ] A tela atualiza o status sem precisar recarregar.

## RF09 — Tentar de novo (P0)

**Quero** reenviar apenas para as contas que falharam.

- [ ] Botão "Tentar novamente" por destino e "Tentar todas as falhas" por publicação.
- [ ] Antes de reenviar, o sistema confere se o post **já não foi publicado** naquela conta, para não duplicar.
- [ ] Falhas temporárias (instabilidade da Meta, limite de chamadas) são retentadas automaticamente algumas vezes antes de virar `FALHOU`.
- [ ] Só é possível tentar de novo enquanto a mídia estiver guardada (prazo em [RNF04](03-requisitos-nao-funcionais.md#rnf04--segurança-e-retenção)). Depois disso, a opção é duplicar a publicação e reenviar a mídia.

## RF10 — Histórico e calendário (P1)

- [ ] Lista de publicações com filtros (status, tipo, conta, período).
- [ ] Calendário com as publicações agendadas e as já feitas.
- [ ] Posso **duplicar** uma publicação antiga (tipo, legenda e contas). Como as mídias são apagadas (D4), é preciso enviá-las de novo.
- [ ] O histórico mostra miniaturas a partir do próprio Instagram (`media_url`/`thumbnail_url` do post publicado), sem guardar a mídia original.

## RF11 — Notificações por e-mail (P0)

Canal: **e-mail** (D6). Agora é P0, porque o fluxo de agendamento perdido (D5) depende dele.

- [ ] E-mail quando uma publicação termina com **alguma falha**: resumo, contas que falharam com o motivo e link para a tela da publicação.
- [ ] E-mail quando houver destinos em `AGUARDANDO_CONFIRMACAO`.
- [ ] E-mail quando o token da Meta estiver inválido.
- [ ] Sem e-mail quando tudo dá certo (P2: resumo diário opcional).

## RF12 — Acesso à aplicação (P0)

- [ ] A aplicação fica na internet, então exige **login** mesmo com um único usuário.
- [ ] Login principal: **"Entrar com Facebook"**, aceito só para o ID do Facebook autorizado (RF13).
- [ ] Login alternativo: **link mágico por e-mail**, enviado só para o e-mail do admin cadastrado. Link de uso único, válido por 15 min. Disponível depois que o Resend estiver configurado.
- [ ] Qualquer outro e-mail ou conta do Facebook recebe a mesma mensagem genérica, sem revelar se o e-mail existe. Pedidos de link têm limite de tentativas.
- [ ] A sessão fica salva no celular (~30 dias), para não precisar logar toda vez.
- [ ] Recuperação total (sem Facebook e sem e-mail): comando via SSH na VPS reabre o `/setup`.

## RF13 — Painel de admin: integrações e configurações (P0)

**Quero** cadastrar e trocar as contas, chaves e configurações pelo próprio sistema **para** não depender de editar arquivos no servidor nem de redeploy.

**Integrações**
- [ ] **Meta**: App ID, App Secret e token do System User. Mostra validade, permissões concedidas e quantas contas do Instagram o token alcança. Tem os botões "Testar" e "Sincronizar contas".
- [ ] **Cloudflare R2**: Account ID, bucket, Access Key e Secret. Botão "Testar".
- [ ] **Resend**: chave da API e e-mail remetente. Botão "Enviar e-mail de teste".

**Configurações gerais**
- [ ] E-mail que recebe os avisos (RF11).
- [ ] Usuário autorizado a entrar (ID do Facebook).
- [ ] Parâmetros com valores padrão: retenção de mídia com falha (24 h), tolerância de atraso do agendamento (15 min), concorrência de publicação (10).

**Segurança**
- [ ] Segredos são somente escrita: depois de salvos, aparecem mascarados e nunca são devolvidos ao navegador.
- [ ] Alterações ficam num log de auditoria (o quê, quando), sem o valor.
- [ ] Primeiro acesso por um assistente `/setup` protegido por token, trancado depois do primeiro login. Ver [06 — Configuração e segredos](06-proposta-de-stack.md#configuração-e-segredos-painel-de-admin--rf13).
- [ ] Integração não configurada ou com falha no teste: um aviso no topo do sistema, e a publicação fica bloqueada com o motivo.

---

## Pós-MVP (P2)

- Legenda personalizada por conta (variáveis ou hashtags por conta)
- Métricas básicas (alcance, curtidas, comentários)
- Primeiro comentário automático (ex.: hashtags no comentário)
- Colaboradores, marcação de pessoas e localização
- Publicação nas Páginas do Facebook
- Espaçar publicações entre contas (descartado no MVP: D7 = ao mesmo tempo)
