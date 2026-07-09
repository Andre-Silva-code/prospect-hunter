import type { LeadRecord } from "@/types/prospecting";
import { checkWhatsAppNumber } from "@/lib/connectors/uazapi";
import { fetchWithTimeout, normalizePhoneForWhatsApp } from "@/lib/connectors/utils";
import { logger } from "@/lib/logger";

const APIFY_TOKEN = process.env.APIFY_TOKEN ?? "";
const APIFY_BASE = process.env.APIFY_API_BASE_URL ?? "https://api.apify.com";

/**
 * Resultado de uma tentativa de enriquecimento de telefone.
 * - `phone`: número normalizado (55DDD9XXXXXXXX) validado no WhatsApp, ou null.
 * - `source`: qual camada encontrou o número (para diagnóstico/badge no Kanban).
 */
export type PhoneEnrichmentResult = {
  phone: string | null;
  jid: string | null;
  source: "fixo-google" | "site-do-lead" | "apify-google" | null;
};

/**
 * Extrai a URL de site do campo `contact` do lead.
 * O contact do GMN vem no formato "https://site.com | (11) 3000-0000".
 */
export function extractWebsiteFromContact(contact: string): string | null {
  const parts = contact.split(/[|,;]/).map((p) => p.trim());
  for (const part of parts) {
    if (/^https?:\/\//i.test(part) || /^www\./i.test(part)) {
      return part.startsWith("http") ? part : `https://${part}`;
    }
  }
  return null;
}

/**
 * Extrai todos os telefones/celulares brasileiros de um texto livre,
 * já normalizados para o formato WhatsApp (55 + DDD + número).
 * Prioriza celulares (11 dígitos com o 9), mas também aceita fixos.
 */
export function extractPhonesFromText(text: string): string[] {
  const raw =
    text.match(
      /(?:\+?55[\s.-]?)?(?:\(?\d{2}\)?[\s.-]?)(?:9[\s.-]?\d{4}[\s.-]?\d{4}|\d{4}[\s.-]?\d{4})/g
    ) ?? [];
  // wa.me/55... também é uma fonte forte de WhatsApp
  const waLinks = text.match(/wa\.me\/(\d{10,15})/g) ?? [];

  const found: string[] = [];
  const cells: string[] = [];

  for (const link of waLinks) {
    const digits = link.replace(/\D/g, "");
    const normalized = normalizePhoneForWhatsApp(digits);
    if (normalized) cells.push(normalized); // wa.me tem prioridade máxima
  }

  for (const match of raw) {
    const normalized = normalizePhoneForWhatsApp(match);
    if (!normalized) continue;
    const local = normalized.startsWith("55") ? normalized.slice(2) : normalized;
    // Celular BR: 11 dígitos, terceiro dígito = 9
    if (local.length === 11 && local[2] === "9") {
      cells.push(normalized);
    } else {
      found.push(normalized);
    }
  }

  // Celulares/wa.me primeiro, depois fixos; sem duplicatas
  return [...new Set([...cells, ...found])];
}

/**
 * Camada 1 — Testa o telefone que o lead JÁ tem (tipicamente o fixo do Google)
 * diretamente no WhatsApp. Muitos negócios usam WhatsApp Business no número fixo.
 */
async function tryExistingPhone(currentPhone: string): Promise<PhoneEnrichmentResult> {
  const normalized = normalizePhoneForWhatsApp(currentPhone);
  if (!normalized) return { phone: null, jid: null, source: null };

  const check = await checkWhatsAppNumber(normalized);
  if (check.exists) {
    return { phone: normalized, jid: check.jid, source: "fixo-google" };
  }
  return { phone: null, jid: null, source: null };
}

/**
 * Camada 2 — Faz fetch do site do próprio lead e procura WhatsApp/telefone
 * no HTML (rodapé, botão flutuante, página de contato). Custo zero.
 */
async function trySiteScrape(website: string): Promise<PhoneEnrichmentResult> {
  try {
    const response = await fetchWithTimeout(
      website,
      {
        headers: {
          // User-agent de browser real para evitar bloqueios simples
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        },
        cache: "no-store",
      },
      15_000
    );

    if (!response.ok) return { phone: null, jid: null, source: null };

    const html = await response.text();
    const candidates = extractPhonesFromText(html);

    // Valida cada candidato no WhatsApp até achar um que exista
    for (const candidate of candidates.slice(0, 5)) {
      const check = await checkWhatsAppNumber(candidate);
      if (check.exists) {
        return { phone: candidate, jid: check.jid, source: "site-do-lead" };
      }
    }
    return { phone: null, jid: null, source: null };
  } catch {
    return { phone: null, jid: null, source: null };
  }
}

/**
 * Camada 3 — Último recurso: usa o Actor de busca do Apify para procurar o
 * contato do negócio na web e valida os candidatos no WhatsApp.
 * (Mesma abordagem anterior, mas agora só como fallback final e com validação.)
 */
async function tryApifySearch(lead: LeadRecord): Promise<PhoneEnrichmentResult> {
  if (!APIFY_TOKEN) return { phone: null, jid: null, source: null };

  const query = `"${lead.company}" ${lead.region} whatsapp celular contato`;

  try {
    const runRes = await fetchWithTimeout(
      `${APIFY_BASE}/v2/acts/apify~google-search-scraper/runs?token=${APIFY_TOKEN}&waitForFinish=60`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queries: query, resultsPerPage: 5, maxPagesPerQuery: 1 }),
        cache: "no-store",
      },
      75_000
    );

    if (!runRes.ok) return { phone: null, jid: null, source: null };

    const runPayload = (await runRes.json()) as {
      data?: { status?: string; defaultDatasetId?: string };
    };
    if (runPayload.data?.status !== "SUCCEEDED" || !runPayload.data.defaultDatasetId) {
      return { phone: null, jid: null, source: null };
    }

    const datasetRes = await fetchWithTimeout(
      `${APIFY_BASE}/v2/datasets/${runPayload.data.defaultDatasetId}/items?token=${APIFY_TOKEN}&clean=true&format=json`,
      { cache: "no-store" },
      30_000
    );

    if (!datasetRes.ok) return { phone: null, jid: null, source: null };
    const items = (await datasetRes.json()) as unknown[];
    if (!Array.isArray(items)) return { phone: null, jid: null, source: null };

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

    const candidates = extractPhonesFromText(texts.join(" "));
    for (const candidate of candidates.slice(0, 5)) {
      const check = await checkWhatsAppNumber(candidate);
      if (check.exists) {
        return { phone: candidate, jid: check.jid, source: "apify-google" };
      }
    }
    return { phone: null, jid: null, source: null };
  } catch {
    return { phone: null, jid: null, source: null };
  }
}

/**
 * Orquestra as 3 camadas de enriquecimento, em ordem de custo/confiabilidade.
 * Retorna no primeiro acerto (número que EXISTE de fato no WhatsApp).
 *
 * @param lead - o lead a enriquecer
 * @param currentPhone - o telefone atual do lead (ex.: fixo do Google), se houver
 */
export async function enrichLeadPhone(
  lead: LeadRecord,
  currentPhone: string | null
): Promise<PhoneEnrichmentResult> {
  // Camada 1: o próprio fixo do Google pode ter WhatsApp Business
  if (currentPhone) {
    const layer1 = await tryExistingPhone(currentPhone);
    if (layer1.phone) {
      logger.info("WhatsApp encontrado no fixo do Google", {
        leadId: lead.id,
        company: lead.company,
      });
      return layer1;
    }
  }

  // Camada 2: site do próprio lead (websiteUri já vem no campo contact)
  const website = extractWebsiteFromContact(lead.contact);
  if (website) {
    const layer2 = await trySiteScrape(website);
    if (layer2.phone) {
      logger.info("WhatsApp encontrado no site do lead", {
        leadId: lead.id,
        company: lead.company,
        website,
      });
      return layer2;
    }
  }

  // Camada 3: busca via Apify como último recurso
  const layer3 = await tryApifySearch(lead);
  if (layer3.phone) {
    logger.info("WhatsApp encontrado via Apify", {
      leadId: lead.id,
      company: lead.company,
    });
    return layer3;
  }

  logger.info("Nenhum WhatsApp encontrado nas 3 camadas", {
    leadId: lead.id,
    company: lead.company,
  });
  return { phone: null, jid: null, source: null };
}
