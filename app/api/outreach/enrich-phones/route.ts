import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth-session";
import { listLeads, updateLeadRecord } from "@/lib/leads-repository";
import { getQueueItemsByStatus, updateQueueItem } from "@/lib/outreach-queue";
import { verifyAndSchedule } from "@/lib/outreach-orchestrator";
import { extractPhoneFromContact } from "@/lib/connectors/utils";
import { enrichLeadPhone } from "@/lib/connectors/phone-enrichment";
import { logger } from "@/lib/logger";

type EnrichResult = {
  leadId: string;
  company: string;
  action: "requeued" | "not_found" | "skipped";
  phone?: string;
  foundVia?: string;
};

export async function POST(request: Request): Promise<NextResponse> {
  const cronSecret = process.env.OUTREACH_CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  const sessionUser = await getSessionUser();

  if (!isCron && !sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = sessionUser?.id ?? "local-dev-user";

  try {
    const invalidItems = await getQueueItemsByStatus(userId, "phone_invalid");

    if (invalidItems.length === 0) {
      return NextResponse.json({ message: "Nenhum item phone_invalid encontrado", results: [] });
    }

    const leads = await listLeads(userId);
    const leadMap = new Map(leads.map((l) => [l.id, l]));

    const results: EnrichResult[] = [];

    for (const item of invalidItems) {
      const lead = leadMap.get(item.leadId);
      if (!lead) continue;

      // Telefone atual do lead (tipicamente o fixo do Google) para a Camada 1
      const currentPhone = extractPhoneFromContact(lead.contact);

      logger.info("Enriquecendo WhatsApp (3 camadas)", {
        leadId: lead.id,
        company: lead.company,
      });

      const enrichment = await enrichLeadPhone(lead, currentPhone);

      if (!enrichment.phone) {
        // Nenhuma das 3 camadas achou — marca motivo para o Kanban e segue.
        await updateQueueItem(item.id, {
          lastError: "WhatsApp não encontrado (3 camadas) — adicione manualmente",
        });
        results.push({ leadId: lead.id, company: lead.company, action: "not_found" });
        continue;
      }

      // Achou um número VÁLIDO no WhatsApp. Atualiza o lead e reenfileira já verificado.
      const newContact = lead.contact ? `${lead.contact} | ${enrichment.phone}` : enrichment.phone;

      await updateLeadRecord(userId, lead.id, { contact: newContact });

      await updateQueueItem(item.id, {
        phone: enrichment.phone,
        whatsappJid: enrichment.jid,
        status: "phone_verified",
        scheduledAt: null,
        lastError: null,
        attemptCount: 0,
      });

      // Como o número já foi validado no WhatsApp durante o enriquecimento,
      // verifyAndSchedule vai apenas confirmar e agendar o envio.
      verifyAndSchedule({
        ...item,
        phone: enrichment.phone,
        whatsappJid: enrichment.jid,
        status: "phone_verified",
      }).catch(() => {});

      logger.info("WhatsApp encontrado e lead reenfileirado", {
        leadId: lead.id,
        company: lead.company,
        phone: enrichment.phone,
        foundVia: enrichment.source,
      });

      results.push({
        leadId: lead.id,
        company: lead.company,
        action: "requeued",
        phone: enrichment.phone,
        foundVia: enrichment.source ?? undefined,
      });

      // Pausa entre leads para não sobrecarregar as APIs externas
      await new Promise((r) => setTimeout(r, 1500));
    }

    const requeued = results.filter((r) => r.action === "requeued").length;
    const notFound = results.filter((r) => r.action === "not_found").length;

    return NextResponse.json({ total: invalidItems.length, requeued, notFound, results });
  } catch (error) {
    logger.error("enrich-phones error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
