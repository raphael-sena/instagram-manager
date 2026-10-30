# Guia — Fase 0: preparação

Passo a passo das configurações manuais que só você pode fazer (exigem o seu login na Meta e na Cloudflare). Faça **na ordem**. Cada etapa termina com um ✅ **checkpoint**: me mande o que ele pede e seguimos.

> 🔒 **Nunca cole no chat**: App Secret, tokens da Meta e chaves do R2. Guarde no seu gerenciador de senhas. Quando o script precisar deles, você mesmo os coloca num arquivo local (`poc/.env`, fora do git).
>
> As telas da Meta mudam com frequência. Se algum nome de menu não bater, me mande um print que eu ajusto o guia.

Para o teste da API só precisamos das etapas **A a D**. Resend e túnel da Cloudflare ficam para a fase 1.

---

## A. Criar a conta de teste do Instagram (~10 min)

Por quê: os testes vão publicar e apagar posts. Fazemos isso numa conta sem público, e não nas suas 50 contas.

1. No app do Instagram: **perfil → trocar de conta → Adicionar conta → Criar nova conta**.
   - Use um e-mail seu (pode ser um alias, ex.: `seuemail+igteste@gmail.com`).
   - Nome sugerido: `kvaris.teste.ig` (ou o que estiver livre).
2. Deixe a conta **privada** por enquanto, se quiser. Isso não atrapalha a API.
3. Converta para conta profissional: **Configurações → Tipo de conta e ferramentas → Mudar para conta profissional → Empresa**.
4. Crie uma **Página do Facebook** para ela, no seu Business Portfolio:
   - [business.facebook.com](https://business.facebook.com) → **Configurações** → **Contas → Páginas → Adicionar → Criar uma nova Página**. Nome: `Instagram Manager Teste`.
5. Vincule a conta do Instagram à Página e ao Portfolio:
   - **Configurações → Contas → Contas do Instagram → Adicionar** e faça login com a conta de teste.
   - Na Página: **Configurações → Contas vinculadas → Instagram → Conectar**.

✅ **Checkpoint A:** me mande o **@ da conta de teste** e confirme que ela aparece no Business Portfolio vinculada à Página.

---

## B. Criar o app na Meta for Developers (~5 min)

1. Acesse [developers.facebook.com/apps](https://developers.facebook.com/apps) → **Criar app**.
2. Nome: `Instagram Manager`. E-mail de contato: o seu.
3. Caso de uso: escolha a opção de **gerenciar mensagens e conteúdo no Instagram** (ou "Outro" → tipo **Empresa/Business**, se essa opção não aparecer).
4. Vincule o app ao seu **Business Portfolio** quando for perguntado.
5. Depois de criado, em **Configurações do app → Básico**, anote:
   - **ID do app** (pode me mandar, não é secreto)
   - **Chave secreta do app** (App Secret) → **gerenciador de senhas, não me mande**
6. Deixe o app em **modo Desenvolvimento** (padrão). Isso faz parte do teste.

O Facebook Login (para entrar no sistema) é configurado só na fase 2.

✅ **Checkpoint B:** me mande o **ID do app**.

---

## C. Criar o System User e gerar o token (~10 min)

1. [business.facebook.com](https://business.facebook.com) → **Configurações** → **Usuários → Usuários do sistema → Adicionar**.
   - Nome: `instagram-manager`. Função: **Administrador**.
2. Com o System User selecionado → **Atribuir ativos**:
   - **Apps** → `Instagram Manager` → controle total.
   - **Páginas** → por enquanto **só** `Instagram Manager Teste` → controle total.
   - **Contas do Instagram** → a conta de teste → controle total.

   > As 50 contas reais só entram na fase 8. Assim nenhum teste consegue publicar nelas, nem por engano.
3. Ainda no System User → **Gerar novo token**:
   - App: `Instagram Manager`
   - Validade: **Nunca**
   - Permissões: `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`, `business_management`
4. Copie o token **direto para o gerenciador de senhas**. Ele só aparece uma vez.

✅ **Checkpoint C:** me diga só "token gerado" e, se houver, **algum aviso ou erro** que a tela mostrou (ex.: permissão indisponível em modo desenvolvimento). **Não mande o token.**

---

## D. Bucket R2 na Cloudflare (~5 min)

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **R2 Object Storage → Criar bucket**.
   - Nome: `instagram-midias`. Localização: automática. Acesso público: **desativado**.
2. **R2 → Gerenciar tokens de API → Criar token de API**:
   - Nome: `instagram-app`
   - Permissão: **Leitura e gravação de objetos**
   - Escopo: **apenas** o bucket `instagram-midias`
3. Guarde no gerenciador de senhas: **Access Key ID**, **Secret Access Key** e o **Account ID** (aparece na mesma tela e no endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`).

O bucket de backup e o token de backup ficam para a fase 1.

✅ **Checkpoint D:** me confirme "bucket e token criados". O Account ID pode ser mandado (não é secreto); as chaves, não.

---

## Depois dos checkpoints

Eu escrevo o script da prova de conceito em `poc/`, com um `poc/.env.example` listando as variáveis. Você copia para `poc/.env`, preenche com os valores do gerenciador de senhas e roda:

```
pnpm --dir poc install
pnpm --dir poc start
```

O script publica na conta de teste (imagem, carrossel, Reels, Story), mostra os resultados e apaga o que for possível. Você só me manda a saída, que não terá nenhum segredo.
