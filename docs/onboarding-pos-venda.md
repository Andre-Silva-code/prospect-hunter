# Onboarding Pós-Venda — Prospect Hunter

**Gap 5 do `progresso.md`** — processo de onboarding do cliente após o fechamento.
**Status:** PROPOSTA para validação (não implementado em código)
**Atualizado:** 2026-07-21

Serviço: Gestão de Google Meu Negócio · R$300/mês · L3A Digital

---

## Contexto

Hoje, quando um lead chega ao estágio **"Fechado"** no pipeline, o sistema
simplesmente para (`lib/followup.ts` retorna null para leads Fechado/Perdido).
Não há processo estruturado do que acontece depois da venda.

Este documento propõe um fluxo de onboarding para os **primeiros 30 dias** do
cliente, transformando uma venda em uma recorrência estável.

---

## Objetivo do onboarding

1. **Reduzir churn inicial** — o cliente precisa ver valor rápido para não cancelar.
2. **Coletar acessos** — sem acesso ao perfil GMN, o serviço não roda.
3. **Definir expectativas** — o que a L3A faz, quando, e como o cliente acompanha.

---

## Fluxo proposto (Dia 0 → Dia 30)

| Quando  | Etapa                           | Ação                                                                          | Responsável           |
| ------- | ------------------------------- | ----------------------------------------------------------------------------- | --------------------- |
| Dia 0   | Boas-vindas                     | Mensagem de confirmação + agradecimento + próximos passos                     | Automático (WhatsApp) |
| Dia 0–1 | Coleta de acessos               | Solicitar acesso ao perfil GMN (ou dados para criação, no Funil B)            | Manual (equipe)       |
| Dia 1–3 | Setup inicial                   | Auditoria do perfil, correção de dados básicos (endereço, horário, categoria) | Manual (equipe)       |
| Dia 3–5 | Primeira entrega                | Enviar ao cliente o "antes/depois" do perfil                                  | Manual (equipe)       |
| Dia 7   | Check-in 1                      | Confirmar que o cliente viu as melhorias, tirar dúvidas                       | Semi-automático       |
| Dia 15  | Primeira otimização de conteúdo | Postagens, fotos, resposta a avaliações                                       | Manual (equipe)       |
| Dia 30  | Check-in 1 mês                  | Enviar relatório do primeiro mês + renovar expectativa do próximo             | Semi-automático       |

---

## Decisões pendentes (precisam do André / L3A)

Estas escolhas definem como o processo seria implementado — não dá para
inventá-las sem validação:

1. **Automação:** quais etapas viram mensagem automática (via cadência de
   WhatsApp existente) e quais permanecem manuais da equipe?
2. **Coleta de acesso GMN:** qual o método padrão? (convite de proprietário no
   Google, compartilhamento de login, procuração?)
3. **Entregável do Dia 30:** existe um formato de relatório mensal definido?
   (O sistema já gera PDF GBP Check — pode ser reaproveitado?)
4. **Gatilho no sistema:** o onboarding deve ser disparado automaticamente
   quando o lead entra em "Fechado", ou iniciado manualmente pela equipe?

---

## Possível implementação futura (quando o processo for validado)

Se/quando o processo acima for aprovado, a implementação técnica natural seria:

- Um novo status de fila de outreach para pós-venda (ex.: `onboarding_day_0`,
  `onboarding_day_7`, `onboarding_day_30`), espelhando o padrão já usado em
  `post_analysis_1/2` no `lib/outreach-orchestrator.ts`.
- Um gatilho quando `lead.stage` muda para "Fechado".
- Templates de mensagem de onboarding, no mesmo estilo de
  `generateGmnFollowUpMessage`.

**Importante:** nada disso deve ser codificado antes das 4 decisões acima
serem tomadas — senão o risco é construir um fluxo que não corresponde à
operação real da L3A.
