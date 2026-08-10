import { describe, expect, it } from "vitest";

import {
  normalizeName,
  significantTokens,
  nameSimilarity,
  decideGmnPresence,
} from "@/lib/connectors/gmn-detector";

describe("normalizeName", () => {
  it("remove acentos, pontuação e caixa", () => {
    expect(normalizeName("Clínica Estética Bella!")).toBe("clinica estetica bella");
    expect(normalizeName("Pró-Corpo  Estética")).toBe("pro corpo estetica");
  });
});

describe("significantTokens", () => {
  it("descarta termos genéricos de segmento", () => {
    // "clinica", "estetica", "de" são genéricos → sobra só o nome próprio
    expect(significantTokens("Clínica de Estética Bella")).toEqual(["bella"]);
  });

  it("mantém nomes próprios distintos", () => {
    expect(significantTokens("Espaço Corpo Campinas")).toEqual(["corpo", "campinas"]);
  });
});

describe("nameSimilarity", () => {
  it("é alta para nomes essencialmente iguais", () => {
    expect(
      nameSimilarity("Pró-Corpo Estética", "Pró-Corpo Estética Avançada")
    ).toBeGreaterThanOrEqual(0.5);
  });

  it("é baixa para negócios diferentes que só compartilham termos genéricos", () => {
    // Ambas são "clínica de estética", mas nomes próprios diferentes → baixa
    expect(
      nameSimilarity("Clínica de Estética Bella", "Clínica de Estética Symetria")
    ).toBeLessThan(0.5);
  });

  it("é zero quando um dos nomes só tem termos genéricos", () => {
    expect(nameSimilarity("Clínica de Estética", "Symetria")).toBe(0);
  });
});

describe("decideGmnPresence", () => {
  it("retorna 'absent' quando o Google não devolve nenhum place", () => {
    const r = decideGmnPresence("Estúdio Fulano", []);
    expect(r.presence).toBe("absent");
  });

  it("retorna 'has' quando há ficha com nome correspondente", () => {
    const r = decideGmnPresence("Pró-Corpo Estética", [
      "Pró-Corpo Estética Avançada - Campinas",
      "Outra Clínica Qualquer",
    ]);
    expect(r.presence).toBe("has");
    expect(r.bestIndex).toBe(0);
  });

  it("retorna 'absent' quando o Google só traz places não relacionados", () => {
    // Caso real do teste de conceito: nome fake retornou "Symetria" (sim=0).
    // Como nada é parecido, concluímos que o negócio buscado não tem ficha.
    const r = decideGmnPresence("Salão Inexistente XYZ123", ["Symetria"]);
    expect(r.presence).toBe("absent");
  });

  it("retorna 'unknown' na zona intermediária (parecido, mas não o bastante)", () => {
    // "Luiza Biomedicina Estética" x "Luiza Nails" compartilham só "luiza" →
    // similaridade intermediária: nem confirma nem descarta.
    const r = decideGmnPresence("Luiza Biomedicina Estética", ["Luiza Nails Designer"]);
    expect(r.presence).toBe("unknown");
  });

  it("respeita um threshold customizado mais rígido (correspondência parcial vira unknown)", () => {
    const r = decideGmnPresence(
      "Pró-Corpo Estética",
      ["Pró-Corpo Estética Avançada - Campinas"],
      0.95
    );
    expect(r.presence).toBe("unknown");
  });
});
