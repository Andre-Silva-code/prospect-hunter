import { describe, expect, it } from "vitest";

import { isNegative } from "@/app/api/outreach/webhook/route";

describe("isNegative — recusas explícitas (sempre negativas)", () => {
  const recusas = [
    "não quero",
    "não tenho interesse",
    "sem interesse",
    "não preciso disso",
    "não, obrigado",
    "obrigado, não",
    "negativo",
    "dispenso",
    "deixa pra lá",
    "não me interessa",
    "pare de enviar mensagens",
    "não mande mais",
    "nope",
  ];

  for (const msg of recusas) {
    it(`marca como negativa: "${msg}"`, () => {
      expect(isNegative(msg)).toBe(true);
    });
  }
});

describe("isNegative — 'não' solto sem interesse (negativa)", () => {
  it("marca 'não' isolado como negativa", () => {
    expect(isNegative("não")).toBe(true);
    expect(isNegative("n")).toBe(true);
    expect(isNegative("Não.")).toBe(true);
  });
});

describe("isNegative — falsos negativos (NÃO devem ser recusa)", () => {
  const interessados = [
    "não sabia que existia isso, quero saber mais!",
    "nossa, não imaginava — me conta como funciona",
    "não tinha pensado nisso, interessante, vamos conversar",
    "ainda não vi, mas pode mandar mais informações",
    "não entendi direito, pode explicar?",
    "não faço ideia de quanto custa, quanto fica?",
    "por que não? bora agendar",
  ];

  for (const msg of interessados) {
    it(`NÃO marca como negativa: "${msg}"`, () => {
      expect(isNegative(msg)).toBe(false);
    });
  }
});

describe("isNegative — mensagens neutras/positivas", () => {
  it("mensagem positiva não é negativa", () => {
    expect(isNegative("quero saber mais")).toBe(false);
    expect(isNegative("sim, me interessa")).toBe(false);
    expect(isNegative("como funciona?")).toBe(false);
  });
});
