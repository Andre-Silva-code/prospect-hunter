import { describe, expect, it } from "vitest";

import { qualifyLead } from "@/lib/lead-qualification";

describe("qualifyLead — critérios de qualificação (Tarefa B)", () => {
  it("dá score alto e Funil B para empresa sem perfil GMN, sem site, mas contatável", () => {
    const result = qualifyLead({
      hasGoogleProfile: false,
      hasWebsite: false,
      hasValidPhone: true,
      reviewCount: 0,
    });

    expect(result.funnel).toBe("B");
    expect(result.contactable).toBe(true);
    expect(result.priority).toBe("Alta");
    expect(result.qualificationScore).toBeGreaterThanOrEqual(60);
    expect(result.reasons).toContain("Sem perfil no Google Meu Negócio (invisível na busca)");
  });

  it("classifica como Funil A quando a empresa tem perfil GMN", () => {
    const result = qualifyLead({
      hasGoogleProfile: true,
      hasWebsite: true,
      hasValidPhone: true,
      rating: 4.8,
      reviewCount: 200,
    });

    expect(result.funnel).toBe("A");
  });

  it("penaliza lead sem telefone válido (inabordável) e marca contactable=false", () => {
    const semContato = qualifyLead({
      hasGoogleProfile: false,
      hasWebsite: false,
      hasValidPhone: false,
      reviewCount: 0,
    });
    const comContato = qualifyLead({
      hasGoogleProfile: false,
      hasWebsite: false,
      hasValidPhone: true,
      reviewCount: 0,
    });

    expect(semContato.contactable).toBe(false);
    expect(semContato.qualificationScore).toBeLessThan(comContato.qualificationScore);
  });

  it("considera nota baixa como necessidade quando há perfil (Funil A)", () => {
    const notaBaixa = qualifyLead({
      hasGoogleProfile: true,
      hasWebsite: true,
      hasValidPhone: true,
      rating: 3.2,
      reviewCount: 10,
    });
    const notaAlta = qualifyLead({
      hasGoogleProfile: true,
      hasWebsite: true,
      hasValidPhone: true,
      rating: 4.9,
      reviewCount: 10,
    });

    expect(notaBaixa.qualificationScore).toBeGreaterThan(notaAlta.qualificationScore);
    expect(notaBaixa.reasons.some((r) => r.includes("espaço para melhorar"))).toBe(true);
  });

  it("mantém o score sempre entre 0 e 100", () => {
    const maximo = qualifyLead({
      hasGoogleProfile: false,
      hasWebsite: false,
      hasValidPhone: true,
      rating: 1,
      reviewCount: 5,
    });
    const minimo = qualifyLead({
      hasGoogleProfile: true,
      hasWebsite: true,
      hasValidPhone: false,
      rating: 5,
      reviewCount: 5000,
    });

    for (const r of [maximo, minimo]) {
      expect(r.qualificationScore).toBeGreaterThanOrEqual(0);
      expect(r.qualificationScore).toBeLessThanOrEqual(100);
    }
  });

  it("trata sinais desconhecidos sem quebrar (contactabilidade neutra)", () => {
    const result = qualifyLead({});
    expect(result.contactable).toBe(true); // não sabemos → não bloqueia
    expect(result.funnel).toBe("A"); // sem info de perfil → assume A
    expect(Number.isFinite(result.qualificationScore)).toBe(true);
  });
});
