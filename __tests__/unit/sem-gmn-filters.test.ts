import { describe, expect, it } from "vitest";

import { __testables } from "@/lib/connectors/sem-gmn";

const { cleanBusinessName, looksLikeBusinessName, isBlockedDomain, domainOf } = __testables;

describe("cleanBusinessName", () => {
  it("remove sufixo de rede social", () => {
    expect(cleanBusinessName("Donnaliz Estética | Campinas SP - Facebook")).toBe(
      "Donnaliz Estética"
    );
    expect(cleanBusinessName("Prd Laser e Estética - Campinas (@prd) - Instagram")).toBe(
      "Prd Laser e Estética"
    );
  });

  it("preserva nomes com hífen interno (não corta 'Pró-Corpo')", () => {
    expect(cleanBusinessName("Pró-Corpo Estética | Campinas SP - Facebook")).toBe(
      "Pró-Corpo Estética"
    );
  });

  it("remove handle entre parênteses", () => {
    expect(cleanBusinessName("GermainParis (@germainparis_)")).toBe("GermainParis");
  });
});

describe("domainOf / isBlockedDomain", () => {
  it("extrai o host sem www", () => {
    expect(domainOf("https://www.doctoralia.com.br/clinica")).toBe("doctoralia.com.br");
  });

  it("bloqueia diretórios, cursos e agregadores", () => {
    expect(isBlockedDomain("https://www.puc-campinas.edu.br/estetica")).toBe(true);
    expect(isBlockedDomain("https://www.doctoralia.com.br/x")).toBe(true);
    expect(isBlockedDomain("https://www.getninjas.com.br/x")).toBe(true);
  });

  it("permite domínios de negócio e redes sociais", () => {
    expect(isBlockedDomain("https://www.instagram.com/donnalizestetica/")).toBe(false);
    expect(isBlockedDomain("https://www.facebook.com/prdlaser/")).toBe(false);
    expect(isBlockedDomain("https://chezelle.com.br")).toBe(false);
  });

  it("bloqueia URLs de conteúdo (vídeos, posts, eventos)", () => {
    expect(
      isBlockedDomain("https://www.facebook.com/masterposbrasil/videos/turma-de-estetica/")
    ).toBe(true);
    expect(isBlockedDomain("https://www.facebook.com/events/123")).toBe(true);
  });
});

describe("looksLikeBusinessName", () => {
  it("aceita nomes de negócio com termo próprio", () => {
    expect(looksLikeBusinessName("Donnaliz Estética")).toBe(true);
    expect(looksLikeBusinessName("Chez Elle Estética e Laser")).toBe(true);
  });

  it("rejeita páginas coletivas e cursos", () => {
    expect(looksLikeBusinessName("Estética EAD")).toBe(false);
    expect(looksLikeBusinessName("Beleza e Estética Campinas e Região")).toBe(false);
    expect(looksLikeBusinessName("Especialistas em medicina estética")).toBe(false);
    expect(looksLikeBusinessName("Turma de Estética")).toBe(false);
    expect(looksLikeBusinessName("Início")).toBe(false);
    expect(looksLikeBusinessName("Home")).toBe(false);
  });

  it("rejeita eventos, feiras e congressos", () => {
    expect(looksLikeBusinessName("Congresso Estetika")).toBe(false);
    expect(looksLikeBusinessName("Beauty Fair Congresso")).toBe(false);
    expect(looksLikeBusinessName("Feira de Estética Expo")).toBe(false);
  });

  it("rejeita títulos-frase de SEO (longos ou descritivos)", () => {
    expect(looksLikeBusinessName("Tratamentos estéticos personalizados e cuidados especiais")).toBe(
      false
    );
    expect(looksLikeBusinessName("Clínica de Estética em SBC Excelência e Cuidado")).toBe(false);
    expect(looksLikeBusinessName("Clinica de estetica perto de mim")).toBe(false);
  });

  it("ainda aceita nomes de negócio normais", () => {
    expect(looksLikeBusinessName("ChezElle Estética e Laser")).toBe(true);
    expect(looksLikeBusinessName("Emporium da Beleza")).toBe(true);
    expect(looksLikeBusinessName("Labelle Estética")).toBe(true);
  });

  it("rejeita nome só com termos genéricos de segmento", () => {
    // "Clínica de Estética" não tem token próprio → não serve como lead
    expect(looksLikeBusinessName("Clínica de Estética")).toBe(false);
  });

  it("rejeita nome muito curto", () => {
    expect(looksLikeBusinessName("Pró")).toBe(false);
  });
});
