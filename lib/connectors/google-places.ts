import type { ProspectSearchRequest, ProspectSearchResult } from "./types";
import { GooglePlacesResponseSchema } from "./types";
import { searchApifyGoogleConnector } from "./apify";
import { normalizeGooglePlace } from "./normalizers";

export async function searchGooglePlaces(
  source: "Google Maps" | "Google Meu Negócio",
  request: ProspectSearchRequest
): Promise<{ results: ProspectSearchResult[]; status: string }> {
  const apifyResult = await searchApifyGoogleConnector(source, request);
  if (apifyResult.status !== "Sem conector configurado" && apifyResult.results.length > 0) {
    return apifyResult;
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    if (apifyResult.status !== "Sem conector configurado") {
      return {
        results: apifyResult.results,
        status: `${apifyResult.status} | fallback Google Places indisponivel (GOOGLE_MAPS_API_KEY nao configurada)`,
      };
    }
    return { results: [], status: "GOOGLE_MAPS_API_KEY nao configurada" };
  }

  const textQuery = `${request.niche} em ${request.region}, Brasil`;

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.displayName,places.googleMapsUri,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.nationalPhoneNumber",
      },
      body: JSON.stringify({
        textQuery,
        languageCode: "pt-BR",
        regionCode: "BR",
        locationRestriction: {
          rectangle: {
            low: { latitude: -33.75, longitude: -73.99 },
            high: { latitude: 5.27, longitude: -34.79 },
          },
        },
        maxResultCount: request.limitPerSource,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return { results: [], status: `Google Places indisponivel (${response.status})` };
    }

    const rawPayload = (await response.json()) as unknown;
    const parseResult = GooglePlacesResponseSchema.safeParse(rawPayload);
    if (!parseResult.success) {
      return { results: [], status: "Google Places retornou formato invalido" };
    }

    const places = parseResult.data.places ?? [];
    const results = places
      .map((place, index) => normalizeGooglePlace(place, source, request, index))
      .filter((item): item is ProspectSearchResult => item !== null);

    const fallbackPrefix =
      apifyResult.status !== "Sem conector configurado"
        ? `${apifyResult.status} | fallback Google Places: `
        : "";

    return {
      results,
      status: `${fallbackPrefix}${results.length} lead(s) encontrado(s)`,
    };
  } catch {
    return { results: [], status: "Falha ao consultar Google Places" };
  }
}
