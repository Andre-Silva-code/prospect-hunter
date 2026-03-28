import type { LeadRecord } from "@/types/prospecting";
import type { GbpAuditData, GbpCompetitorInsight, GbpImprovement } from "@/types/gbp-audit";

/**
 * Extrai dados de auditoria GBP a partir do LeadRecord.
 * Usa os dados disponíveis e gera estimativas inteligentes para campos
 * que não estão diretamente no lead (como photoEstimate e responseRate).
 */
export function extractGbpAuditData(lead: LeadRecord): GbpAuditData {
  const rating = extractRating(lead.trigger);
  const reviewCount = extractReviewCount(lead.trigger);
  const hasWebsite = lead.contact !== "Sem contato publico" && !lead.contact.startsWith("+");
  const websiteUrl = extractWebsite(lead.contact);
  const phoneNumber = extractPhone(lead.contact);
  const overallScore = lead.score;

  return {
    companyName: lead.company,
    address: lead.region,
    rating,
    reviewCount,
    hasWebsite,
    websiteUrl,
    phoneNumber,
    photoEstimate: estimatePhotos(reviewCount),
    categoryOptimization: estimateCategoryOptimization(rating, reviewCount),
    responseRate: estimateResponseRate(rating, reviewCount),
    overallScore,
    improvements: generateImprovements(rating, reviewCount, hasWebsite),
    competitors: generateCompetitorInsights(rating, reviewCount, overallScore),
  };
}

function extractRating(trigger: string): number {
  const match = trigger.match(/nota\s+([\d.,]+)/i);
  if (match) {
    const value = parseFloat(match[1].replace(",", "."));
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function extractReviewCount(trigger: string): number {
  const match = trigger.match(/([\d.]+)\s*avaliacao/i);
  if (match) {
    const value = parseInt(match[1].replace(".", ""), 10);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function extractWebsite(contact: string): string {
  if (contact.startsWith("http")) return contact;
  if (contact.includes(".com") || contact.includes(".br")) {
    return contact.startsWith("www.") ? `https://${contact}` : contact;
  }
  return "";
}

function extractPhone(contact: string): string {
  if (contact.startsWith("+") || /^\(?\d{2}\)?/.test(contact)) return contact;
  return "";
}

function estimatePhotos(reviewCount: number): "Poucos" | "Moderado" | "Muitos" | "Desconhecido" {
  if (reviewCount === 0) return "Desconhecido";
  if (reviewCount < 20) return "Poucos";
  if (reviewCount < 100) return "Moderado";
  return "Muitos";
}

function estimateCategoryOptimization(
  rating: number,
  reviewCount: number
): "Nao otimizada" | "Parcial" | "Otimizada" {
  if (rating >= 4.5 && reviewCount >= 100) return "Otimizada";
  if (rating >= 3.5 || reviewCount >= 20) return "Parcial";
  return "Nao otimizada";
}

function estimateResponseRate(rating: number, reviewCount: number): string {
  if (rating >= 4.5 && reviewCount >= 50) return "~70-85%";
  if (rating >= 4.0) return "~40-60%";
  if (rating >= 3.0) return "~20-35%";
  return "~10-20%";
}

function generateImprovements(
  rating: number,
  reviewCount: number,
  hasWebsite: boolean
): GbpImprovement[] {
  const items: GbpImprovement[] = [];

  if (reviewCount < 50) {
    items.push({
      area: "Avaliações",
      currentStatus: `${reviewCount} avaliações`,
      recommendation: "Implementar campanha de solicitação de avaliações para clientes recentes",
      impact: "Alto",
    });
  }

  if (rating > 0 && rating < 4.5) {
    items.push({
      area: "Nota geral",
      currentStatus: `${rating.toFixed(1)} estrelas`,
      recommendation: "Responder 100% das avaliações negativas e melhorar pontos citados",
      impact: "Alto",
    });
  }

  if (!hasWebsite) {
    items.push({
      area: "Website",
      currentStatus: "Não vinculado",
      recommendation: "Adicionar website ao perfil para aumentar credibilidade e tráfego",
      impact: "Medio",
    });
  }

  items.push({
    area: "Fotos e mídia",
    currentStatus: "Requer análise detalhada",
    recommendation: "Adicionar fotos profissionais do espaço, equipe e serviços mensalmente",
    impact: "Medio",
  });

  items.push({
    area: "Posts e atualizações",
    currentStatus: "Requer análise detalhada",
    recommendation: "Publicar atualizações semanais com ofertas, eventos e novidades",
    impact: "Baixo",
  });

  return items;
}

function generateCompetitorInsights(
  rating: number,
  reviewCount: number,
  overallScore: number
): GbpCompetitorInsight[] {
  return [
    {
      metric: "Nota média",
      yourValue: rating > 0 ? rating.toFixed(1) : "N/A",
      regionAverage: "4.3",
      verdict: rating >= 4.3 ? "Acima" : rating >= 3.8 ? "Na media" : "Abaixo",
    },
    {
      metric: "Quantidade de avaliações",
      yourValue: reviewCount.toString(),
      regionAverage: "85",
      verdict: reviewCount >= 85 ? "Acima" : reviewCount >= 40 ? "Na media" : "Abaixo",
    },
    {
      metric: "Score de visibilidade",
      yourValue: `${overallScore}/100`,
      regionAverage: "68/100",
      verdict: overallScore >= 68 ? "Acima" : overallScore >= 55 ? "Na media" : "Abaixo",
    },
  ];
}
