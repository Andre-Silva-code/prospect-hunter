import type { ProspectSearchRequest, ProspectSearchResult, SerperOrganicItem } from "./types";
import { searchSerperRaw, isSerperEnabled } from "./serper";
import { detectGmnPresence, significantTokens } from "./gmn-detector";
import { mainCitiesForState } from "./cities-by-state";
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
  /booksy\./i, // marketplace de agendamento
  /econodata\./i, // diretório de empresas
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
  /reclameaqui\./i,
];

/**
 * Palavras/expressões que indicam que o "candidato" não é um negócio individual
 * (páginas coletivas, cursos, listas). Se o nome, após limpeza, for basicamente
 * só isso, descartamos.
 */
const NON_BUSINESS_HINTS = [
  /\bead\b/i,
  /\bcurso[s]?\b/i,
  /\bturma\b/i,
  /\baula[s]?\b/i,
  /\bp[óo]s\b/i,
  /\bworkshop[s]?\b/i,
  /\bcongresso\b/i,
  /\bfeira\b/i,
  /\bevento[s]?\b/i,
  /\bexpo\b/i,
  /\be\s+regi[ãa]o\b/i,
  /\bgrupo\b/i,
  /\bespecialistas?\b/i,
  /\bmelhores\b/i,
  /\bencontre\b/i,
  /\bperto\s+de\s+(mim|voc[êe])\b/i, // páginas de SEO "perto de mim"
  /\blista\s+de\b/i, // "Lista de empresas..."
  /\(\d+\)/, // "(298)" — contagem de diretório
  /^(in[íi]cio|home|p[áa]gina inicial)$/i, // títulos genéricos de site
  /^[^,]+\s*\(centro\)$/i, // "Guarulhos (Centro)" — página de unidade
];

/** Trechos de URL que indicam conteúdo (não a página do negócio em si). */
const BLOCKED_URL_PATHS = [
  /\/videos?\//i,
  /\/photo/i,
  /\/events?\//i,
  /\/posts?\//i,
  /\/reel/i,
  /instagram\.com\/p\//i, // post individual do Instagram (não é perfil)
  /\/workshops?\b/i,
  /\/unidade[s]?\//i, // páginas de "unidade" de redes
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

/**
 * True se a URL deve ser descartada: domínio que não é negócio local
 * (diretório/curso) OU caminho de conteúdo (vídeo/post/evento, não a página do
 * negócio).
 */
function isBlockedDomain(url?: string): boolean {
  const host = domainOf(url);
  if (!host) return false;
  if (BLOCKED_DOMAIN_PATTERNS.some((re) => re.test(host))) return true;
  if (url && BLOCKED_URL_PATHS.some((re) => re.test(url))) return true;
  return false;
}

/**
 * Valida se um nome (já limpo) parece um negócio real e prospectável:
 *  - tem ao menos um token "próprio" (não só termos genéricos de segmento);
 *  - não bate com padrões de página coletiva/curso.
 */
function looksLikeBusinessName(name: string): boolean {
  if (name.length < 4) return false;
  if (NON_BUSINESS_HINTS.some((re) => re.test(name))) return false;

  // Títulos-frase de SEO ("Tratamentos estéticos personalizados e cuidados...")
  // costumam ser longos. Nomes de negócio reais raramente passam de 5 palavras.
  const wordCount = name.trim().split(/\s+/).length;
  if (wordCount > 5) return false;

  // Frases com preposições típicas de descrição ("em São Paulo", "com beleza",
  // "de excelência") indicam texto de SEO, não nome de negócio.
  if (/\b(em|com|para|sobre)\b/i.test(name) && wordCount >= 4) {
    return false;
  }

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

/**
 * Orquestra a busca sem-GMN. Se o usuário informou uma cidade, busca só nela.
 * Caso contrário (só o estado), busca automaticamente nas principais cidades do
 * estado e junta os leads — mais volume mantendo a qualidade.
 *
 * @param stateName nome do estado já expandido (ex.: "São Paulo").
 */
export async function searchSemGmn(
  request: ProspectSearchRequest,
  stateName?: string
): Promise<{ results: ProspectSearchResult[]; status: string }> {
  if (!isSerperEnabled()) {
    return { results: [], status: "Sem GMN indisponivel: Serper não configurado" };
  }

  // Cidade específica informada → busca só nela (comportamento original).
  if (request.city && request.city.trim().length > 0) {
    return searchSemGmnCity({
      ...request,
      region: `${request.city}, ${stateName ?? request.region}`,
    });
  }

  // Sem cidade → modo multi-cidade nas principais cidades do estado (UF).
  // Default conservador (3 cidades) para caber na janela de tempo de proxies
  // com timeout curto (ex.: EasyPanel). Ajustável via env se o ambiente aguentar.
  const uf = request.region;
  const maxCities = Math.max(1, parseIntegerEnv("SEM_GMN_MAX_CITIES", 3));
  const cities = mainCitiesForState(uf, maxCities);

  if (cities.length === 0) {
    // Estado não mapeado → cai no comportamento antigo (busca pela região toda).
    return searchSemGmnCity({ ...request, region: stateName ?? request.region });
  }

  // No multi-cidade, reduz o funil por cidade (menos candidatos/verificações),
  // já que o volume vem da soma das cidades. Evita estourar o tempo total.
  const perCityLimit = Math.max(1, parseIntegerEnv("SEM_GMN_MULTICITY_PER_SOURCE", 15));

  const perCity = await Promise.all(
    cities.map((city) =>
      searchSemGmnCity({
        ...request,
        city,
        region: `${city}, ${stateName ?? uf}`,
        limitPerSource: perCityLimit,
      })
    )
  );

  const merged = dedupeLeads(perCity.flatMap((r) => r.results));
  const totalCities = cities.length;
  return {
    results: merged,
    status: `${merged.length} lead(s) sem GMN em ${totalCities} cidade(s) de ${stateName ?? uf}`,
  };
}

/** Remove leads duplicados (mesmo negócio aparecendo em cidades vizinhas). */
function dedupeLeads(leads: ProspectSearchResult[]): ProspectSearchResult[] {
  const seen = new Map<string, ProspectSearchResult>();
  for (const lead of leads) {
    const key = lead.company.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
    if (!seen.has(key)) seen.set(key, lead);
  }
  return [...seen.values()];
}

async function searchSemGmnCity(
  request: ProspectSearchRequest
): Promise<{ results: ProspectSearchResult[]; status: string }> {
  // 1) Reúne candidatos das 3 fontes (Instagram, Facebook, busca geral).
  // Buscamos MAIS candidatos por fonte do que o limite de leads pedido, pois a
  // maioria já tem GMN e será descartada — precisamos de um funil largo na
  // entrada para sobrar leads sem-GMN no final.
  //
  // O teto de candidatos acompanha o limite pedido (o modo multi-cidade passa um
  // limite menor por cidade, para o total caber na janela de tempo). Configurável.
  const perSource = Math.max(
    request.limitPerSource,
    Math.min(parseIntegerEnv("SEM_GMN_CANDIDATES_PER_SOURCE", 30), request.limitPerSource * 2)
  );
  const wideRequest: ProspectSearchRequest = { ...request, limitPerSource: perSource };

  const [ig, fb, general] = await Promise.all([
    searchSerperRaw("instagram", wideRequest),
    searchSerperRaw("facebook", wideRequest),
    searchSerperRaw("general", wideRequest),
  ]);

  const rawItems: SerperOrganicItem[] = [...ig.items, ...fb.items, ...general.items];
  const candidates = dedupeCandidates(
    rawItems.map(toCandidate).filter((c): c is NonNullable<typeof c> => c !== null)
  );

  if (candidates.length === 0) {
    return { results: [], status: "0 candidato(s) encontrado(s) para verificar GMN" };
  }

  // 2) Verifica cada candidato no Google Places (limita para não estourar cota
  // nem o tempo). O teto acompanha o limite pedido — no multi-cidade, cada
  // cidade verifica menos, e o volume vem da soma.
  const maxChecks = Math.max(
    1,
    Math.min(parseIntegerEnv("SEM_GMN_MAX_CHECKS", 60), request.limitPerSource * 3)
  );
  const region = request.city ?? request.region;
  const toCheck = candidates.slice(0, maxChecks);

  // Verifica em lotes paralelos (mais rápido que um-a-um), sem disparar todas as
  // requisições de uma vez para não bater rate limit da Places API.
  const batchSize = Math.max(1, parseIntegerEnv("SEM_GMN_BATCH_SIZE", 8));
  const results: ProspectSearchResult[] = [];
  let hasGmnCount = 0;
  let unknownCount = 0;

  for (let i = 0; i < toCheck.length; i += batchSize) {
    const batch = toCheck.slice(i, i + batchSize);
    const detections = await Promise.all(
      batch.map(async (candidate) => ({
        candidate,
        detection: await detectGmnPresence(candidate.name, region),
      }))
    );

    for (const { candidate, detection } of detections) {
      if (detection.presence === "has") {
        hasGmnCount += 1;
      } else if (detection.presence === "unknown") {
        unknownCount += 1;
      } else {
        // presence === "absent": negócio sem GMN → lead do Funil B
        results.push(buildSemGmnLead(candidate, request, region, results.length));
      }
    }
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
