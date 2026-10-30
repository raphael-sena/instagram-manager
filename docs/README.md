# Documentação — Instagram Manager

Documentação de produto e de integração, escrita **antes** de qualquer decisão de tecnologia.

| Documento | Conteúdo |
|---|---|
| [01 — Visão do produto](01-visao-do-produto.md) | Problema, objetivo, usuário, escopo e fora de escopo |
| [02 — Requisitos funcionais](02-requisitos-funcionais.md) | Funcionalidades em histórias de usuário com critérios de aceite |
| [03 — Requisitos não funcionais](03-requisitos-nao-funcionais.md) | Segurança, confiabilidade, responsividade, custos |
| [04 — Integração com a Meta](04-integracao-meta.md) | Como a API do Instagram funciona, autenticação, fluxo de publicação, limites e especificações de mídia |
| [05 — Decisões](05-decisoes-em-aberto.md) | Decisões de produto tomadas e decisões técnicas pendentes |

## Glossário

| Termo | Significado |
|---|---|
| **Conta** | Uma conta profissional (Business/Creator) do Instagram vinculada a uma Página do Facebook |
| **Publicação** | O conteúdo criado uma vez no sistema (mídias + legenda + tipo + agendamento) |
| **Destino** | O par *publicação × conta*. Uma publicação para 30 contas gera 30 destinos, cada um com status próprio |
| **Container** | Objeto temporário criado na API da Meta antes de publicar. É criado por conta e expira em 24 h |
| **Tipo de publicação** | Post (imagem ou vídeo no feed), Carrossel, Reels ou Story |
| **Grupo de contas** | Seleção salva de contas para reutilizar (ex.: "Todas de BH") |
| **System User** | Usuário técnico do Meta Business Manager cujo token não expira |
