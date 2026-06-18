/**
 * Utilitário de horário comercial — fuso de Brasília/São Paulo (America/Sao_Paulo).
 *
 * Regras:
 *  - Dias úteis: segunda a sexta
 *  - Horário: 08:00 – 18:00 (hora local)
 *
 * Se o horário calculado cair fora desse intervalo, a data é avançada
 * para o próximo dia útil às 08:00 com um offset aleatório de até 30 min
 * (para parecer orgânico).
 */

const TZ = "America/Sao_Paulo";
const OPEN_HOUR = 8; // 08:00
const CLOSE_HOUR = 18; // 18:00

/**
 * Retorna a data/hora em fuso de São Paulo como objeto com partes separadas.
 */
function inSaoPaulo(date: Date): {
  year: number;
  month: number; // 1-12
  day: number;
  weekday: number; // 0=dom, 1=seg … 6=sáb
  hour: number;
  minute: number;
} {
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });

  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";

  // Mapeia abreviação de dia da semana para número (0=dom … 6=sáb)
  const weekdayAbbr = get("weekday").toLowerCase().replace(".", "");
  const weekdayMap: Record<string, number> = {
    dom: 0,
    seg: 1,
    ter: 2,
    qua: 3,
    qui: 4,
    sex: 5,
    sáb: 6,
    sab: 6,
  };
  const weekday = weekdayMap[weekdayAbbr] ?? date.getDay();

  return {
    year: parseInt(get("year"), 10),
    month: parseInt(get("month"), 10),
    day: parseInt(get("day"), 10),
    weekday,
    hour: parseInt(get("hour"), 10),
    minute: parseInt(get("minute"), 10),
  };
}

/**
 * Verifica se uma data cai dentro do horário comercial em São Paulo.
 */
export function isBusinessHour(date: Date = new Date()): boolean {
  const { weekday, hour } = inSaoPaulo(date);
  const isWeekday = weekday >= 1 && weekday <= 5;
  const isOpen = hour >= OPEN_HOUR && hour < CLOSE_HOUR;
  return isWeekday && isOpen;
}

/**
 * Dado um instante desejado (ex: "daqui a 25 min"), retorna o próximo
 * momento válido dentro do horário comercial de São Paulo.
 *
 * - Se já estiver em horário comercial → retorna o instante como está.
 * - Se for antes das 08:00 em dia útil → avança para 08:00 + jitter do mesmo dia.
 * - Se for após as 18:00 ou fim de semana → avança para 08:00 + jitter do próximo dia útil.
 *
 * O jitter é aleatório entre 0–30 minutos para parecer orgânico.
 */
export function nextBusinessMoment(date: Date = new Date()): Date {
  const jitterMs = Math.floor(Math.random() * 30 * 60 * 1000); // 0–30 min

  const { weekday, hour } = inSaoPaulo(date);
  const isWeekday = weekday >= 1 && weekday <= 5;
  const isOpen = hour >= OPEN_HOUR && hour < CLOSE_HOUR;

  if (isWeekday && isOpen) {
    return date; // já está em horário comercial
  }

  // Calcular quantos dias avançar até o próximo dia útil
  let daysAhead = 0;

  if (isWeekday && hour < OPEN_HOUR) {
    // Hoje é dia útil mas ainda não abriu → enviar hoje às 08:00
    daysAhead = 0;
  } else {
    // Passou das 18:00 ou é fim de semana → próximo dia útil
    daysAhead = 1;
    let nextWeekday = (weekday + daysAhead) % 7;
    while (nextWeekday === 0 || nextWeekday === 6) {
      daysAhead += 1;
      nextWeekday = (weekday + daysAhead) % 7;
    }
  }

  // Montar a data alvo: dia calculado às 08:00 horário de SP
  // Estratégia: pegar a data UTC do "início do dia SP" e somar as horas abertas
  const target = new Date(date);
  target.setUTCDate(target.getUTCDate() + daysAhead);

  // Zerar para meia-noite UTC e depois ajustar para 08:00 SP
  // SP é UTC-3 (BRT) — podendo ser UTC-2 no horário de verão
  // Usamos Intl para descobrir o offset correto no dia alvo
  const midnightUTC = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate(), 0, 0, 0)
  );

  // Descobrir offset de SP naquele dia
  const spMidnight = inSaoPaulo(midnightUTC);
  // Reconstruir meia-noite local SP como UTC
  // offset = hora UTC que equivale a 00:00 SP
  const spOffset = findSpOffset(midnightUTC);
  const openUTC = new Date(
    midnightUTC.getTime() + OPEN_HOUR * 60 * 60 * 1000 - spOffset * 60 * 60 * 1000
  );

  // Sanity: garante que não voltamos no tempo
  if (openUTC < date) {
    openUTC.setUTCDate(openUTC.getUTCDate() + 1);
  }

  void spMidnight; // usado indiretamente via findSpOffset

  return new Date(openUTC.getTime() + jitterMs);
}

/**
 * Descobre o offset em horas de São Paulo em relação ao UTC para uma data.
 * Retorna ex: 3 para UTC-3 (BRT) ou 2 para UTC-2 (BRST/horário de verão).
 */
function findSpOffset(date: Date): number {
  // Formata a hora em UTC e em SP e calcula a diferença
  const utcHour = date.getUTCHours() + date.getUTCMinutes() / 60;
  const spParts = inSaoPaulo(date);
  const spHour = spParts.hour + spParts.minute / 60;

  let diff = utcHour - spHour;
  // Ajustar para faixa [-12, 12]
  if (diff > 12) diff -= 24;
  if (diff < -12) diff += 24;

  return diff; // positivo = SP está atrás do UTC (normal para BRT)
}
