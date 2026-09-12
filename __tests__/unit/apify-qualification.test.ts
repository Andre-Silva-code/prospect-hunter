import { describe, expect, it } from "vitest";

import { normalizeApifyItem } from "@/lib/connectors/normalizers";
import type { ProspectSearchRequest } from "@/lib/connectors/types";

/**
 * Cobre o Gap #1 da revisão: a qualificação de fit comercial (qualificationScore,
 * funnel e contactable) deve ser populada também nas fontes Apify (Instagram,
 * LinkedIn, Google Maps) — antes só o Google Places integrava qualifyLead.
 */

const baseRequest: ProspectSearchRequest = {
  icp: "clinicas de estetica",
  niche: "Estetica",
  region: "Campinas",
  city: "Campinas",
  sources: ["Instagram", "LinkedIn", "Google Maps"],
  limitPerSource: 10,
};

describe("normalizeApifyItem — qualificação de fit", () => {
  it("Instagram: popula qualificationScore, funnel e contactable", () => {
    const item = {
      title: "Clinica Bella (@clinicabella) • Instagram",
      url: "https://www.instagram.com/clinicabella/",
      description: "Estetica avancada. WhatsApp (19) 99999-8888",
    };

    const result = normalizeApifyItem(item, "Instagram", baseRequest, 0);

    expect(result).not.toBeNull();
    expect(result?.qualificationScore).toBeTypeOf("number");
    expect(result?.funnel).toBeDefined();
    // WhatsApp presente na bio → lead abordável
    expect(result?.contactable).toBe(true);
  });

  it("Instagram sem WhatsApp na bio: ainda qualifica, sem quebrar", () => {
    const item = {
      title: "Studio X (@studiox) • Instagram",
      url: "https://www.instagram.com/studiox/",
      description: "So agendamentos pelo direct.",
    };

    const result = normalizeApifyItem(item, "Instagram", baseRequest, 1);

    expect(result).not.toBeNull();
    expect(result?.qualificationScore).toBeTypeOf("number");
    expect(result?.funnel).toBeDefined();
  });

  it("LinkedIn (Apify genérico): popula os campos de qualificação", () => {
    const item = {
      companyName: "Agencia Alfa",
      industry: "Marketing",
      website: "https://agenciaalfa.com",
      linkedinUrl: "https://www.linkedin.com/company/agenciaalfa",
    };

    const result = normalizeApifyItem(item, "LinkedIn", baseRequest, 0);

    expect(result).not.toBeNull();
    expect(result?.qualificationScore).toBeTypeOf("number");
    expect(result?.funnel).toBeDefined();
    expect(result?.contactable).toBeTypeOf("boolean");
  });

  it("Google Maps: perfil GMN presente → funil A", () => {
    const item = {
      name: "Restaurante do Zé",
      totalScore: 4.6,
      reviewsCount: 120,
      phone: "(19) 3333-4444",
      googleMapsUrl: "https://maps.google.com/?cid=123",
    };

    const result = normalizeApifyItem(item, "Google Maps", baseRequest, 0);

    expect(result).not.toBeNull();
    expect(result?.qualificationScore).toBeTypeOf("number");
    // Fonte Google garante perfil GMN → Funil A
    expect(result?.funnel).toBe("A");
  });
});
