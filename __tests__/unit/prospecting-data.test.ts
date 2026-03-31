import { describe, expect, it } from "vitest";

import { icpSegments, channelPlan, prospects, outreachSteps, kpis } from "@/lib/prospecting-data";
import type { IcpSegment, ChannelPlan, Prospect, OutreachStep } from "@/lib/prospecting-data";

describe("icpSegments", () => {
  it("exports a non-empty array", () => {
    expect(Array.isArray(icpSegments)).toBe(true);
    expect(icpSegments.length).toBeGreaterThan(0);
  });

  it("contains exactly 10 segments", () => {
    expect(icpSegments).toHaveLength(10);
  });

  it("each segment has required fields", () => {
    icpSegments.forEach((segment: IcpSegment) => {
      expect(segment).toHaveProperty("title");
      expect(segment).toHaveProperty("pain");
      expect(segment).toHaveProperty("offer");
      expect(segment).toHaveProperty("cpl");
      expect(typeof segment.title).toBe("string");
      expect(typeof segment.pain).toBe("string");
      expect(typeof segment.offer).toBe("string");
      expect(typeof segment.cpl).toBe("string");
    });
  });

  it("has no empty string fields", () => {
    icpSegments.forEach((segment: IcpSegment) => {
      expect(segment.title.length).toBeGreaterThan(0);
      expect(segment.pain.length).toBeGreaterThan(0);
      expect(segment.offer.length).toBeGreaterThan(0);
      expect(segment.cpl.length).toBeGreaterThan(0);
    });
  });

  it("has unique titles", () => {
    const titles = icpSegments.map((s) => s.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("cpl follows R$ range format", () => {
    icpSegments.forEach((segment: IcpSegment) => {
      expect(segment.cpl).toMatch(/^R\$ \d+-\d+$/);
    });
  });
});

describe("channelPlan", () => {
  it("exports a non-empty array", () => {
    expect(Array.isArray(channelPlan)).toBe(true);
    expect(channelPlan.length).toBeGreaterThan(0);
  });

  it("contains exactly 3 channels", () => {
    expect(channelPlan).toHaveLength(3);
  });

  it("each channel has required fields", () => {
    channelPlan.forEach((channel: ChannelPlan) => {
      expect(channel).toHaveProperty("channel");
      expect(channel).toHaveProperty("cadence");
      expect(channel).toHaveProperty("goal");
      expect(typeof channel.channel).toBe("string");
      expect(typeof channel.cadence).toBe("string");
      expect(typeof channel.goal).toBe("string");
    });
  });

  it("has unique channel names", () => {
    const names = channelPlan.map((c) => c.channel);
    expect(new Set(names).size).toBe(names.length);
  });

  it("includes Meta Ads, Instagram outbound, and WhatsApp comercial", () => {
    const names = channelPlan.map((c) => c.channel);
    expect(names).toContain("Meta Ads");
    expect(names).toContain("Instagram outbound");
    expect(names).toContain("WhatsApp comercial");
  });
});

describe("prospects", () => {
  it("exports a non-empty array", () => {
    expect(Array.isArray(prospects)).toBe(true);
    expect(prospects.length).toBeGreaterThan(0);
  });

  it("contains exactly 4 prospects", () => {
    expect(prospects).toHaveLength(4);
  });

  it("each prospect has all required fields", () => {
    prospects.forEach((p: Prospect) => {
      expect(typeof p.company).toBe("string");
      expect(typeof p.niche).toBe("string");
      expect(typeof p.region).toBe("string");
      expect(typeof p.monthlyBudget).toBe("string");
      expect(typeof p.score).toBe("number");
      expect(typeof p.priority).toBe("string");
      expect(typeof p.trigger).toBe("string");
      expect(typeof p.source).toBe("string");
      expect(typeof p.icp).toBe("string");
    });
  });

  it("priority is always Alta, Media, or Baixa", () => {
    const validPriorities = ["Alta", "Media", "Baixa"];
    prospects.forEach((p: Prospect) => {
      expect(validPriorities).toContain(p.priority);
    });
  });

  it("source is always a valid channel", () => {
    const validSources = ["Instagram", "LinkedIn", "Google Maps", "Google Meu Negócio"];
    prospects.forEach((p: Prospect) => {
      expect(validSources).toContain(p.source);
    });
  });

  it("score is between 0 and 100", () => {
    prospects.forEach((p: Prospect) => {
      expect(p.score).toBeGreaterThanOrEqual(0);
      expect(p.score).toBeLessThanOrEqual(100);
    });
  });

  it("has unique company names", () => {
    const companies = prospects.map((p) => p.company);
    expect(new Set(companies).size).toBe(companies.length);
  });

  it("icp references an existing segment title (accent-insensitive)", () => {
    const normalize = (s: string) =>
      s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    const segmentTitles = icpSegments.map((s) => normalize(s.title));
    prospects.forEach((p: Prospect) => {
      expect(segmentTitles).toContain(normalize(p.icp));
    });
  });

  it("Alta priority prospects have score >= 80", () => {
    const altaProspects = prospects.filter((p) => p.priority === "Alta");
    altaProspects.forEach((p) => {
      expect(p.score).toBeGreaterThanOrEqual(80);
    });
  });

  it("Baixa priority prospects have score < 70", () => {
    const baixaProspects = prospects.filter((p) => p.priority === "Baixa");
    baixaProspects.forEach((p) => {
      expect(p.score).toBeLessThan(70);
    });
  });
});

describe("outreachSteps", () => {
  it("exports a non-empty array", () => {
    expect(Array.isArray(outreachSteps)).toBe(true);
    expect(outreachSteps.length).toBeGreaterThan(0);
  });

  it("contains exactly 3 steps", () => {
    expect(outreachSteps).toHaveLength(3);
  });

  it("each step has required fields", () => {
    outreachSteps.forEach((step: OutreachStep) => {
      expect(typeof step.day).toBe("string");
      expect(typeof step.touchpoint).toBe("string");
      expect(typeof step.script).toBe("string");
    });
  });

  it("days follow sequential order (Dia 1, 3, 5)", () => {
    expect(outreachSteps[0]?.day).toBe("Dia 1");
    expect(outreachSteps[1]?.day).toBe("Dia 3");
    expect(outreachSteps[2]?.day).toBe("Dia 5");
  });

  it("uses distinct touchpoints", () => {
    const touchpoints = outreachSteps.map((s) => s.touchpoint);
    expect(new Set(touchpoints).size).toBe(touchpoints.length);
  });

  it("scripts are non-trivial (at least 20 characters)", () => {
    outreachSteps.forEach((step: OutreachStep) => {
      expect(step.script.length).toBeGreaterThanOrEqual(20);
    });
  });
});

describe("kpis", () => {
  it("exports a non-empty array", () => {
    expect(Array.isArray(kpis)).toBe(true);
    expect(kpis.length).toBeGreaterThan(0);
  });

  it("contains exactly 4 KPIs", () => {
    expect(kpis).toHaveLength(4);
  });

  it("each KPI has label, value, and detail", () => {
    kpis.forEach((kpi) => {
      expect(typeof kpi.label).toBe("string");
      expect(typeof kpi.value).toBe("string");
      expect(typeof kpi.detail).toBe("string");
      expect(kpi.label.length).toBeGreaterThan(0);
      expect(kpi.value.length).toBeGreaterThan(0);
      expect(kpi.detail.length).toBeGreaterThan(0);
    });
  });

  it("has unique labels", () => {
    const labels = kpis.map((k) => k.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("includes key business metrics", () => {
    const labels = kpis.map((k) => k.label);
    expect(labels).toContain("Leads qualificados/semana");
    expect(labels).toContain("Taxa de resposta");
    expect(labels).toContain("Diagnosticos agendados");
    expect(labels).toContain("Fechamentos/mês");
  });
});
