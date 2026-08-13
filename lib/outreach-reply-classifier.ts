/**
 * Classificação das respostas recebidas dos leads (webhook do WhatsApp).
 *
 * Separado da rota (`app/api/outreach/webhook/route.ts`) porque arquivos de rota
 * do Next.js só podem exportar handlers HTTP (GET/POST/…). Manter estas funções
 * aqui as torna testáveis e reutilizáveis sem quebrar o build.
 */

/**
 * Padrões de recusa EXPLÍCITA — inequívocos, sempre contam como negativa
 * (mesmo que a mensagem tenha algum sinal de interesse junto).
 */
const strongNegativePatterns = [
  /\bn[aã]o quero\b/,
  /\bn[aã]o tenho interesse\b/,
  /\bsem interesse\b/,
  /\bn[aã]o preciso\b/,
  /\bn[aã]o obrigad[oa]\b/,
  /\bobrigad[oa],?\s+n[aã]o\b/,
  /\bnegativo\b/,
  /\bdispenso\b/,
  /\bdeixa pra l[aá]/,
  /\bn[aã]o me interessa\b/,
  /\bpare de (enviar|mandar)\b/,
  /\bn[aã]o mande? mais\b/,
  /\bnope\b/,
];

/**
 * Negativa FRACA — um "não"/"n" solto. Só vale como recusa se a mensagem NÃO
 * demonstrar interesse (senão seria um falso negativo, ex.: "não sabia, quero!").
 */
const weakNegativePatterns = [/\bn[aã]o\b/, /^\s*n\s*$/];

/**
 * Sinais de INTERESSE — se presentes, a mensagem não deve ser tratada como
 * recusa por causa de um "não" solto.
 */
const interestPatterns = [
  /\bquero\b/,
  /\bgostei\b/,
  /\btenho interesse\b/,
  /\bme (conta|fala|explica|mostra|envia|manda)\b/,
  /\bcomo funciona\b/,
  /\bquanto (custa|fica|é)\b/,
  /\bpode (mandar|enviar|explicar|falar)\b/,
  /\bmais informa[çc][õo]es\b/,
  /\binteressante\b/,
  /\bvamos\b/,
  /\bbora\b/,
  /\bsim\b/,
  /\bclaro\b/,
  /\bpor favor\b/,
  /\bagenda[r]?\b/,
];

/**
 * Padrões de resposta automática de bot/atendente virtual.
 * Quando detectado, ignora silenciosamente — não avança o card,
 * não envia mensagem de qualificação.
 */
const botPatterns = [
  // Mensagens automáticas explícitas
  /atendimento autom[aá]tico/,
  /mensagem autom[aá]tica/,
  /resposta autom[aá]tica/,
  /bot de atendimento/,
  /servi[cç]o autom[aá]tico/,
  /assistente virtual/,
  /chat ?bot/,
  /robo.*atendimento/,

  // Fora do horário
  /fora do hor[aá]rio/,
  /fora de hora/,
  /hor[aá]rio de atendimento/,
  /hor[aá]rio.*funcionamento/,
  /atendemos.*segunda.*sexta/,
  /atendemos das \d/,
  /voltamos.*segunda/,
  /retornamos.*segunda/,

  // Equipe entrará em contato
  /nossa equipe.*entrar[aá] em contato/,
  /em breve.*retornar/,
  /retornaremos em breve/,
  /entraremos em contato/,
  /logo.*retornar/,
  /em at[eé] \d+ (hora|minuto|dia)/,
  /prazo de atendimento/,

  // Confirmação de recebimento
  /obrigado por entrar em contato/,
  /obrigado.*mensagem/,
  /recebemos sua mensagem/,
  /sua mensagem foi recebida/,
  /mensagem registrada/,
  /protocolo.*\d{4,}/,
  /n[uú]mero do protocolo/,

  // Saudações de bot com pergunta de ajuda
  /como posso (te |lhe |)?ajudar/,
  /posso (te |lhe |)?ajudar/,
  /olá.*como posso/,
  /oi.*como posso/,
  /ol[aá].*seja bem/,
  /bem[- ]vindo.*atendimento/,
  /seja bem[- ]vindo/,
  /boas[- ]vindas/,

  // Menu de opções (WhatsApp Business)
  /para falar com.*tecle/,
  /selecione uma op[cç][aã]o/,
  /escolha uma op[cç][aã]o/,
  /digite \d para/,
  /envie \d para/,
  /responda \d para/,
  /op[cç][aã]o \d/,
  /^\s*[1-9]\s*[-–)]\s*\w/m, // Linhas que começam com "1 - ", "2) ", etc.

  // Padrões específicos de plataformas BR (Zendesk, Movidesk, etc.)
  /ticket.*aberto/,
  /chamado.*criado/,
  /solicita[cç][aã]o.*registrada/,
  /acompanhe.*link/,
];

/**
 * Padrões de confirmação de qualificação — lead confirma ser o responsável.
 * Quando detectado após "awaiting_qualification", avança para Diagnóstico.
 */
const qualificationConfirmPatterns = [
  /\bsim\b/,
  /\byes\b/,
  /\bpode\b/,
  /\bclaro\b/,
  /\bcom certeza\b/,
  /\bcerto\b/,
  /\bexato\b/,
  /\bconfirmo\b/,
  /\bsou eu\b/,
  /\bsou\b/,
  /\brespons[aá]vel\b/,
  /\btopei\b/,
  /\btopo\b/,
  /^\s*s\s*$/,
  /^\s*ok\s*$/,
];

/**
 * Heurística adicional: resposta muito rápida após envio pode ser bot.
 * Menos de 10 segundos = provavelmente automático.
 */
export function isLikelyBotByTiming(sentAt: string | null | undefined): boolean {
  if (!sentAt) return false;
  const elapsed = Date.now() - new Date(sentAt).getTime();
  return elapsed < 10_000; // menos de 10 segundos
}

export function isBot(message: string): boolean {
  return botPatterns.some((pattern) => pattern.test(message));
}

function hasInterestSignal(message: string): boolean {
  return interestPatterns.some((pattern) => pattern.test(message));
}

/**
 * Decide se a resposta é uma recusa.
 *  - Recusa explícita → sempre negativa.
 *  - "não"/"n" solto → só é negativa se NÃO houver sinal de interesse na
 *    mensagem (evita falso negativo em frases como "não sabia, quero saber!").
 */
export function isNegative(message: string): boolean {
  // Normaliza para funcionar independente de quem chama (o webhook já envia em
  // minúsculas, mas a função fica robusta por si só).
  const text = message.toLowerCase();
  if (strongNegativePatterns.some((pattern) => pattern.test(text))) {
    return true;
  }
  if (weakNegativePatterns.some((pattern) => pattern.test(text))) {
    return !hasInterestSignal(text);
  }
  return false;
}

export function isQualificationConfirm(message: string): boolean {
  return qualificationConfirmPatterns.some((pattern) => pattern.test(message));
}
