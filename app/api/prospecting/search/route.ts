import { NextResponse } from "next/server";

import { searchProspects } from "@/lib/prospecting-connectors";
import type { LeadSource } from "@/types/prospecting";

type SearchPayload = {
  icp?: string;
  niche?: string;
  region?: string;
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
  const payload = (await request.json()) as SearchPayload;

  if (
    !payload.icp ||
    !payload.niche ||
    !payload.region ||
    !Array.isArray(payload.sources) ||
    payload.sources.length === 0
  ) {
    return NextResponse.json({ error: "Parametros de busca invalidos" }, { status: 400 });
  }

  const limitPerSource = Number.isFinite(payload.limitPerSource)
    ? Math.max(1, Math.min(20, Number(payload.limitPerSource)))
    : 5;

  const response = await searchProspects({
    icp: payload.icp,
    niche: payload.niche,
    region: payload.region,
    sources: payload.sources,
    limitPerSource,
  });

  return NextResponse.json(response);
}
