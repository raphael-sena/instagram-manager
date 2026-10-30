# 01 — Visão do produto

## Problema

Gerencio cerca de **50 contas do Instagram**, todas ligadas à minha conta do Facebook. O mesmo conteúdo costuma ir para várias delas, e hoje cada publicação tem que ser feita à mão, conta por conta. É lento, fácil de errar e não dá para ver de forma simples o que foi publicado e onde.

## Objetivo

Criar o conteúdo **uma vez**, escolher **em quais contas** ele vai, publicar **na hora ou agendado** e **acompanhar o resultado em cada conta**.

## Usuário

- Um único usuário: o dono das contas.
- Usa o celular e o computador, então a aplicação é **web responsiva** (mobile-first).

## Escopo (MVP)

1. Conectar a conta Meta e importar automaticamente as contas do Instagram vinculadas.
2. Criar publicações dos tipos **Post** (imagem ou vídeo), **Carrossel**, **Reels** e **Story**.
3. Usar uma **legenda única** por publicação, igual para todas as contas.
4. **Selecionar as contas de destino** de cada publicação, uma a uma, todas de uma vez ou por grupos salvos.
5. **Publicar agora** ou **agendar** para uma data e hora.
6. Acompanhar o **status por conta** (aguardando, processando, publicado, falhou), com o motivo do erro e o link do post.
7. **Tentar de novo** só nos destinos que falharam.
8. **Histórico** e calendário das publicações.
9. Notificar **por e-mail** quando houver falha ou um agendamento precisar de confirmação.

## Fora de escopo (por enquanto)

- Vários usuários ou equipe
- Legenda diferente por conta
- Métricas e insights pós-publicação
- Responder comentários ou mensagens (DMs)
- Publicar em Páginas do Facebook, TikTok etc.
- Editor de imagem ou vídeo. O conteúdo chega pronto.
- Contas que não são minhas (exigiria App Review da Meta)

## Indicadores de sucesso

- Publicar um conteúdo em 50 contas em **menos de 2 minutos de interação humana**.
- **100% dos destinos** terminam com um status final claro (publicado ou falhou com motivo), sem estados "perdidos".
- **Nenhum post duplicado** por causa de reprocessamento.
