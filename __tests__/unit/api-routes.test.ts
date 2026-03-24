import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as loginPost } from "@/app/api/auth/login/route";
import { PATCH as patchLead } from "@/app/api/leads/[leadId]/route";
import { GET as getLeads, POST as postLeads } from "@/app/api/leads/route";
import { POST as searchPost } from "@/app/api/prospecting/search/route";
import { getSessionUser } from "@/lib/auth-session";
import { createLead, listLeads, updateLeadRecord } from "@/lib/leads-repository";
import { searchProspects } from "@/lib/prospecting-connectors";
import type { LeadRecord } from "@/types/prospecting";

vi.mock("@/lib/auth-session", () => ({
  getSessionUser: vi.fn(),
  createSessionFromPassword: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/leads-repository", () => ({
  createLead: vi.fn(),
  listLeads: vi.fn(),
  updateLeadRecord: vi.fn(),
}));

vi.mock("@/lib/prospecting-connectors", () => ({
  searchProspects: vi.fn(),
}));

function buildLead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: "lead-1",
    userId: "session-user",
    company: "Clinica Alpha",
    niche: "Estetica",
    region: "Sao Paulo",
    monthlyBudget: "R$ 10k",
    contact: "@alpha",
    trigger: "Anuncio ativo",
    stage: "Novo",
    score: 85,
    priority: "Alta",
    message: "Mensagem base",
    contactStatus: "Pendente",
    createdAt: "2026-03-24T00:00:00.000Z",
    ...overrides,
  };
}

describe("API routes auth and authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects leads GET when session is missing", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const response = await getLeads();
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(payload.error).toBe("Unauthorized");
    expect(listLeads).not.toHaveBeenCalled();
  });

  it("uses session user id on leads POST and ignores spoofed header/body user id", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      id: "session-user",
      name: "Operador",
      email: "op@example.com",
    });
    vi.mocked(createLead).mockResolvedValue(buildLead());

    const request = new Request("http://localhost/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "attacker-user",
      },
      body: JSON.stringify(buildLead({ userId: "attacker-user" })),
    });

    const response = await postLeads(request);

    expect(response.status).toBe(201);
    expect(createLead).toHaveBeenCalledWith(
      "session-user",
      expect.objectContaining({ userId: "session-user" })
    );
  });

  it("returns upstream failure when lead creation throws", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      id: "session-user",
      name: "Operador",
      email: "op@example.com",
    });
    vi.mocked(createLead).mockRejectedValue(new Error("insert failed"));

    const request = new Request("http://localhost/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildLead()),
    });

    const response = await postLeads(request);
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(502);
    expect(payload.error).toBe("Failed to create lead");
  });

  it("rejects lead PATCH when session is missing", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const request = new Request("http://localhost/api/leads/lead-1", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ stage: "Contato" }),
    });

    const response = await patchLead(request, { params: Promise.resolve({ leadId: "lead-1" }) });
    expect(response.status).toBe(401);
    expect(updateLeadRecord).not.toHaveBeenCalled();
  });

  it("rejects prospecting search when session is missing", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const request = new Request("http://localhost/api/prospecting/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        icp: "Clinicas",
        niche: "Estetica",
        region: "Sao Paulo",
        sources: ["Instagram"],
      }),
    });

    const response = await searchPost(request);
    expect(response.status).toBe(401);
    expect(searchProspects).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid JSON payload on prospecting search", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      id: "session-user",
      name: "Operador",
      email: "op@example.com",
    });

    const request = new Request("http://localhost/api/prospecting/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: "{ invalid json",
    });

    const response = await searchPost(request);
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Payload inválido");
    expect(searchProspects).not.toHaveBeenCalled();
  });
});

describe("login route validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid JSON payload", async () => {
    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: "{ invalid json",
    });

    const response = await loginPost(request);
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Payload inválido");
  });
});
