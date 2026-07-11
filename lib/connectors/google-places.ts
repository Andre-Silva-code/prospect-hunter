import type { ProspectSearchRequest, ProspectSearchResult } from "./types";
import { GooglePlacesResponseSchema } from "./types";
import { searchApifyGoogleConnector } from "./apify";
import { isApifyEnabled } from "./apify-config";
import { normalizeGooglePlace } from "./normalizers";

/**
 * Busca leads GMN/Google Maps.
 *
 * Fonte PRIMÁRIA: Google Places API oficial (barata/estável, dentro da cota
 * gratuita para volumes moderados). O Apify é apenas fallback OPCIONAL — só é
 * consultado se estiver habilitado (isApifyEnabled) e a Places API não retornar
 * nada. Isso evita o desperdício de tentar o Apify (que pode dar 402) toda vez.
 */
export async function searchGooglePlaces(
  source: "Google Maps" | "Google Meu Negócio",
  request: ProspectSearchRequest
): Promise<{ results: ProspectSearchResult[]; status: string }> {
  // 1) Fonte primária: Google Places API oficial
  const placesResult = await searchGooglePlacesApi(source, request);
  if (placesResult.results.length > 0) {
    return placesResult;
  }

  // 2) Fallback opcional: Apify (só se habilitado)
  if (isApifyEnabled()) {
    const apifyResult = await searchApifyGoogleConnector(source, request);
    if (apifyResult.results.length > 0) {
      return {
        results: apifyResult.results,
        status: `${placesResult.status} | fallback Apify: ${apifyResult.results.length} lead(s)`,
      };
    }
  }

  // Nenhuma fonte retornou — devolve o status da Places API (mais informativo)
  return placesResult;
}

/**
 * Consulta a Google Places API (searchText). Retorna results vazios com um
 * status descritivo se a chave não estiver configurada ou a API falhar.
 */
async function searchGooglePlacesApi(
  source: "Google Maps" | "Google Meu Negócio",
  request: ProspectSearchRequest
): Promise<{ results: ProspectSearchResult[]; status: string }> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
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

    return {
      results,
      status: `${results.length} lead(s) encontrado(s) via Google Places`,
    };
  } catch {
    return { results: [], status: "Falha ao consultar Google Places" };
  }
}
