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
  });

  it("rejeita nome só com termos genéricos de segmento", () => {
    // "Clínica de Estética" não tem token próprio → não serve como lead
    expect(looksLikeBusinessName("Clínica de Estética")).toBe(false);
  });

  it("rejeita nome muito curto", () => {
    expect(looksLikeBusinessName("Pró")).toBe(false);
  });
});
