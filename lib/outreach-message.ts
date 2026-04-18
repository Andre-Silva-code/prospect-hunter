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
 * Mensagem inicial para leads do Google Meu Negócio.
 *
 * Princípio Copy Chief: especificidade antes do CTA.
 * Entrega observação concreta (posição nas buscas) antes de pedir qualquer resposta.
 * Baixo comprometimento no CTA — o lead decide, não é pressionado.
 */
export function generateGmnWhatsAppMessage(lead: Pick<LeadRecord, "company" | "region">): string {
  return [
    `Oi, ${lead.company}!`,
    "",
    `Estava mapeando perfis no Google Meu Negócio em ${lead.region} e o de vocês apareceu — mas com posição abaixo dos principais concorrentes da região nas buscas locais.`,
    "",
    "Identifiquei 3 lacunas específicas que os primeiros colocados estão explorando e vocês ainda não.",
    "",
    "Te mando a análise? Leva 2 minutos ler e você decide se faz sentido agir.",
  ].join("\n");
}

/**
 * Follow-up para leads GMN que não responderam.
 *
 * Regra Pedro Valério: follow-up sem novo valor = VETO.
 * Cada step entrega um dado novo antes de qualquer pergunta.
 *
 * step 1 (D+3): novo gatilho — movimento do mercado local.
 * step 2 (D+6): saída limpa, preserva relacionamento para reativação.
 */
export function generateGmnFollowUpMessage(lead: Pick<LeadRecord, "company">, step: 1 | 2): string {
  if (step === 1) {
    return [
      `Oi! Só um complemento do que te mandei, ${lead.company}.`,
      "",
      "O mercado local de buscas no Google se move rápido — concorrentes que atualizam a ficha regularmente sobem de posição em semanas.",
      "",
      "Se quiser travar a posição antes que isso aconteça, é só me falar. A análise que preparei já aponta exatamente onde agir primeiro.",
    ].join("\n");
  }

  return [
    `Oi, ${lead.company}!`,
    "",
    "Última passagem por aqui — se o momento não for agora, tudo bem.",
    "",
    "Fica o contato para quando fizer sentido pensar em visibilidade no Google. Boa semana!",
  ].join("\n");
}

/**
 * Mensagens pós-envio da análise GBP Check.
 *
 * Objetivo: gerar resposta e conduzir para reunião.
 * Princípio: nunca assumir comportamento do lead (não usar "vi que não abriu").
 * Cada step entrega valor incremental novo.
 *
 * step 1 (imediata): confirma envio + destaca o ponto mais urgente.
 * step 2 (D+1): complemento com prova social implícita.
 * step 3 (D+3): saída com CTA de agenda — usar só se urgência for real.
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
      `${lead.company}, só um complemento do que te mandei.`,
      "",
      "Além das lacunas que identifiquei, tem um ponto específico sobre avaliações recentes que costuma ter impacto rápido — negócios do mesmo segmento que ajustaram esse ponto viram resultado em menos de 30 dias.",
      "",
      "Vale uma leitura rápida na análise que enviei.",
    ].join("\n");
  }

  return [
    `Oi, ${lead.company}! Última vez que passo por aqui.`,
    "",
    "Preparei essa análise especificamente pro seu negócio — não é algo genérico. Se quiser entender como virar o jogo no Google antes dos seus concorrentes, é só agendar 15 minutinhos:",
    "",
    "https://calendar.app.google/vTru5VzoEc1M4q688",
    "",
    "Sem compromisso.",
  ].join("\n");
}

// ─── Instagram funnel ────────────────────────────────────────────────────────

/**
 * Mensagem inicial para leads do Instagram.
 *
 * Princípio Copy Chief: observação específica antes de qualquer proposta.
 * Identifica ausência de anúncios como sinal concreto — cria curiosidade sem entregar tudo.
 * CTA direto, sem apresentação formal ou "sem compromisso" no início.
 */
export function generateInstagramWhatsAppMessage(
  lead: Pick<LeadRecord, "company" | "niche">
): string {
  return [
    `Oi, ${lead.company}!`,
    "",
    `Vi o perfil de vocês no Instagram — têm uma presença visual boa, mas não estou vendo anúncios rodando.`,
    "",
    `Trabalho com tráfego pago para empresas de ${lead.niche} e já vi esse padrão em outros negócios do segmento antes de escalar. Geralmente tem uma razão específica.`,
    "",
    "Posso te contar o que encontrei em 20 minutos — sem apresentação, sem venda. Topam?",
  ].join("\n");
}

/**
 * Follow-ups para leads do Instagram que não responderam.
 *
 * Regra Pedro Valério: follow-up sem novo valor = VETO.
 *
 * step 1 (D+3): oferece formato diferente (áudio) + reforça baixo custo de tempo.
 * step 2 (D+6): saída limpa, preserva relacionamento.
 */
export function generateInstagramFollowUpMessage(
  lead: Pick<LeadRecord, "company">,
  step: 1 | 2
): string {
  if (step === 1) {
    return [
      `Oi, ${lead.company}! Passando para ver se receberam minha mensagem.`,
      "",
      "Entendo que a rotina é corrida. Se preferirem, posso mandar um áudio rápido explicando o que identifiquei — leva menos de 3 minutos ouvir.",
      "",
      "A consultoria em si é completamente gratuita e dura 20 minutos. Vale a pena!",
    ].join("\n");
  }

  return [
    `Oi, ${lead.company}!`,
    "",
    "Última tentativa por aqui — se não for o momento certo, tudo bem.",
    "",
    "Fica o convite para quando fizer sentido pensar em crescimento digital. É só me chamar!",
  ].join("\n");
}

/**
 * Mensagens pós-consultoria para converter em cliente de tráfego pago.
 *
 * step 1 (imediata): confirma próximos passos combinados na call.
 * step 2 (D+2): abre espaço para dúvidas, reforça prazo realista de resultado.
 * step 3 (D+5): urgência real — usar SOMENTE se vagas/prazo forem verificáveis.
 *   Urgência falsa detectada pelo lead destrói toda a sequência anterior.
 */
export function generatePostConsultingMessage(
  lead: Pick<LeadRecord, "company">,
  step: 1 | 2 | 3
): string {
  if (step === 1) {
    return [
      `Oi, ${lead.company}! Foi muito bom conversar com vocês hoje.`,
      "",
      "Como combinamos, vou organizar as principais oportunidades que identifiquei e te mando um resumo.",
      "",
      "Se quiserem seguir em frente com a gestão de tráfego, é só me falar que a gente já define os próximos passos!",
    ].join("\n");
  }

  if (step === 2) {
    return [
      `Oi, ${lead.company}! Ficou alguma dúvida sobre o que conversamos na consultoria?`,
      "",
      "Posso esclarecer qualquer ponto antes de vocês tomarem uma decisão. É só perguntar aqui.",
      "",
      "O que recomendei tem potencial real de trazer resultados em 60 a 90 dias com a estratégia certa.",
    ].join("\n");
  }

  return [
    `${lead.company}, queria deixar um último recado.`,
    "",
    "Estou fechando a agenda para novos clientes neste mês. Se quiserem garantir uma vaga, agora é o melhor momento.",
    "",
    "Se preferirem, posso agendar uma conversa rápida para tirar as últimas dúvidas:",
    "",
    "https://calendar.app.google/vTru5VzoEc1M4q688",
  ].join("\n");
}

/**
 * Follow-up para leads que estão em "Proposta" sem resposta.
 *
 * step 1 (D+1): abre espaço para dúvidas, CTA de conversa rápida.
 * step 2 (D+3): reconhece rotina corrida, sem pressão, mantém porta aberta.
 * step 3 (D+7): saída definitiva com preservação de relacionamento.
 */
export function generateProposalFollowUpMessage(
  lead: Pick<LeadRecord, "company">,
  step: 1 | 2 | 3
): string {
  if (step === 1) {
    return [
      `Oi, ${lead.company}!`,
      "",
      "Vi que você recebeu nossa proposta. Ficou alguma dúvida que eu possa esclarecer?",
      "",
      "Estou à disposição para uma conversa rápida de 15 minutos se quiser entender melhor os resultados que podemos gerar juntos.",
    ].join("\n");
  }

  if (step === 2) {
    return [
      `Oi! Passando aqui rapidinho, ${lead.company}.`,
      "",
      "Sei que a rotina é corrida, mas queria garantir que você teve a chance de ver nossa proposta.",
      "",
      "Se não for o momento certo agora, sem problema. É só me falar e agendamos para quando fizer mais sentido.",
    ].join("\n");
  }

  return [
    `Último contato por aqui, ${lead.company}.`,
    "",
    "Se decidir seguir em frente com tráfego pago no futuro, pode contar comigo. Guardo seu contato.",
    "",
    "Boa sorte nos resultados!",
  ].join("\n");
}

/**
 * Mensagem de reativação para leads marcados como "Perdido" após 30 dias.
 *
 * Princípio Copy Chief: âncora temporal específica + prova social com contexto.
 * Evita vagueza ("tive aprendizados novos") — entrega referência concreta ao contato anterior.
 * CTA leve: não pede reunião, pede abertura para conversa.
 */
export function generateReactivationMessage(lead: Pick<LeadRecord, "company">): string {
  return [
    `Oi, ${lead.company}! Tudo bem?`,
    "",
    "Conversamos há algumas semanas sobre gestão de tráfego pago.",
    "",
    "Desde então trabalhei com outros negócios do mesmo segmento aqui na região — alguns resultados bem interessantes que podem ser relevantes para vocês também.",
    "",
    "Se estiver pensando em aquisição de clientes nos próximos meses, posso compartilhar o que está funcionando. É só responder aqui!",
  ].join("\n");
}

export function buildGbpCheckUrl(companyName: string, region?: string): string {
  const query = region
    ? `${companyName} ${region} google meu negócio`
    : `${companyName} google meu negócio`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
