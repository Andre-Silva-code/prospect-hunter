# Serper.dev — Alternativa de custo baixo ao Apify (Instagram)

Este guia mostra como configurar o **Serper.dev** para a prospecção de perfis do
Instagram. É a alternativa **recomendada** ao Apify: **não exige projeto no
Google Cloud, nem billing, nem cartão de crédito** — diferente do Google Custom
Search. Começa com **2.500 buscas gratuitas**.

## Por que Serper em vez do Apify?

O Apify, na fonte Instagram, apenas roda uma **busca no Google** por perfis
públicos (`site:instagram.com "nicho" "cidade"`). O Serper faz exatamente essa
mesma busca, de forma mais barata e estável — sem depender de créditos do Apify
(que podem retornar erro 402 quando acabam).

> Limitação (igual ao Apify): retorna o **perfil público** (nome, @usuário, link
> e a bio que aparece na busca). Não entra no Instagram para ler seguidores/posts.

---

## Passo a passo (leva ~3 minutos)

1. Acesse <https://serper.dev>.
2. Clique em **Sign in** / **Get started** e faça login com sua conta Google.
3. No painel (dashboard), abra a seção **API Key**.
4. Copie a chave que já vem criada lá.
5. Cole no arquivo `.env.local`, na raiz do projeto:

```env
SERPER_API_KEY=sua_chave_aqui
```

Pronto. Da próxima vez que a aplicação rodar uma busca de **Instagram**, ela vai
usar o Serper automaticamente.

---

## Ordem de prioridade das fontes (Instagram)

O sistema tenta os conectores nesta ordem, caindo para o próximo se um não
retornar resultados:

1. **Serper.dev** (se `SERPER_API_KEY` estiver preenchida) ← recomendado
2. **Google Custom Search** (se `GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_ID`) — ver
   `docs/google-cse-setup.md`
3. **Apify** (fallback, se `APIFY_TOKEN` estiver configurado)

Nada foi removido: o Apify continua disponível como reserva.

---

## Como saber se funcionou

- Faça uma busca de prospecção com a fonte **Instagram** selecionada.
- No status do conector deve aparecer **"X lead(s) via Serper"**.

## Limites e custos

| Item                      | Valor                      |
| ------------------------- | -------------------------- |
| Buscas gratuitas iniciais | 2.500                      |
| Custo após o gratuito     | ~US$ 0,30 por 1.000 buscas |
| Resultados por busca      | até 10                     |

Para o uso atual (~100 buscas/dia), o pacote gratuito dura bastante.

## Desligar temporariamente

Para desativar o Serper sem apagar a chave, adicione no `.env.local`:

```env
SERPER_ENABLED=false
```

Nesse caso, o Instagram cai para o Google CSE (se configurado) e depois o Apify.
