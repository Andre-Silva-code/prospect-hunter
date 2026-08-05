/**
 * Recuperação de leads "Perdido" que, com as camadas de enriquecimento atuais,
 * TÊM um WhatsApp válido (mas foram descartados por uma versão anterior da busca
 * que testava só um telefone). Traz de volta ao funil os que forem recuperáveis.
 *
 * Roda a cadeia COMPLETA de enriquecimento (`enrichLeadPhone`) — as mesmas 4
 * camadas do app — e valida cada candidato no WhatsApp real via UAZAPI.
 *
 * Ao recuperar, o script apenas:
 *   - anexa o WhatsApp encontrado ao campo `contact`;
 *   - volta o lead para stage "Novo" e marca `contactable = true`.
 * NÃO dispara mensagens: o fluxo normal do app cuida do outreach a partir daí.
 *
 * MODOS:
 *   (sem flag)   → RELATÓRIO (só leitura). Testa e lista quem seria recuperado.
 *   --apply      → APLICA: atualiza os leads recuperáveis no Supabase.
 *
 * Uso:
 *   npx tsx scripts/recover-lost-leads.ts [limite]           # relatório
 *   npx tsx scripts/recover-lost-leads.ts [limite] --apply   # aplica
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(import.meta.url), "../../");
const envPath = resolve(projectRoot, ".env.local");
autoLoadEnv();

const { enrichLeadPhone } = await import("../lib/connectors/phone-enrichment");
const { extractPhoneFromContact } = await import("../lib/connectors/utils");
import type { LeadRecord } from "../types/prospecting";

const APPLY = process.argv.includes("--apply");
const LIMIT = Math.max(1, parseInt(process.argv.find((a) => /^\d+$/.test(a)) ?? "20", 10) || 20);

const SUPABASE_URL = (process.env.SUPABASE_URL ?? "").trim();
const SERVICE_KEY = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  ""
).trim();
const ANON_KEY = (process.env.SUPABASE_ANON_KEY ?? "").trim();

const headers = {
  apikey: ANON_KEY || SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

type LostRow = {
  id: string;
  user_id: string;
  company: string;
  region: string;
  contact: string;
};

async function main() {
  console.log(
    APPLY
      ? `♻️  MODO --apply: leads recuperáveis voltarão ao funil ("Novo"). Limite: ${LIMIT}.`
      : `🔍 MODO RELATÓRIO (só leitura). Testando até ${LIMIT} leads "Perdido". Nada será alterado.`
  );

  const lost = await getJson<LostRow[]>(
    `/rest/v1/leads?select=id,user_id,company,region,contact&stage=eq.Perdido&limit=${LIMIT}`
  );
  console.log(`\nLeads "Perdido" analisados: ${lost.length}\n`);

  const recovered: { row: LostRow; phone: string; via: string; newContact: string }[] = [];

  for (const row of lost) {
    // Monta um LeadRecord mínimo suficiente para o enriquecimento.
    const lead = {
      id: row.id,
      userId: row.user_id,
      company: row.company,
      region: row.region,
      contact: row.contact,
    } as LeadRecord;

    const currentPhone = extractPhoneFromContact(row.contact);
    const result = await enrichLeadPhone(lead, currentPhone);

    if (result.phone) {
      const alreadyThere = row.contact.includes(result.phone);
      const newContact = alreadyThere
        ? row.contact
        : row.contact
          ? `${row.contact} | ${result.phone}`
          : result.phone;
      recovered.push({ row, phone: result.phone, via: result.source ?? "?", newContact });
      console.log(`✅ "${row.company}" → ${result.phone}  (via ${result.source})`);
    } else {
      console.log(`⚪ "${row.company}" → sem WhatsApp`);
    }

    // Pausa curta para não sobrecarregar UAZAPI/Apify.
    await new Promise((r) => setTimeout(r, 800));
  }

  console.log(`\n♻️  Recuperáveis: ${recovered.length}/${lost.length}\n`);

  if (!APPLY) {
    console.log(
      "Nenhuma alteração feita. Para trazer estes leads de volta ao funil, rode:\n" +
        `  npx tsx scripts/recover-lost-leads.ts ${LIMIT} --apply\n`
    );
    return;
  }

  if (recovered.length === 0) {
    console.log("Nada a recuperar nesta faixa.");
    return;
  }

  console.log("Aplicando recuperação...");
  let done = 0;
  for (const r of recovered) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${encodeURIComponent(r.row.id)}`, {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=minimal" },
      // Nota: a coluna `contactable` não existe na tabela `leads` do Supabase
      // (descompasso com o tipo TS). Gravar só stage + contact, que existem.
      body: JSON.stringify({ stage: "Novo", contact: r.newContact }),
    });
    if (res.ok) {
      done += 1;
      console.log(`  → "${r.row.company}" de volta ao funil com ${r.phone}`);
    } else {
      console.warn(`  ⚠️ falha em "${r.row.company}" (${res.status})`);
    }
  }
  console.log(`\nConcluído: ${done}/${recovered.length} leads recuperados para "Novo".`);
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
