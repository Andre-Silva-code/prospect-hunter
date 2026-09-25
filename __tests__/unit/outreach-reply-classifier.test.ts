import { describe, expect, it } from "vitest";

import {
  isBot,
  isNegative,
  isQualificationConfirm,
  isLikelyBotByTiming,
} from "@/lib/outreach-reply-classifier";

describe("outreach-reply-classifier", () => {
  describe("isNegative", () => {
    it("detecta recusas explícitas", () => {
      expect(isNegative("não tenho interesse")).toBe(true);
      expect(isNegative("sem interesse, obrigado")).toBe(true);
      expect(isNegative("pare de enviar mensagens")).toBe(true);
      expect(isNegative("não quero")).toBe(true);
    });

    it("trata 'não' solto como recusa quando não há interesse", () => {
      expect(isNegative("não")).toBe(true);
      expect(isNegative("n")).toBe(true);
    });

    it("NÃO trata como recusa quando há sinal de interesse", () => {
      expect(isNegative("não sabia disso, quero saber mais")).toBe(false);
      expect(isNegative("não entendi, pode explicar?")).toBe(false);
    });

    // Correção #6: adiamento/indecisão não deve queimar o lead
    it("NÃO trata adiamento/indecisão como recusa", () => {
      expect(isNegative("ainda não decidi")).toBe(false);
      expect(isNegative("agora não posso falar")).toBe(false);
      expect(isNegative("hoje não dá, me chama depois")).toBe(false);
      expect(isNegative("no momento não, mais tarde")).toBe(false);
    });
  });

  describe("isQualificationConfirm", () => {
    it("confirma quando o lead é o responsável", () => {
      expect(isQualificationConfirm("sim")).toBe(true);
      expect(isQualificationConfirm("sou eu mesmo")).toBe(true);
      expect(isQualificationConfirm("com certeza")).toBe(true);
      expect(isQualificationConfirm("s")).toBe(true);
    });

    // Correção #7: "sim, mas quem cuida é outra pessoa" não deve confirmar
    it("NÃO confirma quando aponta para terceiros", () => {
      expect(isQualificationConfirm("sim, mas quem cuida é meu sócio")).toBe(false);
      expect(isQualificationConfirm("na verdade fala com outra pessoa")).toBe(false);
      expect(isQualificationConfirm("não sou eu, é o responsável de marketing")).toBe(false);
      expect(isQualificationConfirm("quem mexe nisso é a minha sócia")).toBe(false);
    });
  });

  describe("isBot", () => {
    it("detecta respostas automáticas", () => {
      expect(isBot("mensagem automática: retornaremos em breve")).toBe(true);
      expect(isBot("olá, como posso te ajudar?")).toBe(true);
      expect(isBot("estamos fora do horário de atendimento")).toBe(true);
    });

    it("não marca resposta humana comum como bot", () => {
      expect(isBot("oi, tudo bem? me conta mais")).toBe(false);
    });
  });

  describe("isLikelyBotByTiming", () => {
    it("marca resposta em menos de 10s como provável bot", () => {
      const now = new Date().toISOString();
      expect(isLikelyBotByTiming(now)).toBe(true);
    });

    it("não marca resposta após 10s", () => {
      const past = new Date(Date.now() - 30_000).toISOString();
      expect(isLikelyBotByTiming(past)).toBe(false);
    });

    it("retorna false quando sentAt é nulo", () => {
      expect(isLikelyBotByTiming(null)).toBe(false);
      expect(isLikelyBotByTiming(undefined)).toBe(false);
    });
  });
});
