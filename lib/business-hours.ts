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

  // Calcular quantos dias avançar até o próximo dia útil (contando em SP).
  let daysAhead: number;

  if (isWeekday && hour < OPEN_HOUR) {
    // Hoje é dia útil mas ainda não abriu → abrir hoje às 08:00
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

  // Descobre o dia-calendário em SP correspondente ao instante `date`, depois
  // avança `daysAhead` dias e constrói "08:00 SP" desse dia-alvo.
  const sp = inSaoPaulo(date);
  const openUTC = buildSpMoment(sp.year, sp.month, sp.day, daysAhead, OPEN_HOUR);

  return new Date(openUTC.getTime() + jitterMs);
}

/**
 * Constrói um instante UTC correspondente a `spHour:00` no fuso de São Paulo,
 * no dia-calendário (year/month/day em SP) somado de `daysAhead` dias.
 *
 * Trata corretamente o offset de SP (UTC-3, ou UTC-2 no horário de verão)
 * calculando-o no próprio dia-alvo — evitando erros nas viradas de fuso.
 */
function buildSpMoment(
  year: number,
  month: number, // 1-12
  day: number,
  daysAhead: number,
  spHour: number
): Date {
  // Avança os dias usando UTC como calendário neutro (00:00 do dia-alvo).
  const base = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  base.setUTCDate(base.getUTCDate() + daysAhead);

  // Primeira aproximação: assume o offset do próprio "meio-dia" do dia-alvo
  // (meio-dia evita ambiguidade nas transições de horário de verão).
  const noonProbe = new Date(base.getTime() + 12 * 60 * 60 * 1000);
  const offset = findSpOffset(noonProbe); // ex.: 3 para UTC-3

  // spHour SP = (spHour + offset) UTC no mesmo dia-calendário.
  return new Date(base.getTime() + (spHour + offset) * 60 * 60 * 1000);
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
