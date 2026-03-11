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
