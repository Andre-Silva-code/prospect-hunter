import type { GmnDetectionResult } from "./types";
import { GooglePlacesResponseSchema } from "./types";
import { fetchWithTimeout, isAbortError, parseIntegerEnv } from "./utils";

/**
 * Detector de presença no Google Meu Negócio (GMN).
 *
 * Dado o nome de um negócio (achado no Instagram/Facebook/Google), consulta a
 * Google Places API e decide se o negócio JÁ TEM ficha no GMN.
 *
 * ⚠️ Cuidado com falso positivo: a Places API é "generosa" e devolve o place
 * mais próximo mesmo para nomes inexistentes (ex.: buscar um nome fake retornou
 * "Symetria"). Por isso NÃO basta "achou algo" — exigimos que o nome da ficha
 * seja de fato parecido com o nome buscado (similaridade acima de um limiar).
 *
 * Se a similaridade for alta  → "has"     (tem GMN, descarta como lead)
 * Se não houver resultado     → "absent"  (sem GMN → lead quente)
 * Se houver resultado fraco    → "unknown" (não arrisca; fica indefinido)
 */

/** Termos genéricos de segmento que não ajudam a distinguir um negócio de outro. */
const GENERIC_TERMS = new Set([
  "clinica",
  "estetica",
  "salao",
  "studio",
  "space",
  "espaco",
  "centro",
  "instituto",
  "consultorio",
  "dra",
  "dr",
  "de",
  "da",
  "do",
  "e",
  "beleza",
  "avancada",
  "spa",
  "ltda",
  "me",
  "eireli",
]);

/** Normaliza um nome: minúsculas, sem acentos, sem pontuação. */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .replace(/[^a-z0-9\s]/g, " ") // pontuação → espaço
    .replace(/\s+/g, " ")
    .trim();
}

/** Tokens "fortes" de um nome: sem termos genéricos e com 2+ caracteres. */
export function significantTokens(name: string): string[] {
  return normalizeName(name)
    .split(" ")
    .filter((t) => t.length >= 2 && !GENERIC_TERMS.has(t));
}

/**
 * Similaridade entre dois nomes de negócio, 0–1.
 *
 * Baseada na sobreposição de tokens significativos (índice de Jaccard). Ignora
 * termos genéricos de segmento para não inflar a similaridade (ex.: "clínica de
 * estética" não deve casar com qualquer outra "clínica de estética").
 */
export function nameSimilarity(a: string, b: string): number {
  const tokensA = new Set(significantTokens(a));
  const tokensB = new Set(significantTokens(b));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection += 1;
  }
  const union = tokensA.size + tokensB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Decide a presença de GMN a partir do nome buscado e dos nomes de places
 * retornados pela API. Lógica pura (sem rede) — fácil de testar.
 *
 * @param threshold similaridade mínima para considerar "has" (default 0.5)
 */
/**
 * Similaridade abaixo da qual consideramos que o Google NÃO tem o negócio: ele
 * só devolveu places totalmente diferentes (o "falso positivo" da Places API),
 * o que é um forte indício de que o negócio buscado não está catalogado.
 */
const ABSENT_MAX_SIMILARITY = 0.15;

export function decideGmnPresence(
  queryName: string,
  placeNames: string[],
  threshold = 0.5,
  absentBelow = ABSENT_MAX_SIMILARITY
): { presence: GmnDetectionResult["presence"]; bestIndex: number; similarity: number } {
  if (placeNames.length === 0) {
    return { presence: "absent", bestIndex: -1, similarity: 0 };
  }

  let bestIndex = -1;
  let bestSim = 0;
  placeNames.forEach((name, index) => {
    const sim = nameSimilarity(queryName, name);
    if (sim > bestSim) {
      bestSim = sim;
      bestIndex = index;
    }
  });

  // Zona alta: nome bate bem → tem GMN.
  if (bestSim >= threshold) {
    return { presence: "has", bestIndex, similarity: bestSim };
  }

  // Zona muito baixa: o Google só trouxe negócios não relacionados → tratamos
  // como ausência de ficha para o negócio buscado (candidato a lead sem-GMN).
  if (bestSim <= absentBelow) {
    return { presence: "absent", bestIndex, similarity: bestSim };
  }

  // Zona intermediária: parecido, mas não o bastante para afirmar. Fica
  // "unknown" e o chamador descarta por segurança (não arrisca falso positivo).
  return { presence: "unknown", bestIndex, similarity: bestSim };
}

/**
 * Consulta a Google Places API e detecta se o negócio tem GMN.
 * Retorna presence="unknown" se a chave não estiver configurada ou a API falhar
 * (nunca "absent" por erro — para não gerar lead falso).
 */
export async function detectGmnPresence(
  businessName: string,
  region: string
): Promise<GmnDetectionResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return { presence: "unknown" };

  const threshold = (() => {
    const raw = process.env.GMN_MATCH_THRESHOLD;
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 && parsed <= 1 ? parsed : 0.5;
  })();
  const timeoutMs = Math.max(1000, parseIntegerEnv("GMN_DETECT_TIMEOUT_MS", 15000));
  const textQuery = `${businessName} ${region}`.trim();

  try {
    const response = await fetchWithTimeout(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.displayName,places.googleMapsUri,places.formattedAddress",
        },
        body: JSON.stringify({
          textQuery,
          languageCode: "pt-BR",
          regionCode: "BR",
          pageSize: 5,
        }),
        cache: "no-store",
      },
      timeoutMs
    );

    if (!response.ok) {
      return { presence: "unknown" };
    }

    const rawPayload = (await response.json()) as unknown;
    const parsed = GooglePlacesResponseSchema.safeParse(rawPayload);
    if (!parsed.success) return { presence: "unknown" };

    const places = parsed.data.places ?? [];
    const names = places.map((p) => p.displayName?.text ?? "");
    const decision = decideGmnPresence(businessName, names, threshold);

    if (decision.presence === "has" && decision.bestIndex >= 0) {
      return {
        presence: "has",
        matchedName: names[decision.bestIndex],
        similarity: decision.similarity,
        mapsUri: places[decision.bestIndex]?.googleMapsUri,
      };
    }

    return { presence: decision.presence, similarity: decision.similarity };
  } catch (error) {
    if (isAbortError(error)) return { presence: "unknown" };
    return { presence: "unknown" };
  }
}
