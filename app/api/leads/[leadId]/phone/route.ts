import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth-session";
import { logger } from "@/lib/logger";
import { listLeads, updateLeadRecord } from "@/lib/leads-repository";
import { initiateGmnOutreach, initiateInstagramOutreach } from "@/lib/outreach-orchestrator";
import { normalizePhoneForWhatsApp } from "@/lib/connectors/utils";

type PhonePayload = {
  phone?: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ leadId: string }> }
): Promise<
  NextResponse<
    | { lead: Awaited<ReturnType<typeof updateLeadRecord>>; queued: boolean; reason: string }
    | { error: string }
  >
> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leadId } = await context.params;

  let payload: PhonePayload;
  try {
    payload = (await request.json()) as PhonePayload;
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const normalized = normalizePhoneForWhatsApp(payload.phone ?? "");
  if (!normalized) {
    return NextResponse.json({ error: "Telefone inválido" }, { status: 400 });
  }

  const leads = await listLeads(sessionUser.id);
  const lead = leads.find((l) => l.id === leadId);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Adiciona o telefone ao campo contact preservando o que já havia
  const existingContact = lead.contact ?? "";
  const alreadyHasPhone = normalizePhoneForWhatsApp(existingContact) !== null;
  const newContact = alreadyHasPhone
    ? existingContact
    : existingContact
      ? `${existingContact} | ${normalized}`
      : normalized;

  const updatedLead = await updateLeadRecord(sessionUser.id, leadId, { contact: newContact });
  if (!updatedLead) {
    return NextResponse.json({ error: "Falha ao atualizar lead" }, { status: 500 });
  }

  // Dispara outreach automático com o lead atualizado
  const leadWithPhone = { ...updatedLead, contact: newContact };
  const outreachResult =
    lead.source === "Instagram"
      ? await initiateInstagramOutreach(sessionUser.id, leadWithPhone)
      : await initiateGmnOutreach(sessionUser.id, leadWithPhone);

  logger.info("Phone added and outreach initiated", {
    userId: sessionUser.id,
    leadId,
    queued: outreachResult.queued,
    reason: outreachResult.reason,
  });

  return NextResponse.json({
    lead: updatedLead,
    queued: outreachResult.queued,
    reason: outreachResult.reason,
  });
}
