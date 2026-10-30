# 05 — Decisões

## Produto / negócio — decididas (30/10/2026)

| # | Pergunta | Decisão | Consequência |
|---|---|---|---|
| D1 | As contas estão num Business Portfolio? | **Sim** | Autenticação via token de **System User** (não expira). Ver [04](04-integracao-meta.md#autenticação) |
| D2 | As contas são profissionais e estão vinculadas a Páginas? | **Sim** | Todas podem publicar via API |
| D3 | Post de vídeo sai como Reels? | **Sim**, `media_type=REELS` com `share_to_feed=true` | O tipo "Post" de vídeo é um Reels que também aparece no feed |
| D4 | Retenção das mídias | **Apagar logo** | Apagadas quando a publicação termina; com falhas, guardadas por até 24 h para nova tentativa. Ver a regra em [RNF04](03-requisitos-nao-funcionais.md#rnf04--segurança-e-retenção) |
| D5 | Agendamento perdido (servidor fora do ar no horário) | **Pedir confirmação** | O destino vai para `AGUARDANDO_CONFIRMACAO` e eu decido entre publicar agora, reagendar ou cancelar |
| D6 | Canal de notificação | **E-mail** | É preciso um serviço de envio de e-mail transacional |
| D7 | Simultâneo ou espaçado | **Ao mesmo tempo** | Todos os destinos começam juntos. O paralelismo continua limitado pelos limites de chamadas da Meta |
| D8 | Marcar como gerado por IA | **Não** | Campo `is_ai_generated` não será exposto |

## Técnicas — próxima fase

- Stack do front-end (web responsiva / PWA)
- Stack do back-end e da fila/agendador de jobs
- Banco de dados
- Storage de mídia com URL pública (avaliar o egress: R2, S3, Supabase…)
- Serviço de e-mail transacional
- Hospedagem e deploy
- Login da aplicação (usuário único)
- Processamento de mídia no servidor (conversão HEIC/PNG → JPEG, validação de vídeo)
- Padrões de código, testes e CI
