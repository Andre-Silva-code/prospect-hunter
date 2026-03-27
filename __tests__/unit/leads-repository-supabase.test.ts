import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createLead, listLeads, updateLeadRecord } from "@/lib/leads-repository";
import type { LeadRecord } from "@/types/prospecting";

function createResponse(ok: boolean, status: number, payload: unknown): Response {
  return { ok, status, json: async () => payload } as unknown as Response;
}

function buildLead(id: string): LeadRecord {
  return {
    id,
    userId: "user-1",
    company: `Lead ${id}`,
    niche: "Estetica",
    region: "Sao Paulo",
    monthlyBudget: "R$ 10k",
    contact: "@lead",
    trigger: "Anuncio ativo",
    stage: "Novo",
    score: 90,
    priority: "Alta",
    message: "Mensagem inicial",
    contactStatus: "Pendente",
    createdAt: "2026-03-10T00:00:00.000Z",
  };
}

function buildSupabaseRow(lead: LeadRecord) {
  return {
    id: lead.id,
    user_id: lead.userId,
    company: lead.company,
    niche: lead.niche,
    region: lead.region,
    monthly_budget: lead.monthlyBudget,
    contact: lead.contact,
    trigger: lead.trigger,
    stage: lead.stage,
    score: lead.score,
    priority: lead.priority,
    message: lead.message,
    contact_status: lead.contactStatus,
    created_at: lead.createdAt,
    source: lead.source ?? null,
    icp: lead.icp ?? null,
    follow_up_interval_days: lead.followUpIntervalDays ?? null,
    follow_up_step: lead.followUpStep ?? null,
    next_follow_up_at: lead.nextFollowUpAt ?? null,
    last_contact_at: lead.lastContactAt ?? null,
  };
}

describe("leads repository (Supabase storage)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.LEADS_STORAGE_PROVIDER = "supabase";
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_ANON_KEY = "test-anon-key";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("creates a lead via Supabase REST API", async () => {
    const lead = buildLead("lead-sb-1");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createResponse(true, 201, [buildSupabaseRow(lead)]));
    vi.stubGlobal("fetch", fetchMock);

    const result = await createLead("user-1", lead);

    expect(result.id).toBe("lead-sb-1");
    expect(result.company).toBe("Lead lead-sb-1");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://test.supabase.co/rest/v1/leads");
    expect(options.method).toBe("POST");
    expect(options.headers.apikey).toBe("test-anon-key");
    expect(options.headers.Prefer).toBe("return=representation");

    const body = JSON.parse(options.body);
    expect(body.company).toBe("Lead lead-sb-1");
    expect(body.user_id).toBe("user-1");
  });

  it("throws when Supabase insert fails", async () => {
    const lead = buildLead("lead-sb-2");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createResponse(false, 500, { error: "internal error" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createLead("user-1", lead)).rejects.toThrow("supabase insert failed");
  });

  it("throws when Supabase insert returns empty payload", async () => {
    const lead = buildLead("lead-sb-3");
    const fetchMock = vi.fn().mockResolvedValueOnce(createResponse(true, 201, []));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createLead("user-1", lead)).rejects.toThrow("empty payload");
  });

  it("lists leads from Supabase with field mapping", async () => {
    const lead = buildLead("lead-sb-4");
    const supabaseResponse = {
      ...buildSupabaseRow(lead),
      userId: undefined,
    };

    const fetchMock = vi.fn().mockResolvedValueOnce(createResponse(true, 200, [supabaseResponse]));
    vi.stubGlobal("fetch", fetchMock);

    const results = await listLeads("user-1");

    expect(results).toHaveLength(1);
    expect(results[0]?.company).toBe("Lead lead-sb-4");
    expect(results[0]?.userId).toBe("user-1");

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("user_id=eq.user-1");
  });

  it("returns empty array when Supabase returns non-array", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createResponse(true, 200, { error: "unexpected" }));
    vi.stubGlobal("fetch", fetchMock);

    const results = await listLeads("user-1");

    expect(results).toEqual([]);
  });

  it("updates a lead via Supabase PATCH", async () => {
    const lead = buildLead("lead-sb-5");
    const updatedRow = {
      ...buildSupabaseRow(lead),
      contact_status: "Mensagem enviada",
      stage: "Contato",
    };

    const fetchMock = vi.fn().mockResolvedValueOnce(createResponse(true, 200, [updatedRow]));
    vi.stubGlobal("fetch", fetchMock);

    const result = await updateLeadRecord("user-1", "lead-sb-5", {
      contactStatus: "Mensagem enviada",
      stage: "Contato",
    });

    expect(result?.contactStatus).toBe("Mensagem enviada");
    expect(result?.stage).toBe("Contato");

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("id=eq.lead-sb-5");
    expect(url).toContain("user_id=eq.user-1");
    expect(options.method).toBe("PATCH");

    const body = JSON.parse(options.body);
    expect(body.contact_status).toBe("Mensagem enviada");
    expect(body.stage).toBe("Contato");
  });

  it("returns null when Supabase PATCH fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createResponse(false, 404, { error: "not found" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await updateLeadRecord("user-1", "nonexistent", {
      stage: "Contato",
    });

    expect(result).toBeNull();
  });

  it("returns null when Supabase PATCH returns empty array", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(createResponse(true, 200, []));
    vi.stubGlobal("fetch", fetchMock);

    const result = await updateLeadRecord("user-1", "lead-sb-6", {
      stage: "Contato",
    });

    expect(result).toBeNull();
  });

  it("maps follow-up fields correctly in both directions", async () => {
    const lead: LeadRecord = {
      ...buildLead("lead-sb-7"),
      followUpIntervalDays: 3,
      followUpStep: 2,
      nextFollowUpAt: "2026-04-01T00:00:00.000Z",
      lastContactAt: "2026-03-28T00:00:00.000Z",
    };

    const supabaseRow = buildSupabaseRow(lead);
    const fetchMock = vi.fn().mockResolvedValueOnce(createResponse(true, 201, [supabaseRow]));
    vi.stubGlobal("fetch", fetchMock);

    const result = await createLead("user-1", lead);

    expect(result.followUpIntervalDays).toBe(3);
    expect(result.followUpStep).toBe(2);
    expect(result.nextFollowUpAt).toBe("2026-04-01T00:00:00.000Z");
    expect(result.lastContactAt).toBe("2026-03-28T00:00:00.000Z");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.follow_up_interval_days).toBe(3);
    expect(body.follow_up_step).toBe(2);
    expect(body.next_follow_up_at).toBe("2026-04-01T00:00:00.000Z");
    expect(body.last_contact_at).toBe("2026-03-28T00:00:00.000Z");
  });
});
