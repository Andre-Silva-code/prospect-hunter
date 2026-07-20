import type { LeadPriority } from "@/types/prospecting";

/**
 * Qualificação de leads para o serviço de Gestão de Google Meu Negócio (L3A Digital).
 *
 * Diferente do `score` de popularidade calculado nos connectors (que mede o "tamanho"
 * da empresa via nota + avaliações + seguidores), este módulo mede o **fit comercial**:
 * o quanto o lead PRECISA do serviço e o quanto é ABORDÁVEL.
 *
 * Referência de negócio: docs/progresso.md (Tarefa B — critérios de qualificação),
 * Funil A (empresa COM perfil GMN) e Funil B (empresa SEM perfil GMN).
 *
 * Módulo puro e sem efeitos colaterais: não altera connectors, APIs, banco ou env.
 * Pode ser plugado no fluxo existente quando desejado, sem quebrar o que já roda.
 */

export type QualificationSignals = {
  /** Empresa tem site próprio? Ausência = maior necessidade de presença digital. */
  hasWebsite?: boolean;
  /** Empresa tem perfil no Google Meu Negócio? Define Funil A (true) vs Funil B (false). */
  hasGoogleProfile?: boolean;
  /** Nota média no Google (0–5). Nota baixa = espaço para melhorar. */
  rating?: number;
  /** Quantidade de avaliações. Poucas avaliações = perfil pouco trabalhado. */
  reviewCount?: number;
  /** Telefone/WhatsApp normalizado e válido? Sem contato, a cadência trava. */
  hasValidPhone?: boolean;
};

export type QualificationFunnel = "A" | "B";

export type QualificationResult = {
  /** Score de fit comercial de 0 a 100 (quanto maior, melhor o lead para a L3A). */
  qualificationScore: number;
  /** Prioridade derivada do score, no mesmo vocabulário do resto do sistema. */
  priority: LeadPriority;
  /** Funil recomendado: "A" (tem perfil GMN) ou "B" (não tem). */
  funnel: QualificationFunnel;
  /** Lead abordável agora? False quando não há contato válido. */
  contactable: boolean;
  /** Motivos legíveis que explicam o score (para exibir na interface). */
  reasons: string[];
};

/**
 * Pesos de cada dimensão do score de fit (somam 100).
 *
 * Calibrados com a L3A em 2026-07-20:
 * - Abordabilidade em 25%: lead sem WhatsApp é "ruim, mas recuperável" (contato
 *   pode ser achado por outros meios) — penaliza, mas não zera o lead.
 * - Empresa já bem servida (GMN forte) permanece em "Media", não cai para "Baixa":
 *   ainda vale como upsell de gestão contínua. Por isso 'need' não zera o score.
 */
const WEIGHTS = {
  need: 55, // O quanto a empresa PRECISA do serviço (fit principal)
  contactability: 25, // O quanto é abordável (canal aberto)
  potential: 20, // Potencial de conversão/recorrência
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Componente "necessidade": mede o quanto o perfil digital da empresa está fraco.
 * Empresas sem site, sem perfil GMN, com nota baixa ou poucas avaliações têm
 * mais a ganhar com o serviço — logo, mais fit. Retorna 0–1.
 */
function needFactor(signals: QualificationSignals, reasons: string[]): number {
  let factor = 0;

  if (signals.hasGoogleProfile === false) {
    factor += 0.45;
    reasons.push("Sem perfil no Google Meu Negócio (invisível na busca)");
  }

  if (signals.hasWebsite === false) {
    factor += 0.25;
    reasons.push("Sem site próprio (baixa presença digital)");
  }

  // Nota baixa só conta como necessidade quando há perfil (Funil A).
  if (signals.hasGoogleProfile !== false && typeof signals.rating === "number") {
    if (signals.rating > 0 && signals.rating < 4) {
      factor += 0.2;
      reasons.push(`Nota ${signals.rating.toFixed(1)} no Google (espaço para melhorar)`);
    }
  }

  if (typeof signals.reviewCount === "number" && signals.reviewCount < 15) {
    factor += 0.1;
    reasons.push("Poucas avaliações (perfil pouco trabalhado)");
  }

  return clamp(factor, 0, 1);
}

/**
 * Componente "abordabilidade": há canal para iniciar a cadência de WhatsApp?
 * Sem telefone válido, o lead é praticamente inabordável. Retorna 0–1.
 */
function contactabilityFactor(signals: QualificationSignals, reasons: string[]): number {
  if (signals.hasValidPhone === true) {
    reasons.push("Contato de WhatsApp válido (cadência pode iniciar)");
    return 1;
  }
  if (signals.hasValidPhone === false) {
    reasons.push("Sem telefone válido (difícil iniciar a cadência)");
    return 0;
  }
  // Desconhecido: assume um meio-termo neutro em vez de penalizar.
  return 0.5;
}

/**
 * Componente "potencial": empresa minimamente estabelecida (tem alguma tração)
 * tende a ter caixa para uma recorrência de R$300/mês. Retorna 0–1.
 */
function potentialFactor(signals: QualificationSignals): number {
  const reviews = signals.reviewCount ?? 0;
  // Escala logarítmica: cresce rápido no começo e satura.
  return clamp(Math.log10(reviews + 1) / 2, 0, 1);
}

function scoreToPriority(score: number): LeadPriority {
  // Limiar de "Alta" em 60 (validado com a L3A em 2026-07-20): um lead com forte
  // necessidade (sem GMN + sem site) e contatável soma ~64 mesmo sem avaliações —
  // e esse é justamente o lead ideal do Funil B, então merece prioridade alta.
  if (score >= 60) return "Alta";
  if (score >= 40) return "Media";
  return "Baixa";
}

/**
 * Qualifica um lead a partir dos seus sinais brutos.
 * Retorna score de fit (0–100), prioridade, funil recomendado, se é abordável
 * e a lista de motivos legíveis.
 */
export function qualifyLead(signals: QualificationSignals): QualificationResult {
  const reasons: string[] = [];

  const need = needFactor(signals, reasons);
  const contactability = contactabilityFactor(signals, reasons);
  const potential = potentialFactor(signals);

  const raw =
    need * WEIGHTS.need + contactability * WEIGHTS.contactability + potential * WEIGHTS.potential;

  const qualificationScore = clamp(Math.round(raw), 0, 100);
  const funnel: QualificationFunnel = signals.hasGoogleProfile === false ? "B" : "A";
  const contactable = signals.hasValidPhone !== false;

  return {
    qualificationScore,
    priority: scoreToPriority(qualificationScore),
    funnel,
    contactable,
    reasons,
  };
}
