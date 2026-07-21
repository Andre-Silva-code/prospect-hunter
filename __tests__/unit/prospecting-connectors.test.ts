import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { searchProspects } from "@/lib/prospecting-connectors";

type MockResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
};

function createResponse(ok: boolean, status: number, payload: unknown): Response {
  const response: MockResponse = {
    ok,
    status,
    json: async () => payload,
    text: async () => (typeof payload === "string" ? payload : JSON.stringify(payload)),
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
    process.env.PROSPECTING_ENABLE_DEMO_FALLBACK = "false";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("uses Apify actor for Instagram source and normalizes results", async () => {
    // Instagram sempre usa o actor apify~google-search-scraper (ignora task ID)
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(
      createResponse(true, 200, {
        data: {
          status: "SUCCEEDED",
          defaultDatasetId: "dataset-1",
        },
      })
    );
    // google-search-scraper retorna organicResults[] dentro de cada item
    fetchMock.mockResolvedValueOnce(
      createResponse(true, 200, [
        {
          organicResults: [
            {
              title: "Clinica Prisma | Estetica premium",
              url: "https://instagram.com/clinicaprisma",
              description: "Anuncios ativos e oferta high ticket.",
            },
          ],
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
      source: "Instagram",
    });
    expect(response.connectorStatus["Instagram"]).toContain("via Apify actor");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "/acts/apify~google-search-scraper/runs"
    );
  });

  it("retries on 429 and succeeds on a subsequent attempt", async () => {
    // LinkedIn usa PROSPECT_APIFY_LINKEDIN_TASK_ID
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

  it("reporta chave ausente sem chamar fetch quando GOOGLE_MAPS_API_KEY nao esta configurada", async () => {
    // Modelo atual (commit bcc61a8): Google Places é a fonte primária de GMN.
    // Sem a chave, nem chega a chamar a API — retorna status informativo direto.
    delete process.env.GOOGLE_MAPS_API_KEY;

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await searchProspects({
      icp: "Negocios locais",
      niche: "Clinica",
      region: "Sao Paulo",
      sources: ["Google Maps"],
      limitPerSource: 3,
    });

    expect(response.results).toHaveLength(0);
    expect(response.connectorStatus["Google Maps"]).toBe("GOOGLE_MAPS_API_KEY nao configurada");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("busca via Google Places como fonte primária de Google Maps", async () => {
    // Modelo atual (commit bcc61a8): Places é chamada diretamente, sem passar por Apify.
    process.env.GOOGLE_MAPS_API_KEY = "google-api-key";

    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(
      createResponse(true, 200, {
        places: [
          {
            displayName: { text: "Clinica Aurora" },
            googleMapsUri: "https://maps.google.com/?cid=123",
            formattedAddress: "Sao Paulo, SP",
            rating: 4.8,
            userRatingCount: 256,
            websiteUri: "https://clinicaaurora.com.br",
            nationalPhoneNumber: "+55 11 99999-0000",
          },
        ],
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await searchProspects({
      icp: "Clinicas esteticas premium",
      niche: "Estetica premium",
      region: "Sao Paulo",
      sources: ["Google Maps"],
      limitPerSource: 5,
    });

    expect(response.results).toHaveLength(1);
    expect(response.results[0]).toMatchObject({
      company: "Clinica Aurora",
      source: "Google Maps",
    });
    expect(response.connectorStatus["Google Maps"]).toContain("via Google Places");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "https://places.googleapis.com/v1/places:searchText"
    );
  });

  it("propaga erro da Google Places API quando a chamada falha", async () => {
    // Modelo atual (commit bcc61a8): sem fallback Apify por padrão, o erro da
    // Places API é reportado diretamente no status, sem resultados.
    process.env.GOOGLE_MAPS_API_KEY = "google-api-key";

    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(createResponse(false, 401, { error: "unauthorized" }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await searchProspects({
      icp: "Clinicas estéticas",
      niche: "Estetica",
      region: "Campinas",
      sources: ["Google Maps"],
      limitPerSource: 5,
    });

    expect(response.results).toHaveLength(0);
    expect(response.connectorStatus["Google Maps"]).toContain("Google Places indisponivel (401)");
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "https://places.googleapis.com/v1/places:searchText"
    );
  });

  it("uses local demo fallback when all connectors return no results in non-production", async () => {
    process.env.PROSPECTING_ENABLE_DEMO_FALLBACK = "true";
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
    fetchMock.mockResolvedValueOnce(createResponse(true, 200, []));
    vi.stubGlobal("fetch", fetchMock);

    const response = await searchProspects({
      icp: "Clinicas esteticas premium",
      niche: "Estetica premium",
      region: "Sao Paulo",
      sources: ["Instagram"],
      limitPerSource: 4,
    });

    expect(response.results.length).toBeGreaterThan(0);
    expect(response.results[0]?.company).toContain("(demo)");
    expect(response.connectorStatus["Instagram"]).toContain("fallback local");
  });
});
