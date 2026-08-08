import { describe, expect, it } from "vitest";

import { isBusinessHour, nextBusinessMoment } from "@/lib/business-hours";

/**
 * Estes testes travam a regra de horário comercial (seg–sex, 08:00–18:00,
 * fuso America/Sao_Paulo). Para evitar ambiguidade com horário de verão,
 * usamos datas de JULHO — mês em que o Brasil não adota horário de verão,
 * então São Paulo = UTC-3 de forma estável.
 *
 * Assim, para obter uma hora H em SP, usamos (H + 3) em UTC.
 * Ex.: 10:00 SP  → 13:00 UTC.
 */

/** Cria um Date a partir de uma hora local de São Paulo (assumindo UTC-3). */
function spDate(
  year: number,
  month: number, // 1-12
  day: number,
  spHour: number,
  spMinute = 0
): Date {
  return new Date(Date.UTC(year, month - 1, day, spHour + 3, spMinute, 0));
}

/** Extrai a hora e o dia da semana em São Paulo (para asserts). */
function spParts(date: Date): { weekday: number; hour: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = fmt.formatToParts(date);
  const weekdayStr = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hourStr = parts.find((p) => p.type === "hour")?.value ?? "0";
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  // Intl pode devolver "24" para meia-noite; normaliza para 0.
  const hour = parseInt(hourStr, 10) % 24;
  return { weekday: weekdayMap[weekdayStr] ?? -1, hour };
}

describe("isBusinessHour", () => {
  it("retorna true para dia útil dentro da janela (quarta 10:00 SP)", () => {
    // 2026-07-15 é uma quarta-feira
    expect(isBusinessHour(spDate(2026, 7, 15, 10))).toBe(true);
  });

  it("retorna true nos limites internos (08:00 e 17:59 SP)", () => {
    expect(isBusinessHour(spDate(2026, 7, 15, 8, 0))).toBe(true);
    expect(isBusinessHour(spDate(2026, 7, 15, 17, 59))).toBe(true);
  });

  it("retorna false antes de abrir (dia útil 07:00 SP)", () => {
    expect(isBusinessHour(spDate(2026, 7, 15, 7))).toBe(false);
  });

  it("retorna false às 18:00 e depois de fechar (dia útil 18:00 e 20:00 SP)", () => {
    expect(isBusinessHour(spDate(2026, 7, 15, 18, 0))).toBe(false);
    expect(isBusinessHour(spDate(2026, 7, 15, 20))).toBe(false);
  });

  it("retorna false no fim de semana (sábado e domingo ao meio-dia SP)", () => {
    // 2026-07-18 sábado, 2026-07-19 domingo
    expect(isBusinessHour(spDate(2026, 7, 18, 12))).toBe(false);
    expect(isBusinessHour(spDate(2026, 7, 19, 12))).toBe(false);
  });
});

describe("nextBusinessMoment", () => {
  it("mantém o instante quando já está em horário comercial", () => {
    const input = spDate(2026, 7, 15, 10); // quarta 10:00 SP
    expect(nextBusinessMoment(input).getTime()).toBe(input.getTime());
  });

  it("empurra para 08:00–08:30 SP do mesmo dia quando é antes de abrir", () => {
    const input = spDate(2026, 7, 15, 6); // quarta 06:00 SP
    const result = nextBusinessMoment(input);
    const { weekday, hour } = spParts(result);
    expect(weekday).toBe(3); // continua quarta
    expect(hour).toBe(8); // abre às 08:00 (jitter de até 30 min mantém na hora 8)
    // Nunca deve resultar fora da janela
    expect(isBusinessHour(result)).toBe(true);
  });

  it("empurra para o próximo dia útil quando é depois de fechar", () => {
    const input = spDate(2026, 7, 15, 20); // quarta 20:00 SP
    const result = nextBusinessMoment(input);
    const { weekday, hour } = spParts(result);
    expect(weekday).toBe(4); // vira quinta
    expect(hour).toBe(8);
    expect(isBusinessHour(result)).toBe(true);
  });

  it("pula o fim de semana: sábado → segunda 08:00 SP", () => {
    const input = spDate(2026, 7, 18, 15); // sábado 15:00 SP
    const result = nextBusinessMoment(input);
    const { weekday, hour } = spParts(result);
    expect(weekday).toBe(1); // segunda
    expect(hour).toBe(8);
    expect(isBusinessHour(result)).toBe(true);
  });

  it("nunca agenda no passado", () => {
    const input = spDate(2026, 7, 19, 23); // domingo 23:00 SP
    const result = nextBusinessMoment(input);
    expect(result.getTime()).toBeGreaterThan(input.getTime());
    expect(isBusinessHour(result)).toBe(true);
  });
});
