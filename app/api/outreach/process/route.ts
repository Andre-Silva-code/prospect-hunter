import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth-session";
import { getDueOutreachItems, getStuckSendingItems, updateQueueItem } from "@/lib/outreach-queue";
import { listLeads } from "@/lib/leads-repository";
import { processScheduledOutreach } from "@/lib/outreach-orchestrator";
import { logger } from "@/lib/logger";
import type { LeadRecord } from "@/types/prospecting";
import type { OutreachStatus } from "@/types/outreach";

export async function POST(request: Request): Promise<NextResponse> {
  // Aceita autenticação por cron secret OU sessão do usuário
  const cronSecret = process.env.OUTREACH_CRON_SECRET;
  const auth = request.headers.get("authorization");
  const hasCronAuth = cronSecret && auth === `Bearer ${cronSecret}`;

  if (!hasCronAuth) {
    // Só tenta ler cookies se não veio via cron secret (evita erro em contexto sem cookies)
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Resgate de itens travados: "sending" é um status transitório (dura segundos).
    // Se o servidor reiniciar/der timeout no meio do envio, o item fica órfão em
    // "sending" para sempre. Aqui devolvemos para "scheduled" (com scheduledAt
    // imediato) os que estão presos há mais de 10 min. Como esses itens já têm o
    // whatsapp_jid verificado, voltam direto para o pool de envio (getDueOutreachItems
    // busca status=scheduled) e são reprocessados já no ciclo abaixo.
    const STUCK_THRESHOLD_MIN = 10;
    const stuck = await getStuckSendingItems(STUCK_THRESHOLD_MIN);
    if (stuck.length > 0) {
      const nowIso = new Date().toISOString();
      for (const item of stuck) {
        await updateQueueItem(item.id, {
          status: "scheduled" as OutreachStatus,
          scheduledAt: nowIso,
        });
      }
      logger.warn("Itens presos em 'sending' resgatados para 'scheduled'", {
        count: stuck.length,
        thresholdMin: STUCK_THRESHOLD_MIN,
      });
    }

    const dueItems = await getDueOutreachItems();
    if (dueItems.length === 0) {
      return NextResponse.json({
        processed: 0,
        failed: 0,
        rescued: stuck.length,
        message: "Nada agendado",
      });
    }

    const userIds = [...new Set(dueItems.map((i) => i.userId))];
    const allLeads: LeadRecord[] = [];
    for (const userId of userIds) {
      const leads = await listLeads(userId);
      allLeads.push(...leads);
    }

    const leadMap = new Map(allLeads.map((l) => [l.id, l]));

    let processed = 0;
    let failed = 0;

    for (const item of dueItems) {
      const lead = leadMap.get(item.leadId);
      if (!lead) {
        logger.warn("Lead nao encontrado para outreach", { leadId: item.leadId });
        failed += 1;
        continue;
      }

      // Marca como "sending" antes de processar para evitar processamento duplo
      // em caso de crons simultâneos
      const locked = await updateQueueItem(item.id, {
        status: "sending" as OutreachStatus,
        scheduledAt: item.scheduledAt,
      });
      if (!locked) {
        logger.warn("Item ja sendo processado, pulando", { itemId: item.id });
        continue;
      }

      const result = await processScheduledOutreach(item, lead);
      if (result.success) {
        processed += 1;
      } else {
        failed += 1;
        logger.warn("Outreach falhou", { leadId: item.leadId, error: result.error });
      }
    }

    return NextResponse.json({ processed, failed, total: dueItems.length });
  } catch (error) {
    logger.error("Outreach process error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
