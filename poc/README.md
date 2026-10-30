# Prova de conceito — Instagram Graph API (fase 0)

Script descartável que responde às perguntas abertas da fase 0 antes de construir o produto ([docs/07](../docs/07-plano-de-implementacao.md#fase-0--preparação-e-prova-de-conceito-p)). Publica **só** na conta de teste.

## Pré-requisitos
- Etapas A–D do [guia da fase 0](../docs/guias/fase-0-preparacao.md) concluídas
- Node 24+, pnpm, ffmpeg (`brew install ffmpeg`)

## Rodar
```sh
cp .env.example .env      # preencha com os valores do gerenciador de senhas
pnpm install
pnpm start                # todos os testes
pnpm start --so imagem    # só alguns: imagem, carrossel, reels, story-imagem, story-video
pnpm start --manter       # não apaga os posts publicados no fim
```

## O que ele faz
1. Valida o token do System User (`debug_token`): tipo, validade e permissões.
2. Lista as contas que o token alcança e recusa seguir se `IG_USERNAME_TESTE` não estiver entre elas.
3. Lê o limite de publicação (`content_publishing_limit`).
4. Gera mídias de teste com o ffmpeg (`midias/`) e as envia ao R2 com URLs pré-assinadas de 3 h.
5. Publica imagem, carrossel (2 imagens + 1 vídeo), Reels, Story de imagem e Story de vídeo.
6. Chama `media_publish` duas vezes com o mesmo container (risco de duplicidade).
7. Apaga os objetos do R2 e tenta apagar os posts pela API.
8. Grava `saida/resultado-*.json`, com todas as chamadas e respostas e **sem nenhum segredo**.
