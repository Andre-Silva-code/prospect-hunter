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
    "Preparei essa análise especificamente pro seu negócio — não é algo genérico. Se quiser entender como virar o jogo no Google antes dos seus concorrentes, é só agendar 15 minutinhos pelo link abaixo:",
    "",
    "https://calendar.app.google/vTru5VzoEc1M4q688",
    "",
    "Sem compromisso.",
  ].join("\n");
}

// ─── Instagram funnel ────────────────────────────────────────────────────────

/**
 * Mensagem inicial para leads do Instagram — oferta de consultoria gratuita.
 */
export function generateInstagramWhatsAppMessage(
  lead: Pick<LeadRecord, "company" | "niche">
): string {
  return [
    `Ola, ${lead.company}!`,
    "",
    `Vi o perfil de voces no Instagram e fiquei curioso — voces ja investem em trafego pago para atrair clientes no digital?`,
    "",
    `Trabalho com gestao de trafego para empresas de ${lead.niche} e tenho visto resultados bem interessantes nesse segmento.`,
    "",
    `Posso fazer uma consultoria estrategica gratuita de 20 minutos para mostrar o que poderia funcionar especificamente para o negocio de voces. Sem enrolacao e sem compromisso.`,
    "",
    "Topam? E so responder aqui!",
  ].join("\n");
}

/**
 * Follow-ups para leads do Instagram que nao responderam.
 * step 1 = D+3, step 2 = D+6
 */
export function generateInstagramFollowUpMessage(
  lead: Pick<LeadRecord, "company">,
  step: 1 | 2
): string {
  if (step === 1) {
    return [
      `Oi, ${lead.company}! Passando so para ver se receberam minha mensagem anterior.`,
      "",
      "Entendo que a rotina e corrida. Se preferirem, posso mandar um audio rapido explicando como a consultoria funciona.",
      "",
      "E completamente gratuita e leva so 20 minutos. Vale a pena!",
    ].join("\n");
  }

  return [
    `Ola, ${lead.company}!`,
    "",
    "Ultima tentativa por aqui — se nao for o momento certo, tudo bem.",
    "",
    "Fica o convite para quando fizer sentido pensar em crescimento digital. E so me chamar!",
  ].join("\n");
}

/**
 * Mensagens pos-consultoria para converter em cliente de trafego pago.
 * step 1 = imediata, step 2 = D+2, step 3 = D+5
 */
export function generatePostConsultingMessage(
  lead: Pick<LeadRecord, "company">,
  step: 1 | 2 | 3
): string {
  if (step === 1) {
    return [
      `Oi, ${lead.company}! Foi muito bom conversar com voces hoje.`,
      "",
      "Como combinamos, vou organizar as principais oportunidades que identifiquei e te mando um resumo.",
      "",
      "Se quiserem seguir em frente com a gestao de trafego, e so me falar que a gente ja define os proximos passos!",
    ].join("\n");
  }

  if (step === 2) {
    return [
      `Oi, ${lead.company}! Ficou alguma duvida sobre o que conversamos na consultoria?`,
      "",
      "Posso esclarecer qualquer ponto antes de voces tomarem uma decisao. E so perguntar aqui.",
      "",
      "O que eu recomendei para voces tem potencial real de trazer resultados em 60 a 90 dias com a estrategia certa.",
    ].join("\n");
  }

  return [
    `${lead.company}, queria deixar um ultimo recado.`,
    "",
    "As vagas para novos clientes este mes estao quase todas preenchidas. Se quiserem garantir uma, agora e o melhor momento.",
    "",
    "Se preferirem, posso agendar uma conversa rapida para tirar as ultimas duvidas:",
    "",
    "https://calendar.app.google/vTru5VzoEc1M4q688",
  ].join("\n");
}

/**
 * Follow-up para leads que estão em "Proposta" sem resposta.
 * D+1, D+3, D+7 após entrada na etapa.
 */
export function generateProposalFollowUpMessage(
  lead: Pick<LeadRecord, "company">,
  step: 1 | 2 | 3
): string {
  if (step === 1) {
    return [
      `Oi, ${lead.company}!`,
      "",
      "Vi que voce recebeu nossa proposta. Ficou alguma duvida que eu possa esclarecer?",
      "",
      "Estou a disposicao para uma conversa rapida de 15 minutos se quiser entender melhor os resultados que podemos gerar juntos.",
    ].join("\n");
  }

  if (step === 2) {
    return [
      `Oi! Passando aqui rapidinho, ${lead.company}.`,
      "",
      "Sei que a rotina e corrida, mas queria garantir que voce teve a chance de ver nossa proposta.",
      "",
      "Se nao for o momento certo agora, sem problema. E so me falar e agendamos para quando fizer mais sentido.",
    ].join("\n");
  }

  return [
    `Ultimo contato por aqui, ${lead.company}.`,
    "",
    "Se decidir seguir em frente com trafego pago no futuro, pode contar comigo. Guardo seu contato.",
    "",
    "Boa sorte nos resultados!",
  ].join("\n");
}

/**
 * Mensagem de reativacao para leads marcados como "Perdido" apos 30 dias.
 */
export function generateReactivationMessage(lead: Pick<LeadRecord, "company">): string {
  return [
    `Oi, ${lead.company}! Tudo bem?`,
    "",
    "Conversamos ha um tempo atras sobre gestao de trafego pago.",
    "",
    "Desde entao tive alguns aprendizados novos com clientes do mesmo segmento que podem ser uteis para voces tambem.",
    "",
    "Se estiver no momento de pensar em aquisicao de clientes, posso compartilhar o que tem funcionado. E so responder aqui!",
  ].join("\n");
}

export function buildGbpCheckUrl(companyName: string, region?: string): string {
  const query = region
    ? `${companyName} ${region} google meu negócio`
    : `${companyName} google meu negócio`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
