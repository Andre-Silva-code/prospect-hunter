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

/**
 * Mensagem curta para WhatsApp (enviada junto com o PDF teaser).
 */
export function generateGmnWhatsAppMessage(lead: Pick<LeadRecord, "company" | "region">): string {
  return [
    `Oi, ${lead.company}!`,
    "",
    `Estava analisando perfis no Google Meu Negócio aqui em ${lead.region} e o de vocês chamou minha atenção.`,
    "",
    "Encontrei alguns pontos que estão fazendo vocês perderem posição nas buscas para concorrentes da região.",
    "",
    "Posso te mostrar o que encontrei? É gratuito e leva 2 minutinhos.",
    "",
    "Responde SIM que te envio a análise completa!",
  ].join("\n");
}

/**
 * Follow-up para leads que não responderam.
 */
export function generateGmnFollowUpMessage(lead: Pick<LeadRecord, "company">, step: 1 | 2): string {
  if (step === 1) {
    return [
      `Oi! Enviei uma analise do perfil da ${lead.company} no Google ha alguns dias.`,
      "Conseguiram dar uma olhada no relatorio?",
      "",
      "Fico a disposicao se quiserem conversar sobre as melhorias. E so responder aqui!",
    ].join("\n");
  }

  return [
    `Ola, ${lead.company}!`,
    "So passando pra avisar que a analise do perfil de voces ainda esta disponivel.",
    "Se fizer sentido no futuro, e so me chamar. Boa semana!",
  ].join("\n");
}

/**
 * Mensagens pós-envio da análise GBP Check.
 * Objetivo: forçar resposta e conduzir para reunião.
 */
export function generatePostAnalysisMessage(
  lead: Pick<LeadRecord, "company">,
  step: 1 | 2 | 3
): string {
  if (step === 1) {
    return [
      `Oi, ${lead.company}!`,
      "",
      "Acabei de te mandar a análise do seu perfil no Google.",
      "",
      "Tem alguns pontos que seus concorrentes já estão aproveitando e que estão te fazendo perder clientes agora — dá uma olhada e me fala o que achou.",
    ].join("\n");
  }

  if (step === 2) {
    return [
      `${lead.company}, vi que você ainda não abriu a análise.`,
      "",
      "Só te adianto: identifiquei pelo menos 3 áreas onde você está perdendo visibilidade para concorrentes da sua região no Google. São ajustes simples, mas que fazem diferença direta no número de clientes que chegam até você.",
      "",
      "Vale a pena dar uma olhada.",
    ].join("\n");
  }

  return [
    "Oi! Última vez que passo por aqui.",
    "",
    "Preparei essa análise especificamente pro seu negócio — não é algo genérico. Se quiser entender como virar o jogo no Google antes dos seus concorrentes, é só me responder e a gente marca 15 minutinhos.",
    "",
    "Sem compromisso.",
  ].join("\n");
}

export function buildGbpCheckUrl(companyName: string, region?: string): string {
  const query = region
    ? `${companyName} ${region} google meu negócio`
    : `${companyName} google meu negócio`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
