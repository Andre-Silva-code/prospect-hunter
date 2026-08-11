import { describe, expect, it } from "vitest";

import { extractCnpjFromText } from "@/lib/connectors/sem-gmn-enrichment";
import { extractPhonesFromText } from "@/lib/connectors/phone-enrichment";

describe("extractCnpjFromText", () => {
  it("extrai CNPJ formatado", () => {
    expect(extractCnpjFromText("Empresa X CNPJ: 47.960.950/0001-21 ativa")).toBe("47960950000121");
  });

  it("extrai CNPJ só com dígitos", () => {
    expect(extractCnpjFromText("cnpj 47960950000121 na receita")).toBe("47960950000121");
  });

  it("retorna null quando não há CNPJ", () => {
    expect(extractCnpjFromText("Clínica de estética em Campinas")).toBeNull();
    expect(extractCnpjFromText("")).toBeNull();
  });

  it("ignora sequências que não têm 14 dígitos", () => {
    expect(extractCnpjFromText("telefone 11 3711-2002")).toBeNull();
  });
});

describe("extractPhonesFromText", () => {
  it("extrai telefone com DDD e formatação", () => {
    expect(extractPhonesFromText("Ligue (11) 98765-4321 agora")).toContain("5511987654321");
  });

  it("extrai fixo com DDD", () => {
    // 11 3711-2002 → 1137112002 tem 10 dígitos → 55 + 10 = 5511 3711 2002
    expect(extractPhonesFromText("Tel: 11 3711-2002")).toContain("551137112002");
  });

  it("extrai telefone com prefixo +55", () => {
    expect(extractPhonesFromText("WhatsApp +55 11 98765-4321")).toContain("5511987654321");
  });

  it("retorna vazio quando não há telefone plausível", () => {
    expect(extractPhonesFromText("Clínica de estética em Campinas")).toEqual([]);
    expect(extractPhonesFromText("")).toEqual([]);
  });

  it("deduplica telefones repetidos", () => {
    const text = "Contato (11) 98765-4321 ou 11987654321";
    const result = extractPhonesFromText(text);
    expect(result.filter((p: string) => p === "5511987654321")).toHaveLength(1);
  });
});
