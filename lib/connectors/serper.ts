import type { ProspectSearchRequest, ProspectSearchResult } from "./types";
import { SerperResponseSchema } from "./types";
import type { SerperOrganicItem } from "./types";
import { normalizeApifyItem } from "./normalizers";
import { fetchWithTimeout, isAbortError, parseIntegerEnv } from "./utils";

/**
 * Conector Instagram via Serper.dev.
 *
 * Alternativa de custo baixo ao Apify para a fonte Instagram. Faz a mesma busca
 * no Google por perfis públicos do Instagram, mas via Serper.dev — que não exige
 * projeto no Google Cloud nem billing. 2.500 buscas grátis para começar.
 *
 * Requer uma variável de ambiente:
 *   - SERPER_API_KEY → chave da API (dashboard do serper.dev)
 *
 * Os itens retornados (organic[]) trazem title/link/snippet, que o
 * normalizeApifyItem (source="Instagram") já sabe interpretar.
 */
export function isSerperEnabled(): boolean {
  if (process.env.SERPER_ENABLED === "false") return false;
  return (process.env.SERPER_API_KEY ?? "").length > 0;
}

/** Monta a mesma query que o Apify usava: perfis do Instagram, sem posts/reels. */
function buildInstagramQuery(request: ProspectSearchRequest): string {
  const location = request.city ?? request.region;
  return `site:instagram.com "${request.niche}" "${location}" -site:instagram.com/p/ -site:instagram.com/reel/`;
}

/** Busca páginas de negócios no Facebook. */
function buildFacebookQuery(request: ProspectSearchRequest): string {
  const location = request.city ?? request.region;
  return `site:facebook.com "${request.niche}" "${location}" -site:facebook.com/photo -site:facebook.com/events`;
}

/** Busca geral no Google (sites, listas, diretórios do nicho). */
function buildGeneralQuery(request: ProspectSearchRequest): string {
  const location = request.city ?? request.region;
  return `${request.niche} ${location}`;
}

/**
 * Chamada de baixo nível ao Serper: executa uma query e devolve os itens
 * orgânicos brutos (title/link/snippet). Reaproveitada por todas as buscas.
 */
async function runSerperQuery(
  query: string,
  limit: number
): Promise<{ items: SerperOrganicItem[]; status: string }> {
  if (!isSerperEnabled()) return { items: [], status: "Serper desativado" };

  const apiKey = process.env.SERPER_API_KEY!;
  const timeoutMs = Math.max(1000, parseIntegerEnv("SERPER_REQUEST_TIMEOUT_MS", 15000));
  const num = Math.min(10, Math.max(1, limit));

  try {
    const response = await fetchWithTimeout(
      "https://google.serper.dev/search",
      {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: query, num, gl: "br", hl: "pt-br" }),
        cache: "no-store",
      },
      timeoutMs
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const detail = body ? ` — ${body.slice(0, 160)}` : "";
      return { items: [], status: `Serper indisponivel (${response.status})${detail}` };
    }

    const rawPayload = (await response.json()) as unknown;
    const parseResult = SerperResponseSchema.safeParse(rawPayload);
    if (!parseResult.success) {
      return { items: [], status: "Serper retornou formato invalido" };
    }
    if (parseResult.data.message) {
      return { items: [], status: `Serper erro: ${parseResult.data.message}` };
    }

    return { items: parseResult.data.organic ?? [], status: "ok" };
  } catch (error) {
    if (isAbortError(error)) return { items: [], status: "Serper timeout" };
    return { items: [], status: "Falha ao consultar Serper" };
  }
}

/**
 * Busca genérica no Serper que retorna candidatos brutos (title/link/snippet),
 * sem normalizar para lead. Usada pela fonte "Sem Google Meu Negócio", que
 * precisa dos nomes crus para depois verificar a presença no GMN.
 */
export async function searchSerperRaw(
  variant: "instagram" | "facebook" | "general",
  request: ProspectSearchRequest
): Promise<{ items: SerperOrganicItem[]; status: string }> {
  const query =
    variant === "instagram"
      ? buildInstagramQuery(request)
      : variant === "facebook"
        ? buildFacebookQuery(request)
        : buildGeneralQuery(request);
  return runSerperQuery(query, request.limitPerSource);
}

export async function searchSerperInstagram(
  request: ProspectSearchRequest
): Promise<{ results: ProspectSearchResult[]; status: string }> {
  const { items, status } = await runSerperQuery(
    buildInstagramQuery(request),
    request.limitPerSource
  );
  if (status !== "ok") return { results: [], status };

  const results = items
    .map((item, index) => normalizeApifyItem(item, "Instagram", request, index))
    .filter((item): item is ProspectSearchResult => item !== null)
    .slice(0, request.limitPerSource);

  return {
    results,
    status:
      results.length > 0
        ? `${results.length} lead(s) via Serper`
        : "0 lead(s) via Serper (verifique nicho/região)",
  };
}
