# Google Custom Search — Alternativa gratuita ao Apify (Instagram)

Este guia mostra como obter as **duas chaves gratuitas** que substituem o Apify
na prospecção de perfis do Instagram. É **100% grátis até 100 buscas por dia**.

Você vai precisar de duas coisas:

1. `GOOGLE_CSE_API_KEY` — a chave da API
2. `GOOGLE_CSE_ID` — o ID do mecanismo de busca

Leva uns 10 minutos e **não pede cartão de crédito** para o plano gratuito.

---

## Passo 1 — Criar o mecanismo de busca (pega o `GOOGLE_CSE_ID`)

1. Acesse: <https://programmablesearchengine.google.com/controlpanel/create>
2. Em **"Nome do mecanismo de pesquisa"**, escreva algo como `Prospect Hunter`.
3. Em **"O que pesquisar?"**, escolha a opção **"Pesquisar em toda a web"**.
4. Clique em **Criar**.
5. Na tela seguinte, clique em **"Personalizar"** (ou no nome do mecanismo).
6. Procure o campo **"ID do mecanismo de pesquisa"** (Search engine ID).
   Copie esse valor → é o seu **`GOOGLE_CSE_ID`**.

> Dica: garanta que a opção **"Pesquisar em toda a Web"** esteja **ativada** nas
> configurações. Sem isso, a busca só olha sites específicos e não acha os perfis.

---

## Passo 2 — Criar a chave da API (pega o `GOOGLE_CSE_API_KEY`)

1. Acesse: <https://console.cloud.google.com/>
2. No topo, selecione (ou crie) um projeto. Pode reutilizar o mesmo projeto que
   você já usa para o Gemini / Google Maps.
3. Ative a **Custom Search API**:
   - Vá em <https://console.cloud.google.com/apis/library/customsearch.googleapis.com>
   - Clique em **Ativar** (Enable).
4. Crie a credencial:
   - Vá em **APIs e serviços → Credenciais**
   - Clique em **Criar credenciais → Chave de API**
   - Copie a chave gerada → é o seu **`GOOGLE_CSE_API_KEY`**.

---

## Passo 3 — Colocar as chaves no projeto

Abra o arquivo `.env.local` (na raiz do projeto) e preencha:

```env
GOOGLE_CSE_API_KEY=sua_chave_aqui
GOOGLE_CSE_ID=seu_id_aqui
```

Pronto. Da próxima vez que a aplicação rodar uma busca de **Instagram**, ela vai
usar a Google Custom Search automaticamente. O Apify continua disponível como
reserva — se um dia você quiser voltar a usá-lo, basta ter o `APIFY_TOKEN`
configurado; nada foi removido.

---

## Como saber se funcionou

- Faça uma busca de prospecção com a fonte **Instagram** selecionada.
- No status do conector deve aparecer algo como **"X lead(s) via Google CSE"**.
- Se aparecer **"Google CSE indisponivel (403)"**, geralmente é a Custom Search
  API que ainda não foi ativada (volte ao Passo 2.3) ou a chave está restrita.

## Limites e custos

| Item                 | Valor                                    |
| -------------------- | ---------------------------------------- |
| Buscas gratuitas     | 100 por dia                              |
| Custo acima disso    | US$ 5 por 1.000 buscas (máx. 10.000/dia) |
| Resultados por busca | até 10 (limite da API)                   |

Para o uso atual (volume baixo, ~100 buscas/dia), o custo é **zero**.

## Desligar temporariamente

Se quiser desativar a CSE sem apagar as chaves, adicione no `.env.local`:

```env
GOOGLE_CSE_ENABLED=false
```

Nesse caso, o Instagram volta a usar o Apify (se configurado).
