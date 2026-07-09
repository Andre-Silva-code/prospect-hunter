# Configuração de Cron no EasyPanel — Prospect Hunter

> **Por que este documento existe:** o arquivo `vercel.json` na raiz do projeto define
> os crons **apenas para a Vercel**. Como o Prospect Hunter roda no **EasyPanel**, esses
> crons **NÃO são executados** — nada dispara o envio automático de mensagens, e os leads
> ficam parados na coluna "Novo" indefinidamente.
>
> Para o sistema funcionar, você precisa criar os crons manualmente no painel do EasyPanel,
> seguindo o passo a passo abaixo. **Faça isso uma única vez.**

---

## O que os crons fazem

| Cron                    | Rota                          | Frequência       | Função                                                                     |
| ----------------------- | ----------------------------- | ---------------- | -------------------------------------------------------------------------- |
| **Processar envios**    | `/api/outreach/process`       | a cada 2 min     | Envia as mensagens de primeiro contato que já estão agendadas e no horário |
| **Enriquecer WhatsApp** | `/api/outreach/enrich-phones` | a cada 30 min    | Tenta achar o WhatsApp dos leads que ainda não têm número válido           |
| **Follow-ups**          | `/api/outreach/follow-up`     | 1x por dia (13h) | Envia as mensagens de acompanhamento para quem não respondeu               |

---

## Pré-requisito: o segredo do cron (`OUTREACH_CRON_SECRET`)

Todas as rotas exigem um cabeçalho de autorização com um segredo, para que ninguém de fora
consiga disparar seus envios. Esse segredo é a variável de ambiente **`OUTREACH_CRON_SECRET`**.

1. No painel do EasyPanel, abra seu serviço **prospect-hunter**.
2. Vá em **Environment** (Variáveis de ambiente).
3. Confirme que existe uma variável `OUTREACH_CRON_SECRET` com um valor forte
   (ex.: uma senha longa e aleatória). Se não existir, crie uma. Exemplo de valor:
   ```
   OUTREACH_CRON_SECRET=uma-senha-bem-longa-e-aleatoria-troque-isto-12345
   ```
4. **Anote esse valor** — você vai usá-lo nos crons abaixo (substituindo `SEU_SEGREDO_AQUI`).

> ⚠️ Nunca use o valor de exemplo antigo `prospect-hunter-cron-secret-local` em produção.

---

## Passo a passo no EasyPanel

O EasyPanel tem uma seção de **Cron Jobs** / **Scheduled Tasks** por serviço. Para cada um
dos três crons abaixo, crie um novo agendamento usando `curl`.

> Troque **`https://SEU-DOMINIO`** pelo domínio real do seu app (o mesmo que você acessa no
> navegador), e **`SEU_SEGREDO_AQUI`** pelo valor de `OUTREACH_CRON_SECRET`.

### Cron 1 — Processar envios (a cada 2 minutos)

- **Schedule (cron expression):** `*/2 * * * *`
- **Comando:**
  ```bash
  curl -s -X POST https://SEU-DOMINIO/api/outreach/process \
    -H "Authorization: Bearer SEU_SEGREDO_AQUI"
  ```

### Cron 2 — Enriquecer WhatsApp (a cada 30 minutos)

- **Schedule (cron expression):** `*/30 * * * *`
- **Comando:**
  ```bash
  curl -s -X POST https://SEU-DOMINIO/api/outreach/enrich-phones \
    -H "Authorization: Bearer SEU_SEGREDO_AQUI"
  ```

### Cron 3 — Follow-ups (1x por dia, às 13h)

- **Schedule (cron expression):** `0 13 * * *`
- **Comando:**
  ```bash
  curl -s -X POST https://SEU-DOMINIO/api/outreach/follow-up \
    -H "Authorization: Bearer SEU_SEGREDO_AQUI"
  ```

---

## Como saber se está funcionando

1. Depois de configurar, aguarde ~2 minutos e crie/prospecte um lead novo dentro do
   horário comercial (seg–sex, 8h–18h).
2. O lead deve sair de "Novo" para "Contato" automaticamente em poucos minutos
   (respeitando o pequeno atraso configurado em `OUTREACH_DELAY_MS`).
3. Você pode testar o cron manualmente pelo terminal:
   ```bash
   curl -s -X POST https://SEU-DOMINIO/api/outreach/process \
     -H "Authorization: Bearer SEU_SEGREDO_AQUI"
   ```
   A resposta deve ser algo como `{"processed":1,"failed":0,"total":1}` ou
   `{"processed":0,"failed":0,"message":"Nada agendado"}` (se não houver lead pronto no momento).

### Se der `{"error":"Unauthorized"}`

O segredo do cron está diferente do valor em `OUTREACH_CRON_SECRET`. Confira se são idênticos
(sem espaços a mais) e se o app foi reiniciado após alterar a variável de ambiente.

---

## Observação: teste local (desenvolvimento)

Para rodar no seu Mac durante o desenvolvimento, existe o script `npm run outreach:cron`, que
faz o polling a cada 60s apontando para `http://localhost:3000`. **Isso é só para testes locais**
— em produção, use os crons do EasyPanel descritos acima, que são muito mais confiáveis
(não dependem de um terminal aberto nem param quando o servidor reinicia).
