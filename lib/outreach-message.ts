import type { LeadPriority, LeadRecord } from "@/types/prospecting";

function nicheHook(niche: string): string {
  if (/estetica|clinica|odonto/i.test(niche)) {
    return "a forma como vocês já atraem demanda, mas ainda deixam conversão na mesa";
  }

  if (/advogad|jurid/i.test(niche)) {
    return "a oportunidade de transformar busca por serviço em consultas mais qualificadas";
  }

  if (/pilates|bem-estar|fitness/i.test(niche)) {
    return "como captar alunos com mais intenção e menos dependência de indicação";
  }

  return "um espaço claro para ganhar previsibilidade comercial com mídia paga";
}

function priorityAngle(priority: LeadPriority): string {
  if (priority === "Alta") {
    return "Já vi sinais claros de verba e maturidade comercial.";
  }

  if (priority === "Media") {
    return "Vocês parecem estar em um ponto bom para organizar aquisição.";
  }

  return "Mesmo em fase inicial, dá para estruturar uma operação de captação mais previsível.";
}

export function generateOutreachMessage(lead: LeadRecord): string {
  return [
    `Oi, time da ${lead.company}.`,
    `Notei ${nicheHook(lead.niche)} em ${lead.region}.`,
    priorityAngle(lead.priority),
    `Principal gatilho que enxerguei: ${lead.trigger}.`,
    "Se fizer sentido, eu te mostro em 15 minutos como eu atacaria isso com criativos, oferta e funil.",
  ].join(" ");
}

export function generateGmnAuditMessage(
  lead: Pick<LeadRecord, "company" | "region" | "trigger">
): string {
  return [
    `Olá, equipe da ${lead.company}!`,
    `Encontrei o perfil de vocês no Google Meu Negócio enquanto analisava empresas em ${lead.region}.`,
    `${lead.trigger}`,
    "",
    "Trabalho com otimização de fichas no Google e gostaria de oferecer uma análise gratuita e sem compromisso do perfil de vocês.",
    "",
    "Nessa análise eu mostro:",
    "- Como o perfil está performando hoje",
    "- Pontos que podem ser melhorados para aparecer mais nas buscas",
    "- O que os concorrentes da região estão fazendo de diferente",
    "",
    "Posso enviar o relatório por aqui mesmo. Faz sentido para vocês?",
  ].join("\n");
}

export function buildGbpCheckUrl(companyName: string, region?: string): string {
  const query = region ? `${companyName} ${region}` : companyName;
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
}
