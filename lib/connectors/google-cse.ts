import type { ProspectSearchRequest, ProspectSearchResult } from "./types";
import { GoogleCseResponseSchema } from "./types";
import { normalizeApifyItem } from "./normalizers";
import { fetchWithTimeout, isAbortError, parseIntegerEnv } from "./utils";

/**
 * Conector Instagram via Google Custom Search JSON API.
 *
 * Alternativa de custo baixo ao Apify para a fonte Instagram. Faz exatamente o
 * que o Apify fazia (uma busca no Google por perfis públicos do Instagram), mas
 * usando a API oficial do Google — gratuita até 100 buscas/dia.
 *
 * Requer duas variáveis de ambiente:
 *   - GOOGLE_CSE_API_KEY  → chave da API (Google Cloud Console)
 *   - GOOGLE_CSE_ID       → ID do mecanismo de busca (Programmable Search Engine)
 *
 * Os itens retornados pela CSE trazem os campos title/link/snippet, que o
 * normalizeApifyItem (source="Instagram") já sabe interpretar.
 */
export function isGoogleCseEnabled(): boolean {
  if (process.env.GOOGLE_CSE_ENABLED === "false") return false;
  return (
    (process.env.GOOGLE_CSE_API_KEY ?? "").length > 0 &&
    (process.env.GOOGLE_CSE_ID ?? "").length > 0
  );
}

/** Monta a mesma query que o Apify usava: perfis do Instagram, sem posts/reels. */
function buildInstagramQuery(request: ProspectSearchRequest): string {
  const location = request.city ?? request.region;
  return `site:instagram.com "${request.niche}" "${location}" -site:instagram.com/p/ -site:instagram.com/reel/`;
}

export async function searchGoogleCseInstagram(
  request: ProspectSearchRequest
): Promise<{ results: ProspectSearchResult[]; status: string }> {
  if (!isGoogleCseEnabled()) return { results: [], status: "Google CSE desativado" };

  const apiKey = process.env.GOOGLE_CSE_API_KEY!;
  const cx = process.env.GOOGLE_CSE_ID!;
  const timeoutMs = Math.max(1000, parseIntegerEnv("GOOGLE_CSE_REQUEST_TIMEOUT_MS", 15000));
  // A CSE aceita no máximo 10 resultados por requisição (parâmetro `num`).
  const num = Math.min(10, Math.max(1, request.limitPerSource));
  const query = buildInstagramQuery(request);

  const url =
    "https://www.googleapis.com/customsearch/v1" +
    `?key=${encodeURIComponent(apiKey)}` +
    `&cx=${encodeURIComponent(cx)}` +
    `&q=${encodeURIComponent(query)}` +
    `&num=${num}` +
    `&hl=pt-BR&gl=br`;

  try {
    const response = await fetchWithTimeout(url, { cache: "no-store" }, timeoutMs);

    if (!response.ok) {
      // Tenta capturar a mensagem de erro do Google para diagnóstico.
      const body = await response.text().catch(() => "");
      let detail = "";
      try {
        const parsed = JSON.parse(body) as { error?: { message?: string } };
        detail = parsed.error?.message ? ` — ${parsed.error.message}` : "";
      } catch {
        detail = body ? ` — ${body.slice(0, 160)}` : "";
      }
      return { results: [], status: `Google CSE indisponivel (${response.status})${detail}` };
    }

    const rawPayload = (await response.json()) as unknown;
    const parseResult = GoogleCseResponseSchema.safeParse(rawPayload);
    if (!parseResult.success) {
      return { results: [], status: "Google CSE retornou formato invalido" };
    }

    if (parseResult.data.error?.message) {
      return { results: [], status: `Google CSE erro: ${parseResult.data.error.message}` };
    }

    const items = parseResult.data.items ?? [];
    const results = items
      .map((item, index) => normalizeApifyItem(item, "Instagram", request, index))
      .filter((item): item is ProspectSearchResult => item !== null)
      .slice(0, request.limitPerSource);

    return {
      results,
      status:
        results.length > 0
          ? `${results.length} lead(s) via Google CSE`
          : "0 lead(s) via Google CSE (verifique nicho/região)",
    };
  } catch (error) {
    if (isAbortError(error)) {
      return { results: [], status: "Google CSE timeout" };
    }
    return { results: [], status: "Falha ao consultar Google CSE" };
  }
}
