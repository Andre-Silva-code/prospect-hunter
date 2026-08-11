import { z } from "zod";
import { searchSerperQuery } from "./serper";
import { extractPhonesFromText, fetchHtml, findContactLinks } from "./phone-enrichment";
import { checkWhatsAppNumber, isUazapiConfigured } from "./uazapi";
import {
  normalizePhoneForWhatsApp,
  fetchWithTimeout,
  isAbortError,
  parseIntegerEnv,
} from "./utils";
import { logger } from "@/lib/logger";

/**
 * Enriquecimento de contato para leads "Sem Google Meu Negócio".
 *
 * Esses leads normalmente têm só nome + link de rede social (sem telefone).
 * Esta cascata tenta descobrir um telefone usando apenas recursos gratuitos /
 * já existentes, da camada mais barata para a mais elaborada:
 *
 *   Camada A — telefone público na bio/snippet do negócio (Serper)
 *   Camada B — raspagem do site do negócio, se houver URL (fetchHtml)
 *   Camada C — descobrir o CNPJ via Serper e puxar telefone oficial da Receita
 *              (BrasilAPI; CNPJ.ws como reserva) — ambos gratuitos
 *
 * Quando o WhatsApp está configurado (Uazapi), cada telefone candidato é
 * VALIDADO antes de ser aceito — evita devolver números que não existem no
 * WhatsApp. Sem Uazapi, aceita o telefone sem validar (degradação graciosa).
 *
 * Nunca lança: em falha, devolve resultado vazio.
 */

export type SemGmnEnrichmentResult = {
  phone: string | null;
  cnpj: string | null;
  email: string | null;
  source: "bio" | "site" | "cnpj_brasilapi" | "cnpj_ws" | null;
  whatsappVerified: boolean;
};

const EMPTY: SemGmnEnrichmentResult = {
  phone: null,
  cnpj: null,
  email: null,
  source: null,
  whatsappVerified: false,
};

/**
 * Extrai um CNPJ (14 dígitos) de um texto. Aceita formatado
 * (00.000.000/0000-00) ou só dígitos. Retorna apenas os 14 dígitos, ou null.
 */
export function extractCnpjFromText(text: string): string | null {
  if (!text) return null;
  const match = text.match(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/);
  if (!match) return null;
  const digits = match[0].replace(/\D/g, "");
  return digits.length === 14 ? digits : null;
}

/** Schema mínimo compartilhado das respostas de CNPJ (BrasilAPI / CNPJ.ws). */
const BrasilApiCnpjSchema = z.object({
  ddd_telefone_1: z.string().optional(),
  ddd_telefone_2: z.string().optional(),
  email: z.string().nullable().optional(),
});

/**
 * Valida um telefone no WhatsApp (quando o Uazapi está configurado).
 * Retorna { ok, verified }: `ok` indica se pode aceitar o número; `verified`
 * indica se a checagem realmente ocorreu. Sem Uazapi, aceita sem verificar.
 */
async function validatePhone(phone: string): Promise<{ ok: boolean; verified: boolean }> {
  if (!isUazapiConfigured()) return { ok: true, verified: false };
  try {
    const check = await checkWhatsAppNumber(phone);
    return { ok: check.exists, verified: true };
  } catch {
    // Falha na checagem não deve descartar o lead: aceita sem verificar.
    return { ok: true, verified: false };
  }
}

/** Testa uma lista de candidatos, retornando o primeiro aceito (validado se possível). */
async function firstValidPhone(
  candidates: string[]
): Promise<{ phone: string; verified: boolean } | null> {
  for (const candidate of candidates.slice(0, 6)) {
    const { ok, verified } = await validatePhone(candidate);
    if (ok) return { phone: candidate, verified };
  }
  return null;
}

/** Camada A: procura telefone na bio/snippets do negócio via Serper. */
async function tryBioPhone(name: string, region: string): Promise<SemGmnEnrichmentResult | null> {
  const query = `"${name}" ${region} (whatsapp OR telefone OR contato OR "wa.me")`;
  const { items } = await searchSerperQuery(query, 6);

  const phones: string[] = [];
  for (const item of items) {
    phones.push(
      ...extractPhonesFromText(`${item.title ?? ""} ${item.snippet ?? ""} ${item.link ?? ""}`)
    );
  }
  const found = await firstValidPhone([...new Set(phones)]);
  if (found) {
    return {
      phone: found.phone,
      cnpj: null,
      email: null,
      source: "bio",
      whatsappVerified: found.verified,
    };
  }
  return null;
}

/** Camada B: raspa o site do negócio (home + páginas de contato) atrás de telefone. */
async function trySiteScrape(url: string): Promise<SemGmnEnrichmentResult | null> {
  const homeHtml = await fetchHtml(url);
  if (!homeHtml) return null;

  const homePhones = extractPhonesFromText(homeHtml);
  let found = await firstValidPhone(homePhones);
  if (found) {
    return {
      phone: found.phone,
      cnpj: null,
      email: null,
      source: "site",
      whatsappVerified: found.verified,
    };
  }

  for (const link of findContactLinks(homeHtml, url)) {
    const pageHtml = await fetchHtml(link);
    if (!pageHtml) continue;
    found = await firstValidPhone(extractPhonesFromText(pageHtml));
    if (found) {
      return {
        phone: found.phone,
        cnpj: null,
        email: null,
        source: "site",
        whatsappVerified: found.verified,
      };
    }
  }
  return null;
}

/** Camada C.1: descobre o CNPJ do negócio via Serper. */
async function tryFindCnpj(name: string, region: string): Promise<string | null> {
  const { items } = await searchSerperQuery(`"${name}" ${region} CNPJ`, 5);
  for (const item of items) {
    const cnpj = extractCnpjFromText(
      `${item.title ?? ""} ${item.snippet ?? ""} ${item.link ?? ""}`
    );
    if (cnpj) return cnpj;
  }
  return null;
}

/** Consulta genérica de CNPJ (BrasilAPI ou CNPJ.ws — mesmo formato de campos). */
async function fetchCnpjData(
  url: string
): Promise<{ phone: string | null; email: string | null } | null> {
  const timeoutMs = Math.max(1000, parseIntegerEnv("CNPJ_LOOKUP_TIMEOUT_MS", 12000));
  try {
    const response = await fetchWithTimeout(url, { cache: "no-store" }, timeoutMs);
    if (!response.ok) return null;
    const parsed = BrasilApiCnpjSchema.safeParse(await response.json());
    if (!parsed.success) return null;
    const raw = parsed.data.ddd_telefone_1 || parsed.data.ddd_telefone_2 || "";
    const phone = normalizePhoneForWhatsApp(raw);
    const email = parsed.data.email && parsed.data.email.includes("@") ? parsed.data.email : null;
    return { phone, email };
  } catch (error) {
    if (isAbortError(error)) return null;
    return null;
  }
}

/** Camada C.2: CNPJ → telefone/email via BrasilAPI, com CNPJ.ws como reserva. */
export async function lookupCnpj(
  cnpj: string
): Promise<{
  phone: string | null;
  email: string | null;
  source: "cnpj_brasilapi" | "cnpj_ws";
} | null> {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return null;

  const brasil = await fetchCnpjData(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
  if (brasil && (brasil.phone || brasil.email)) {
    return { ...brasil, source: "cnpj_brasilapi" };
  }

  // Reserva: CNPJ.ws (API pública, mesmo formato de campos)
  const cnpjws = await fetchCnpjData(`https://publica.cnpj.ws/cnpj/${digits}`);
  if (cnpjws && (cnpjws.phone || cnpjws.email)) {
    return { ...cnpjws, source: "cnpj_ws" };
  }

  return null;
}

/**
 * Executa a cascata de enriquecimento. `region` deve ser a cidade/estado do
 * lead (ex.: "Campinas, São Paulo"). `siteUrl` opcional (URL do lead/perfil).
 */
export async function enrichSemGmnContact(
  name: string,
  region: string,
  siteUrl?: string
): Promise<SemGmnEnrichmentResult> {
  // Camada A — telefone na bio/snippet
  const bio = await tryBioPhone(name, region);
  if (bio?.phone) {
    logger.info("[sem-gmn] telefone via bio", { name });
    return bio;
  }

  // Camada B — raspagem do site (se houver URL que não seja rede social)
  if (siteUrl && !/instagram\.com|facebook\.com/i.test(siteUrl)) {
    const site = await trySiteScrape(siteUrl);
    if (site?.phone) {
      logger.info("[sem-gmn] telefone via site", { name, siteUrl });
      return site;
    }
  }

  // Camada C — descobrir CNPJ e puxar telefone oficial
  const cnpj = await tryFindCnpj(name, region);
  if (!cnpj) {
    logger.info("[sem-gmn] nenhum telefone/CNPJ encontrado", { name });
    return EMPTY;
  }

  const receita = await lookupCnpj(cnpj);
  if (receita?.phone) {
    const { ok, verified } = await validatePhone(receita.phone);
    if (ok) {
      logger.info("[sem-gmn] telefone via CNPJ", { name, cnpj, source: receita.source });
      return {
        phone: receita.phone,
        cnpj,
        email: receita.email,
        source: receita.source,
        whatsappVerified: verified,
      };
    }
  }

  // Achou CNPJ mas sem telefone válido: ainda devolve CNPJ/email como enriquecimento.
  return {
    phone: null,
    cnpj,
    email: receita?.email ?? null,
    source: null,
    whatsappVerified: false,
  };
}
