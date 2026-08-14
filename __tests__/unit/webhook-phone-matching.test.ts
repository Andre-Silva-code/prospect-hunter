import { describe, expect, it } from "vitest";

import { phoneDigitsFromJid, phonesMatch } from "@/lib/outreach-queue-helpers";

describe("phoneDigitsFromJid", () => {
  it("extrai os dígitos de um JID padrão", () => {
    expect(phoneDigitsFromJid("5519996926969@s.whatsapp.net")).toBe("5519996926969");
  });

  it("retorna vazio para JID no formato @lid (não é telefone)", () => {
    expect(phoneDigitsFromJid("144770546561049@lid")).toBe("");
  });

  it("lida com null/vazio", () => {
    expect(phoneDigitsFromJid(null)).toBe("");
    expect(phoneDigitsFromJid("")).toBe("");
  });
});

describe("phonesMatch", () => {
  it("casa números idênticos", () => {
    expect(phonesMatch("5519996926969", "5519996926969")).toBe(true);
  });

  it("casa apesar da diferença do 9º dígito (mesmos 8 finais)", () => {
    // com 9º dígito vs sem — os 8 finais (96926969) são iguais
    expect(phonesMatch("5519996926969", "551996926969")).toBe(true);
  });

  it("NÃO casa números de assinantes diferentes", () => {
    expect(phonesMatch("5519996926969", "5519912345678")).toBe(false);
  });

  it("não casa quando algum está vazio", () => {
    expect(phonesMatch("", "5519996926969")).toBe(false);
    expect(phonesMatch("5519996926969", "")).toBe(false);
  });
});
