import type { ProspectSearchRequest, ProspectSearchResult, SerperOrganicItem } from "./types";
import { searchSerperRaw, isSerperEnabled } from "./serper";
import { detectGmnPresence, significantTokens } from "./gmn-detector";
import { qualifyLead } from "@/lib/lead-qualification";
import { estimateBudget, hash, scoreToPriority, parseIntegerEnv } from "./utils";
import { logger } from "@/lib/logger";

/**
 * Fonte "Sem Google Meu Negócio".
 *
 * Estratégia: como não dá para pesquisar diretamente "negócios sem GMN", achamos
 * candidatos onde eles APARECEM (Instagram, Facebook, busca geral via Serper) e,
 * para cada um, verificamos no Google Places se JÁ têm ficha no GMN. Só quem
 * comprovadamente NÃO tem (presence="absent") vira lead — Funil B.
 *
 * Conservador por design: candidatos com presença "has" são descartados e os
 * "unknown" (Google devolveu algo, mas sem certeza de match) também são
 * descartados, para nunca oferecer implementação a quem já tem GMN.
 */

/**
 * Domínios que NÃO são negócios locais prospectáveis: diretórios/agregadores,
 * portais de curso/educação, marketplaces e afins. Candidatos nesses domínios
 * são descartados.
 */
const BLOCKED_DOMAIN_PATTERNS = [
  /\.edu(\.[a-z]{2})?$/i, // instituições de ensino (.edu, .edu.br)
  /\.gov(\.[a-z]{2})?$/i, // governo
  /doctoralia\./i,
  /bookis\./i,
  /gympass\./i,
  /getninjas\./i,
  /solutudo\./i,
  /apontador\./i,
  /telelistas\./i,
  /guiamais\./i,
  /ifood\./i,
  /booking\./i,
  /tripadvisor\./i,
  /linktr\.ee/i,
  /youtube\./i,
  /wikipedia\./i,
];

/**
 * Palavras/expressões que indicam que o "candidato" não é um negócio individual
 * (páginas coletivas, cursos, listas). Se o nome, após limpeza, for basicamente
 * só isso, descartamos.
 */
const NON_BUSINESS_HINTS = [
  /\bead\b/i,
  /\bcurso[s]?\b/i,
  /\be\s+regi[ãa]o\b/i,
  /\bgrupo\b/i,
  /\bespecialistas?\b/i,
  /\bmelhores\b/i,
  /\bencontre\b/i,
];

/** Extrai o domínio (host) de uma URL, sem "www." e subdomínios de idioma. */
function domainOf(url?: string): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** True se a URL vem de um domínio que não é negócio local prospectável. */
function isBlockedDomain(url?: string): boolean {
  const host = domainOf(url);
  if (!host) return false;
  return BLOCKED_DOMAIN_PATTERNS.some((re) => re.test(host));
}

/**
 * Valida se um nome (já limpo) parece um negócio real e prospectável:
 *  - tem ao menos um token "próprio" (não só termos genéricos de segmento);
 *  - não bate com padrões de página coletiva/curso.
 */
function looksLikeBusinessName(name: string): boolean {
  if (name.length < 4) return false;
  if (NON_BUSINESS_HINTS.some((re) => re.test(name))) return false;
  // Precisa ter um token distintivo (nome próprio), além de termos genéricos de
  // segmento como "estética/clínica", e esse token deve ter ao menos 4 letras
  // (evita fragmentos como "pro" de nomes cortados).
  const tokens = significantTokens(name);
  return tokens.some((t) => t.length >= 4);
}

/** Sufixos e ruídos comuns nos títulos dos resultados de busca. */
function cleanBusinessName(rawTitle: string): string {
  return (
    rawTitle
      // Remove o sufixo da rede social ("- Facebook", "• Instagram", "| LinkedIn").
      // Exige espaço ao redor do separador para não cortar nomes com hífen
      // (ex.: "Pró-Corpo" deve permanecer intacto).
      .replace(/\s+[|·•–—]\s+.*$/, "") // separadores "fortes" com espaços
      .replace(/\s+-\s+.*$/, "") // hífen só quando cercado de espaços
      .replace(/\s*\(@[^)]+\).*$/i, "") // "(@usuario) ..."
      .replace(/\s*[·•|]\s*(facebook|instagram|linkedin).*$/i, "") // rede social colada
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** Extrai um candidato (nome + url) de um item bruto do Serper, já filtrado. */
function toCandidate(
  item: SerperOrganicItem
): { name: string; url?: string; snippet?: string } | null {
  const title = item.title?.trim();
  if (!title) return null;

  // Descarta domínios que não são negócios locais (cursos, diretórios, etc.).
  if (isBlockedDomain(item.link)) return null;

  const name = cleanBusinessName(title);
  if (!looksLikeBusinessName(name)) return null;

  return { name, url: item.link, snippet: item.snippet };
}

/** Remove candidatos duplicados por nome normalizado (mesmo negócio em fontes diferentes). */
function dedupeCandidates(
  candidates: { name: string; url?: string; snippet?: string }[]
): { name: string; url?: string; snippet?: string }[] {
  const seen = new Map<string, { name: string; url?: string; snippet?: string }>();
  for (const c of candidates) {
    const key = c.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (!seen.has(key)) seen.set(key, c);
  }
  return [...seen.values()];
}

export async function searchSemGmn(
  request: ProspectSearchRequest
): Promise<{ results: ProspectSearchResult[]; status: string }> {
  if (!isSerperEnabled()) {
    return { results: [], status: "Sem GMN indisponivel: Serper não configurado" };
  }

  // 1) Reúne candidatos das 3 fontes (Instagram, Facebook, busca geral).
  const [ig, fb, general] = await Promise.all([
    searchSerperRaw("instagram", request),
    searchSerperRaw("facebook", request),
    searchSerperRaw("general", request),
  ]);

  const rawItems: SerperOrganicItem[] = [...ig.items, ...fb.items, ...general.items];
  const candidates = dedupeCandidates(
    rawItems.map(toCandidate).filter((c): c is NonNullable<typeof c> => c !== null)
  );

  if (candidates.length === 0) {
    return { results: [], status: "0 candidato(s) encontrado(s) para verificar GMN" };
  }

  // 2) Verifica cada candidato no Google Places (limita para não estourar cota).
  const maxChecks = Math.max(1, parseIntegerEnv("SEM_GMN_MAX_CHECKS", 20));
  const region = request.city ?? request.region;
  const toCheck = candidates.slice(0, maxChecks);

  const results: ProspectSearchResult[] = [];
  let hasGmnCount = 0;
  let unknownCount = 0;

  for (const candidate of toCheck) {
    const detection = await detectGmnPresence(candidate.name, region);

    if (detection.presence === "has") {
      hasGmnCount += 1;
      continue; // já tem GMN → não é lead
    }
    if (detection.presence === "unknown") {
      unknownCount += 1;
      continue; // dúvida → descarta por segurança
    }

    // presence === "absent": negócio sem GMN → lead do Funil B
    results.push(buildSemGmnLead(candidate, request, region, results.length));
  }

  const status =
    `${results.length} lead(s) sem GMN` +
    ` (verificados: ${toCheck.length}, com GMN: ${hasGmnCount}, indefinidos: ${unknownCount})`;

  logger.info("Busca sem-GMN concluída", {
    candidatos: candidates.length,
    verificados: toCheck.length,
    semGmn: results.length,
    comGmn: hasGmnCount,
    indefinidos: unknownCount,
  });

  return { results, status };
}

/** Monta um lead do Funil B (sem GMN) a partir de um candidato verificado. */
function buildSemGmnLead(
  candidate: { name: string; url?: string; snippet?: string },
  request: ProspectSearchRequest,
  region: string,
  index: number
): ProspectSearchResult {
  const source = "Sem Google Meu Negócio" as const;

  // Sinais conhecidos: NÃO tem perfil GMN. Se veio de rede social, tem presença
  // online (site/rede). Sem telefone/rating confiáveis aqui.
  const qualification = qualifyLead({
    hasGoogleProfile: false,
    hasWebsite: Boolean(candidate.url),
    hasValidPhone: false,
  });

  const score = qualification.qualificationScore;

  return {
    id: `${source}-${index}-${hash(`${candidate.name}-${region}`)}`,
    company: candidate.name,
    niche: request.niche,
    region,
    monthlyBudget: estimateBudget(score),
    score,
    priority: scoreToPriority(score),
    trigger:
      candidate.snippet?.trim() ||
      "Negócio presente em redes/sites, mas sem ficha no Google Meu Negócio — oportunidade de implementação.",
    source,
    icp: request.icp,
    contact: candidate.url ?? "Sem contato publico",
    sourceUrl: candidate.url,
    qualificationScore: qualification.qualificationScore,
    funnel: qualification.funnel,
    contactable: qualification.contactable,
  };
}

/** Funções internas expostas apenas para testes unitários. */
export const __testables = {
  cleanBusinessName,
  looksLikeBusinessName,
  isBlockedDomain,
  domainOf,
};
