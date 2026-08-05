/**
 * TESTE (somente leitura) das melhorias de enriquecimento de WhatsApp.
 *
 * Pega uma amostra de leads "Perdido" (que esgotaram as camadas sem WhatsApp) e,
 * para cada um, roda a NOVA Camada 1 — testa todos os telefones conhecidos + a
 * variante de 9º dígito de fixos — validando cada candidato no WhatsApp real via
 * UAZAPI. Reporta quantos SERIAM recuperados pela melhoria.
 *
 * NÃO altera nenhum lead nem a fila. É um experimento de validação.
 *
 * Uso:
 *   npx tsx scripts/test-enrichment-improvements.ts [amostra]
 *   npx tsx scripts/test-enrichment-improvements.ts 10   # testa 10 leads
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(import.meta.url), "../../");
const envPath = resolve(projectRoot, ".env.local");
autoLoadEnv();

const { collectKnownPhoneCandidates } = await import("../lib/connectors/phone-enrichment");
const { checkWhatsAppNumber } = await import("../lib/connectors/uazapi");
const { extractPhoneFromContact } = await import("../lib/connectors/utils");

const SUPABASE_URL = (process.env.SUPABASE_URL ?? "").trim();
const SERVICE_KEY = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  ""
).trim();
const ANON_KEY = (process.env.SUPABASE_ANON_KEY ?? "").trim();
const SAMPLE = Math.max(1, parseInt(process.argv[2] ?? "8", 10) || 8);

const headers = {
  apikey: ANON_KEY || SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};

type LeadRow = { id: string; company: string; contact: string };

async function main() {
  console.log(`🧪 Teste de recuperação (amostra: ${SAMPLE} leads Perdido). Somente leitura.\n`);

  const leads = await getJson<LeadRow[]>(
    `/rest/v1/leads?select=id,company,contact&stage=eq.Perdido&limit=${SAMPLE}`
  );

  let recovered = 0;
  for (const lead of leads) {
    const currentPhone = extractPhoneFromContact(lead.contact);
    const candidates = collectKnownPhoneCandidates(lead.contact, currentPhone);

    let hit: string | null = null;
    const tested: string[] = [];
    for (const candidate of candidates.slice(0, 6)) {
      tested.push(candidate);
      const check = await checkWhatsAppNumber(candidate);
      if (check.exists) {
        hit = candidate;
        break;
      }
    }

    if (hit) {
      recovered += 1;
      console.log(`✅ RECUPERADO  "${lead.company}"`);
      console.log(`   → WhatsApp válido: ${hit}  (candidatos testados: ${tested.join(", ")})`);
    } else {
      console.log(
        `⚪ sem WhatsApp "${lead.company}"  (testados: ${tested.join(", ") || "nenhum"})`
      );
    }
  }

  console.log(
    `\nResultado: ${recovered}/${leads.length} leads da amostra teriam WhatsApp recuperado pela melhoria da Camada 1.`
  );
  console.log("Nenhum lead foi alterado.");
}

async function getJson<T>(pathWithQuery: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}${pathWithQuery}`, { headers, cache: "no-store" });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
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
