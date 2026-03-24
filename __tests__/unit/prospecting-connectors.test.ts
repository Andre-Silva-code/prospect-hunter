import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { searchProspects } from "@/lib/prospecting-connectors";

type MockResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

function createResponse(ok: boolean, status: number, payload: unknown): Response {
  const response: MockResponse = {
    ok,
    status,
    json: async () => payload,
  };
  return response as unknown as Response;
}

describe("prospecting connectors (Apify)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.APIFY_TOKEN = "token-test";
    process.env.APIFY_API_BASE_URL = "https://api.apify.com";
    process.env.APIFY_BACKOFF_MS = "1,1,1";
    process.env.APIFY_MAX_RETRIES = "3";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("uses Apify task for Instagram source and normalizes results", async () => {
    process.env.PROSPECT_APIFY_INSTAGRAM_TASK_ID = "task-instagram";

    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(
      createResponse(true, 200, {
        data: {
          status: "SUCCEEDED",
          defaultDatasetId: "dataset-1",
        },
      })
    );
    fetchMock.mockResolvedValueOnce(
      createResponse(true, 200, [
        {
          name: "Clinica Prisma",
          category: "Estetica premium",
          city: "Sao Paulo",
          followers: 4200,
          bio: "Anuncios ativos e oferta high ticket.",
          profileUrl: "https://instagram.com/clinicaprisma",
        },
      ])
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await searchProspects({
      icp: "Clinicas esteticas premium",
      niche: "Estetica premium",
      region: "Sao Paulo",
      sources: ["Instagram"],
      limitPerSource: 5,
    });

    expect(response.results).toHaveLength(1);
    expect(response.results[0]).toMatchObject({
      company: "Clinica Prisma",
      source: "Instagram",
    });
    expect(response.connectorStatus["Instagram"]).toContain("via Apify task");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/actor-tasks/task-instagram/runs");
  });

  it("retries on 429 and succeeds on a subsequent attempt", async () => {
    process.env.PROSPECT_APIFY_LINKEDIN_TASK_ID = "task-linkedin";

    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(createResponse(false, 429, { error: "rate limit" }));
    fetchMock.mockResolvedValueOnce(
      createResponse(true, 200, {
        data: {
          status: "SUCCEEDED",
          defaultDatasetId: "dataset-2",
        },
      })
    );
    fetchMock.mockResolvedValueOnce(
      createResponse(true, 200, [
        {
          companyName: "Nexa Partners",
          category: "Consultoria",
          locationName: "Campinas",
          followersCount: 800,
          headline: "Escala comercial para B2B",
          linkedinUrl: "https://linkedin.com/company/nexa-partners",
        },
      ])
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await searchProspects({
      icp: "Consultorias B2B",
      niche: "Consultoria B2B",
      region: "Campinas",
      sources: ["LinkedIn"],
      limitPerSource: 5,
    });

    expect(response.results).toHaveLength(1);
    expect(response.connectorStatus["LinkedIn"]).toContain("via Apify task");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry on 400 (non-retryable Apify request failure)", async () => {
    process.env.PROSPECT_APIFY_GOOGLE_MAPS_TASK_ID = "task-gmaps";

    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(createResponse(false, 400, { error: "bad request" }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await searchProspects({
      icp: "Negocios locais",
      niche: "Clinica",
      region: "Sao Paulo",
      sources: ["Google Maps"],
      limitPerSource: 3,
    });

    expect(response.results).toHaveLength(0);
    expect(response.connectorStatus["Google Maps"]).toBe("Apify indisponivel (400)");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
