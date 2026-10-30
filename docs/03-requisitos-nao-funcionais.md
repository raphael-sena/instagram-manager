# 03 — Requisitos não funcionais

## RNF01 — Responsividade e uso no celular
- Mobile-first: todos os fluxos (criar, selecionar contas, agendar, acompanhar) funcionam bem numa tela de celular.
- Upload de arquivos grandes pelo celular (Reels de até 300 MB), com barra de progresso e tolerância a conexão instável.
- Desejável: instalável na tela inicial (PWA).

## RNF02 — Confiabilidade da publicação
- Publicar é um **processo em segundo plano**. Fechar o navegador não interrompe nada.
- Cada destino é processado de forma **independente**: a falha em uma conta não afeta as outras.
- **Idempotência**: um destino nunca gera dois posts na mesma conta, nem com retentativas ou reinício do servidor.
- O agendador sobrevive a reinícios. Agendamentos perdidos durante uma queda **não são publicados automaticamente**: vão para `AGUARDANDO_CONFIRMACAO` e geram um e-mail (D5).
- Nenhum destino fica preso em `PROCESSANDO`: há um tempo máximo e, depois dele, o destino vira `FALHOU` com o motivo.

## RNF03 — Desempenho
- 50 destinos de uma publicação concluídos em poucos minutos. O tempo de processamento de vídeo pela Meta é o fator dominante.
- O processamento em paralelo respeita os limites de chamadas da Meta. Ver [04](04-integracao-meta.md#limites).

## RNF04 — Segurança e retenção
- Tokens da Meta ficam **criptografados** e só no servidor, nunca no navegador.
- Login obrigatório, sessão segura (HTTPS, cookie seguro) e proteção contra força bruta.
- As URLs públicas de mídia são difíceis de adivinhar (nomes aleatórios).
- **Retenção (D4: apagar logo):**
  - Todos os destinos `PUBLICADO` ou `CANCELADO`: a mídia é apagada **imediatamente**.
  - Algum destino `FALHOU` ou `AGUARDANDO_CONFIRMACAO`: a mídia fica guardada por **até 24 h** para permitir tentar de novo, e depois é apagada.
  - Rascunhos e agendamentos futuros mantêm a mídia até serem publicados ou excluídos.
  - Um job de limpeza remove mídias órfãs (uploads abandonados).
- Credenciais de integração (App Secret da Meta, token do System User, R2, Resend) ficam no banco, criptografadas com a chave-mestra, e são geridas pelo painel de admin (RF13). Só os segredos de bootstrap ficam em variáveis de ambiente. Nada disso vai para o repositório.

## RNF05 — Observabilidade
- Log de cada chamada à API da Meta por destino (endpoint, resposta, código de erro), consultável na tela do destino.
- Erros da Meta traduzidos para mensagens em português.

## RNF06 — Custos
- Meta: **gratuito**.
- Meta de custo de infraestrutura: o mais próximo possível de zero, priorizando free tiers.
- **Atenção ao egress do storage**: a Meta baixa a mídia **uma vez por conta**. Um Reels de 200 MB publicado em 50 contas gera ~10 GB de download. Storage sem cobrança de egress (ex.: Cloudflare R2) é um bom candidato.

## RNF07 — Fuso horário e idioma
- Interface em português do Brasil.
- Horários exibidos em America/Sao_Paulo e armazenados em UTC.
