import { describe, expect, it } from "vitest";

import {
  expandRegion,
  deriveScoreFromSignals,
  scoreToPriority,
  estimateBudget,
} from "@/lib/connectors/utils";

describe("expandRegion", () => {
  it("expands state abbreviation to full name", () => {
    expect(expandRegion("SP")).toBe("São Paulo");
    expect(expandRegion("RJ")).toBe("Rio de Janeiro");
    expect(expandRegion("MG")).toBe("Minas Gerais");
  });

  it("handles lowercase abbreviation", () => {
    expect(expandRegion("sp")).toBe("São Paulo");
    expect(expandRegion("ba")).toBe("Bahia");
  });

  it("returns original string when not a known abbreviation", () => {
    expect(expandRegion("São Paulo")).toBe("São Paulo");
    expect(expandRegion("Campinas")).toBe("Campinas");
  });

  it("trims whitespace", () => {
    expect(expandRegion("  SP  ")).toBe("São Paulo");
  });
});

describe("deriveScoreFromSignals", () => {
  it("returns base score when no signals provided", () => {
    expect(deriveScoreFromSignals(undefined, undefined)).toBe(55);
  });

  it("increases score with followers", () => {
    const score = deriveScoreFromSignals(10000, undefined);
    expect(score).toBeGreaterThan(55);
  });

  it("increases score with reviews", () => {
    const score = deriveScoreFromSignals(undefined, 500);
    expect(score).toBeGreaterThan(55);
  });

  it("combines followers and reviews", () => {
    const followersOnly = deriveScoreFromSignals(5000, undefined);
    const both = deriveScoreFromSignals(5000, 200);
    expect(both).toBeGreaterThan(followersOnly);
  });
});

describe("scoreToPriority", () => {
  it("returns Alta for scores >= 80", () => {
    expect(scoreToPriority(80)).toBe("Alta");
    expect(scoreToPriority(95)).toBe("Alta");
  });

  it("returns Media for scores 60-79", () => {
    expect(scoreToPriority(60)).toBe("Media");
    expect(scoreToPriority(79)).toBe("Media");
  });

  it("returns Baixa for scores < 60", () => {
    expect(scoreToPriority(59)).toBe("Baixa");
    expect(scoreToPriority(40)).toBe("Baixa");
  });
});

describe("estimateBudget", () => {
  it("maps score ranges to budget strings", () => {
    expect(estimateBudget(90)).toBe("R$ 15k");
    expect(estimateBudget(75)).toBe("R$ 10k");
    expect(estimateBudget(65)).toBe("R$ 7k");
    expect(estimateBudget(50)).toBe("R$ 5k");
  });
});
