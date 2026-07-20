# Prospect Hunter — Progresso da Análise

**Data:** 2026-04-13
**Status:** Em andamento — pausado após Etapa A

---

## Contexto do Projeto

**Sistema:** Prospect Hunter
**Empresa:** L3A Digital
**Serviço:** Gestão de Google Meu Negócio
**Valor:** R$300/mês (recorrência)
**Equipe:** André + equipe
**Canal de prospecção:** WhatsApp
**Tom de comunicação:** Neutro/profissional
**Prova social:** Ainda não possui (a construir)
**Intervalo da cadência:** 2 dias entre mensagens

---

## Agentes Acionados

- ✅ `@process-archaeologist` — Mapeamento de processos
- ✅ `@aaron-ross` — Análise de funil (Predictable Revenue)
- ✅ `@neil-rackham` — Scripts SPIN Selling
- ✅ `@forge-chief` — Arquitetura consolidada do sistema

---

## Macroprocessos Mapeados

1. **Mapeamento de Empresas** — busca por localidade/nicho, classificação por status GMN
2. **Análise GBP Check** — extração via ferramenta externa, score + relatório
3. **Cadência WhatsApp** — 6 mensagens em 11 dias, estrutura SPIN
4. **Conversão & Recorrência** — fechamento, onboarding, manutenção mensal

---

## 2 Funis Identificados

| Funil       | Público                | Oferta                                |
| ----------- | ---------------------- | ------------------------------------- |
| **Funil A** | Empresa COM perfil GMN | Otimização + gestão recorrente        |
| **Funil B** | Empresa SEM perfil GMN | Criação do perfil + gestão recorrente |

---

## Arquitetura do Sistema (Módulos)

| Prioridade | Módulo                  | Status             |
| ---------- | ----------------------- | ------------------ |
| 🔴 P1      | Radar de Empresas       | A definir          |
| 🔴 P1      | GBP Check               | A definir          |
| 🟡 P2      | Cadência WhatsApp       | Scripts prontos ✅ |
| 🟡 P2      | Gestão de Pipeline      | A definir          |
| 🟢 P3      | Conversão & Recorrência | A definir          |

---

## Scripts Produzidos

### Funil A — Empresa COM perfil GMN (6 mensagens / 11 dias)

- Msg 1 (Dia 1) — Situação: apresentação + oferta de análise
- Msg 2 (Dia 3) — Problema: envio do relatório GBP + pontos críticos
- Msg 3 (Dia 5) — Implicação: custo de não aparecer antes do concorrente
- Msg 4 (Dia 7) — Necessidade: benefícios de um perfil otimizado
- Msg 5 (Dia 9) — Oferta: R$300/mês, sem fidelidade
- Msg 6 (Dia 11) — Quebra de padrão: mensagem direta e respeitosa

### Funil B — Empresa SEM perfil GMN (6 mensagens / 11 dias)

- Msg 1 (Dia 1) — Situação: empresa não encontrada no Google
- Msg 2 (Dia 3) — Problema: print mostrando ausência vs concorrentes
- Msg 3 (Dia 5) — Implicação: invisibilidade digital e perda de clientes
- Msg 4 (Dia 7) — Necessidade: o que muda com o perfil criado
- Msg 5 (Dia 9) — Oferta: criação + gestão por R$300/mês
- Msg 6 (Dia 11) — Quebra de padrão: mensagem leve de encerramento

---

## Gaps Identificados (a resolver)

| #   | Gap                                                                                         | Impacto |
| --- | ------------------------------------------------------------------------------------------- | ------- |
| 1   | Processo de mapeamento de empresas SEM GMN não estruturado                                  | Alto    |
| 2   | Critérios de qualificação do lead não definidos                                             | Alto    |
| 3   | ✅ RESOLVIDO no código — gatilhos de resposta E silêncio já implementados (ver nota abaixo) | Médio   |
| 4   | Transição entre prospecção e venda pouco clara                                              | Médio   |
| 5   | Onboarding pós-venda não mapeado                                                            | Médio   |

---

## Próximos Passos (pendentes)

- [x] **B** — Definir critérios de qualificação de leads ✅ (2026-07-20)
      → Implementado em `lib/lead-qualification.ts` (+ testes em `__tests__/unit/lead-qualification.test.ts`).
      → Score de fit comercial (0–100) baseado em 3 dimensões: necessidade (55%), abordabilidade (25%) e potencial (20%).
      → Recomenda funil automaticamente: A (com perfil GMN) ou B (sem perfil GMN).
      → Pesos calibrados e validados com a L3A (2026-07-20):
      • Abordabilidade 25% — lead sem WhatsApp é "ruim, mas recuperável" (não zera).
      • Empresa com GMN já forte fica em "Media" (vale como upsell), não cai para "Baixa".
      • Limiar de prioridade "Alta" mantido em score ≥ 60.
      → INTEGRADO na fonte Google Places (`normalizeGooglePlace` em lib/connectors/normalizers.ts):
      popula qualificationScore, funnel e contactable, sem alterar o `score` de popularidade.
      Instagram/LinkedIn (Apify) ainda usam só o score de popularidade — integração pendente.
- [x] **C** — Mapear integrações técnicas necessárias ✅ (2026-07-20)
      → Documentado em `docs/integracoes-tecnicas.md` (Apify, Google Places, conectores próprios,
      Gemini, Uazapi, Supabase, orquestração) com env vars, status e fallback de cada uma.
- [ ] Adicionar prova social nos scripts quando disponível
- [x] Criar gatilhos de resposta para sair da cadência automática ✅ (JÁ RESOLVIDO no código)
      → Gatilho de RESPOSTA: `app/api/outreach/webhook/route.ts` trata negativa (→ Perdido),
      bot (ignora), positiva (→ Contato/Diagnóstico/Proposta) e confirmação de decisor.
      → Gatilho de SILÊNCIO: `lib/outreach-orchestrator.ts:332` move o lead para "Perdido"
      após 2 follow-ups sem resposta e notifica o dono.
      → Nenhum código novo necessário — o gap do progresso.md (escrito em abr/2026) já foi
      coberto pela evolução do sistema.
- [ ] Detalhar processo de onboarding pós-venda
