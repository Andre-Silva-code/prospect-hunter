import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth-session";
import { listLeads } from "@/lib/leads-repository";
import { getQueueItemsByStatus, updateQueueItem } from "@/lib/outreach-queue";
import { verifyAndSchedule } from "@/lib/outreach-orchestrator";
import { normalizePhoneForWhatsApp } from "@/lib/connectors/utils";
import { logger } from "@/lib/logger";

/**
 * Extrai todos os números de telefone do campo contact de um lead.
 * O campo pode conter urls, @handles, telefones fixos e celulares separados por | , / ;
 * Retorna apenas os que normalizam como celular válido para WhatsApp (11 dígitos locais,
 * terceiro dígito = 9) ou que passam pela normalização padrão de celular.
 */
function extractCellPhonesFromContact(contact: string): string[] {
  const parts = contact.split(/[|,/;]/).map((p) => p.trim());
  const found: string[] = [];

  for (const part of parts) {
    // Pular URLs
    if (/^https?:\/\//i.test(part)) continue;
    // Pular @handles do Instagram
    if (part.startsWith("@")) continue;
    // Pular textos claramente não numéricos
    if (/sem contato|s\/n|n\/a/i.test(part)) continue;

    const normalized = normalizePhoneForWhatsApp(part);
    if (!normalized) continue;

    // Validar se é celular brasileiro (DDD + 9 dígitos começando com 9)
    // Remove prefixo 55 se houver
    const local = normalized.startsWith("55") ? normalized.slice(2) : normalized;
    const isCell = local.length === 11 && local[2] === "9";
    if (isCell) {
      found.push(normalized);
    }
  }

  return [...new Set(found)]; // deduplicar
}

type RetryResult = {
  leadId: string;
  company: string;
  phone: string;
  action: "requeued" | "no_cell_found" | "already_has_cell";
};

export async function POST(request: Request): Promise<NextResponse> {
  // Aceita autenticação via sessão de usuário OU via cron secret
  const cronSecret = process.env.OUTREACH_CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  const sessionUser = await getSessionUser();

  if (!isCron && !sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // userId vem da sessão; em modo cron sem sessão usa "local-dev-user" como fallback
    const userId = sessionUser?.id ?? "local-dev-user";
    const invalidItems = await getQueueItemsByStatus(userId, "phone_invalid");

    if (invalidItems.length === 0) {
      return NextResponse.json({ message: "Nenhum item phone_invalid encontrado", results: [] });
    }

    // Busca os leads correspondentes
    const leads = await listLeads(userId);
    const leadMap = new Map(leads.map((l) => [l.id, l]));

    const results: RetryResult[] = [];

    for (const item of invalidItems) {
      const lead = leadMap.get(item.leadId);
      if (!lead) continue;

      // Tenta extrair celular do campo contact
      const cells = extractCellPhonesFromContact(lead.contact);

      if (cells.length === 0) {
        results.push({
          leadId: lead.id,
          company: lead.company,
          phone: item.phone,
          action: "no_cell_found",
        });
        continue;
      }

      const bestCell = cells[0]; // pega o primeiro celular encontrado

      // Se já tem o mesmo número, pula
      if (bestCell === item.phone) {
        results.push({
          leadId: lead.id,
          company: lead.company,
          phone: bestCell,
          action: "already_has_cell",
        });
        continue;
      }

      // Reseta o item da fila com o número de celular encontrado e reagenda
      await updateQueueItem(item.id, {
        phone: bestCell,
        status: "pending",
        whatsappJid: null,
        scheduledAt: null,
        lastError: null,
        attemptCount: 0,
      });

      // Recarrega o item atualizado e dispara verificação + agendamento
      const updatedItem = { ...item, phone: bestCell, status: "pending" as const };
      verifyAndSchedule(updatedItem).catch((err) => {
        logger.warn("verifyAndSchedule falhou após retry-invalid", {
          leadId: lead.id,
          error: err instanceof Error ? err.message : "unknown",
        });
      });

      logger.info("phone_invalid reprocessado com celular extraído do contact", {
        leadId: lead.id,
        company: lead.company,
        oldPhone: item.phone,
        newPhone: bestCell,
      });

      results.push({
        leadId: lead.id,
        company: lead.company,
        phone: bestCell,
        action: "requeued",
      });
    }

    const requeued = results.filter((r) => r.action === "requeued").length;
    const noCellFound = results.filter((r) => r.action === "no_cell_found").length;

    return NextResponse.json({
      total: invalidItems.length,
      requeued,
      noCellFound,
      results,
    });
  } catch (error) {
    logger.error("retry-invalid error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
