import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth-session";
import { listLeads, updateLeadRecord } from "@/lib/leads-repository";
import { getQueueItemsByStatus, updateQueueItem } from "@/lib/outreach-queue";
import { verifyAndSchedule } from "@/lib/outreach-orchestrator";
import { normalizePhoneForWhatsApp } from "@/lib/connectors/utils";
import { fetchWithTimeout } from "@/lib/connectors/utils";
import { logger } from "@/lib/logger";

const APIFY_TOKEN = process.env.APIFY_TOKEN ?? "";
const APIFY_BASE = process.env.APIFY_API_BASE_URL ?? "https://api.apify.com";

/**
 * Extrai todos os números de celular brasileiro de um texto livre.
 * Aceita formatos com/sem DDD, com/sem prefixo 55, com pontuação variada.
 */
function extractCellsFromText(text: string): string[] {
  // Regex ampla: captura sequências numéricas que parecem telefone BR
  const raw =
    text.match(/(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)(?:9\s?\d{4}[\s.-]?\d{4}|\d{4}[\s.-]?\d{4})/g) ?? [];
  const found: string[] = [];
  for (const match of raw) {
    const normalized = normalizePhoneForWhatsApp(match);
    if (!normalized) continue;
    const local = normalized.startsWith("55") ? normalized.slice(2) : normalized;
    // Celular: 11 dígitos com terceiro dígito = 9
    if (local.length === 11 && local[2] === "9") {
      found.push(normalized);
    }
  }
  return [...new Set(found)];
}

/**
 * Roda o google-search-scraper do Apify para uma query e retorna
 * o texto bruto de todos os snippets/títulos dos resultados orgânicos.
 */
async function googleSearchSnippets(query: string): Promise<string> {
  if (!APIFY_TOKEN) return "";

  try {
    const runRes = await fetchWithTimeout(
      `${APIFY_BASE}/v2/acts/apify~google-search-scraper/runs?token=${APIFY_TOKEN}&waitForFinish=60`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queries: query,
          resultsPerPage: 5,
          maxPagesPerQuery: 1,
        }),
        cache: "no-store",
      },
      75_000
    );

    if (!runRes.ok) return "";

    const runPayload = (await runRes.json()) as {
      data?: { status?: string; defaultDatasetId?: string };
    };
    if (runPayload.data?.status !== "SUCCEEDED" || !runPayload.data.defaultDatasetId) return "";

    const datasetRes = await fetchWithTimeout(
      `${APIFY_BASE}/v2/datasets/${runPayload.data.defaultDatasetId}/items?token=${APIFY_TOKEN}&clean=true&format=json`,
      { cache: "no-store" },
      30_000
    );

    if (!datasetRes.ok) return "";
    const items = (await datasetRes.json()) as unknown[];
    if (!Array.isArray(items)) return "";

    // Concatena títulos + descrições de todos os resultados orgânicos
    const texts: string[] = [];
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      const organic = Array.isArray(record.organicResults) ? record.organicResults : [];
      for (const result of organic) {
        if (!result || typeof result !== "object") continue;
        const r = result as Record<string, unknown>;
        if (typeof r.title === "string") texts.push(r.title);
        if (typeof r.description === "string") texts.push(r.description);
        if (typeof r.snippet === "string") texts.push(r.snippet);
      }
    }

    return texts.join(" ");
  } catch {
    return "";
  }
}

type EnrichResult = {
  leadId: string;
  company: string;
  action: "requeued" | "not_found" | "skipped";
  phone?: string;
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

      // Monta query focada em WhatsApp/celular do negócio
      const query = `"${lead.company}" ${lead.region} whatsapp celular contato`;

      logger.info("Buscando celular via Google", { leadId: lead.id, company: lead.company, query });

      const snippetText = await googleSearchSnippets(query);

      if (!snippetText) {
        results.push({ leadId: lead.id, company: lead.company, action: "not_found" });
        continue;
      }

      const cells = extractCellsFromText(snippetText);

      if (cells.length === 0) {
        results.push({ leadId: lead.id, company: lead.company, action: "not_found" });
        continue;
      }

      const bestCell = cells[0];

      // Atualiza o campo contact do lead adicionando o novo celular
      const newContact = lead.contact ? `${lead.contact} | ${bestCell}` : bestCell;

      await updateLeadRecord(userId, lead.id, { contact: newContact });

      // Reseta o item da fila com o novo número e reagenda
      await updateQueueItem(item.id, {
        phone: bestCell,
        status: "pending",
        whatsappJid: null,
        scheduledAt: null,
        lastError: null,
        attemptCount: 0,
      });

      verifyAndSchedule({ ...item, phone: bestCell, status: "pending" }).catch(() => {});

      logger.info("Celular encontrado via Google e lead reenfileirado", {
        leadId: lead.id,
        company: lead.company,
        phone: bestCell,
      });

      results.push({ leadId: lead.id, company: lead.company, action: "requeued", phone: bestCell });

      // Pausa entre buscas para não sobrecarregar o Apify
      await new Promise((r) => setTimeout(r, 2000));
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
