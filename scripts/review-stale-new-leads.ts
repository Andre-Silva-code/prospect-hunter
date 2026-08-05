/**
 * Revisão de leads na etapa "Novo" que já passaram pelas 4 camadas de
 * enriquecimento de WhatsApp SEM sucesso — candidatos a descarte (→ "Perdido").
 *
 * O sinal de "4 camadas esgotadas" vive na fila de outreach: o item fica com
 * `status = "phone_invalid"` e `lastError` contendo "não encontrado". Ver
 * `app/api/outreach/enrich-phones/route.ts` e `lib/connectors/phone-enrichment.ts`.
 *
 * Este script é uma ferramenta de MANUTENÇÃO (admin): fala direto com o Supabase
 * usando a SERVICE_ROLE key (que bypassa RLS), pois `listAllLeads()` do app usa a
 * anon key e não enxerga todos os registros. Não altera nenhum código de produção.
 *
 * MODOS:
 *   (sem flag)   → RELATÓRIO. Só lê o Supabase e imprime a lista. NÃO altera nada.
 *   --apply      → APLICA o descarte: move os leads listados para "Perdido".
 *                  Use apenas depois de revisar o relatório.
 *
 * Uso:
 *   npx tsx scripts/review-stale-new-leads.ts            # relatório (seguro)
 *   npx tsx scripts/review-stale-new-leads.ts --apply    # aplica o descarte
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(import.meta.url), "../../");
const envPath = resolve(projectRoot, ".env.local");

autoLoadEnv();

const APPLY = process.argv.includes("--apply");

const SUPABASE_URL = (process.env.SUPABASE_URL ?? "").trim();
const SERVICE_KEY = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  ""
).trim();
const ANON_KEY = (process.env.SUPABASE_ANON_KEY ?? "").trim();

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou ANON) são obrigatórios no .env.local"
  );
  process.exit(1);
}

const headers = {
  apikey: ANON_KEY || SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

type LeadRow = { id: string; user_id: string; company: string; region: string; stage: string };
type QueueRow = { lead_id: string; status: string; phone: string; last_error: string | null };

/** Um item de fila representa "4 camadas esgotadas" quando ficou phone_invalid. */
function isEnrichmentExhausted(lastError: string | null): boolean {
  if (!lastError) return false;
  return /não encontrado|nao encontrado|not found/i.test(lastError);
}

async function main() {
  console.log(
    APPLY
      ? "⚠️  MODO --apply: leads sem WhatsApp após as 4 camadas serão movidos para 'Perdido'."
      : "🔍 MODO RELATÓRIO (só leitura). Nada será alterado. Use --apply para descartar."
  );

  const novoLeads = await getJson<LeadRow[]>(
    `/rest/v1/leads?select=id,user_id,company,region,stage&stage=eq.Novo`
  );
  const invalidQueue = await getJson<QueueRow[]>(
    `/rest/v1/outreach_queue?select=lead_id,status,phone,last_error&status=eq.phone_invalid`
  );

  const queueByLead = new Map(invalidQueue.map((q) => [q.lead_id, q]));

  console.log(`\nLeads na etapa "Novo": ${novoLeads.length}`);
  console.log(`Itens phone_invalid na fila: ${invalidQueue.length}\n`);

  const discardable: {
    id: string;
    userId: string;
    company: string;
    region: string;
    testedPhone: string;
    reason: string;
  }[] = [];
  const kept: { company: string; motivo: string }[] = [];

  for (const lead of novoLeads) {
    const q = queueByLead.get(lead.id);

    if (!q) {
      kept.push({
        company: lead.company,
        motivo: "sem item phone_invalid (não esgotou 4 camadas)",
      });
      continue;
    }
    if (!isEnrichmentExhausted(q.last_error)) {
      kept.push({
        company: lead.company,
        motivo: `phone_invalid, mas lastError não confirma: "${q.last_error ?? "vazio"}"`,
      });
      continue;
    }

    discardable.push({
      id: lead.id,
      userId: lead.user_id,
      company: lead.company,
      region: lead.region,
      testedPhone: q.phone,
      reason: q.last_error ?? "",
    });
  }

  console.log(`✅ Mantidos: ${kept.length}`);
  console.log(`🗑️  Candidatos a descarte (Novo + 4 camadas sem WhatsApp): ${discardable.length}\n`);

  if (discardable.length > 0) {
    console.table(
      discardable.map((d) => ({
        empresa: d.company,
        regiao: d.region,
        "telefone testado": d.testedPhone,
        motivo: d.reason.slice(0, 45),
      }))
    );
  }

  if (!APPLY) {
    console.log(
      "\nNenhuma alteração feita. Para efetivamente descartar estes leads, rode:\n" +
        "  npx tsx scripts/review-stale-new-leads.ts --apply\n"
    );
    return;
  }

  if (discardable.length === 0) {
    console.log("\nNada a descartar.");
    return;
  }

  console.log("\nAplicando descarte...");
  let moved = 0;
  const now = new Date().toISOString();
  for (const d of discardable) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${encodeURIComponent(d.id)}`, {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({ stage: "Perdido", last_contact_at: now }),
    });
    if (res.ok) {
      moved += 1;
      console.log(`  → "${d.company}" movido para Perdido`);
    } else {
      console.warn(`  ⚠️ falha ao atualizar "${d.company}" (${res.status})`);
    }
  }
  console.log(`\nConcluído: ${moved}/${discardable.length} leads movidos para "Perdido".`);
}

async function getJson<T>(pathWithQuery: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}${pathWithQuery}`, { headers, cache: "no-store" });
  if (!res.ok) {
    throw new Error(
      `Supabase ${res.status} em ${pathWithQuery}: ${(await res.text()).slice(0, 200)}`
    );
  }
  return (await res.json()) as T;
}

function autoLoadEnv() {
  let raw: string;
  try {
    raw = readFileSync(envPath, "utf8");
  } catch {
    console.warn(`.env.local não encontrado em ${envPath}; usando variáveis do ambiente.`);
    return;
  }
  for (const line of raw.split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsPos = trimmed.indexOf("=");
    if (equalsPos === -1) continue;
    const key = trimmed.slice(0, equalsPos).trim();
    const value = trimmed.slice(equalsPos + 1).trim();
    if (key && value && !(key in process.env)) process.env[key] = value;
  }
}

await main();
