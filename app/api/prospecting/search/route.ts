import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth-session";
import { logger } from "@/lib/logger";
import { searchProspects } from "@/lib/prospecting-connectors";
import { checkApifyRateLimit } from "@/lib/rate-limiter";
import type { LeadSource } from "@/types/prospecting";

// Busca pode consultar várias fontes/cidades — dá mais fôlego de execução para
// não ser cortada prematuramente em ambientes com timeout curto.
export const maxDuration = 60;

type SearchPayload = {
  icp?: string;
  niche?: string;
  region?: string;
  city?: string;
  sources?: LeadSource[];
  limitPerSource?: number;
};

export async function POST(request: Request): Promise<
  NextResponse<
    | {
        results: Awaited<ReturnType<typeof searchProspects>>["results"];
        connectorStatus: Awaited<ReturnType<typeof searchProspects>>["connectorStatus"];
      }
    | { error: string }
  >
> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: SearchPayload;
  try {
    payload = (await request.json()) as SearchPayload;
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  if (
    !payload.icp ||
    !payload.niche ||
    !payload.region ||
    !Array.isArray(payload.sources) ||
    payload.sources.length === 0
  ) {
    return NextResponse.json({ error: "Parametros de busca invalidos" }, { status: 400 });
  }

  const rateCheck = await checkApifyRateLimit(sessionUser.id);
  if (!rateCheck.allowed) {
    logger.warn("Rate limit exceeded for prospecting search", {
      userId: sessionUser.id,
      retryAfterMs: rateCheck.retryAfterMs,
    });
    return NextResponse.json(
      {
        error: `Limite de buscas excedido. Tente novamente em ${Math.ceil(rateCheck.retryAfterMs / 1000)}s.`,
      },
      { status: 429 }
    );
  }

  const limitPerSource = Number.isFinite(payload.limitPerSource)
    ? Math.max(1, Math.min(20, Number(payload.limitPerSource)))
    : 5;

  logger.info("Prospecting search started", {
    userId: sessionUser.id,
    sources: payload.sources,
    niche: payload.niche,
    region: payload.region,
  });

  try {
    const response = await searchProspects({
      icp: payload.icp,
      niche: payload.niche,
      region: payload.region,
      city: payload.city || undefined,
      sources: payload.sources,
      limitPerSource,
    });

    logger.info("Prospecting search completed", {
      userId: sessionUser.id,
      resultsCount: response.results.length,
      connectorStatus: response.connectorStatus,
    });

    return NextResponse.json(response);
  } catch (error) {
    // Sem este catch, qualquer exceção vira um 500 mudo ("Verifique os
    // conectores" no front). Aqui registramos a causa real e devolvemos uma
    // mensagem mais útil.
    logger.error("Prospecting search failed", {
      userId: sessionUser.id,
      sources: payload.sources,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Falha ao executar a busca. Tente uma região/cidade mais específica." },
      { status: 500 }
    );
  }
}
