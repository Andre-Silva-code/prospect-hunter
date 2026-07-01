import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth-session";
import { createLead, listLeads } from "@/lib/leads-repository";
import { initiateGmnOutreach, initiateInstagramOutreach } from "@/lib/outreach-orchestrator";
import { logger } from "@/lib/logger";
import type { LeadRecord } from "@/types/prospecting";

export async function GET(): Promise<NextResponse<LeadRecord[] | { error: string }>> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leads = await listLeads(sessionUser.id);
  return NextResponse.json(leads);
}

export async function POST(
  request: Request
): Promise<NextResponse<LeadRecord | { error: string }>> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let lead: LeadRecord;
  try {
    lead = (await request.json()) as LeadRecord;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  try {
    // Verificar duplicata: mesmo nome de empresa + mesma fonte
    const existingLeads = await listLeads(sessionUser.id);
    const normalizedCompany = lead.company.trim().toLowerCase();
    const isDuplicate = existingLeads.some(
      (l) =>
        l.company.trim().toLowerCase() === normalizedCompany &&
        (l.source ?? "") === (lead.source ?? "")
    );

    if (isDuplicate) {
      return NextResponse.json(
        { error: `Lead "${lead.company}" já existe no CRM (mesma empresa e fonte).` },
        { status: 409 }
      );
    }

    const createdLead = await createLead(sessionUser.id, { ...lead, userId: sessionUser.id });

    // Fire-and-forget: dispara outreach automático por fonte
    if (createdLead.source === "Google Meu Negócio") {
      initiateGmnOutreach(sessionUser.id, createdLead).catch((err) => {
        logger.error("GMN outreach initiation failed", {
          leadId: createdLead.id,
          error: err instanceof Error ? err.message : "unknown",
        });
      });
    } else if (createdLead.source === "Instagram") {
      initiateInstagramOutreach(sessionUser.id, createdLead).catch((err) => {
        logger.error("Instagram outreach initiation failed", {
          leadId: createdLead.id,
          error: err instanceof Error ? err.message : "unknown",
        });
      });
    }

    return NextResponse.json(createdLead, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    logger.error("Lead creation failed", {
      userId: sessionUser.id,
      company: lead.company,
      source: lead.source,
      error: message,
    });
    return NextResponse.json({ error: `Erro ao salvar lead: ${message}` }, { status: 500 });
  }
}
