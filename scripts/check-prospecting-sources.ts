import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { LeadSource } from "../types/prospecting";
import type { ProspectSearchRequest } from "../lib/prospecting-connectors";
import { searchProspects } from "../lib/prospecting-connectors";

const projectRoot = resolve(fileURLToPath(import.meta.url), "../");
const envPath = resolve(projectRoot, ".env.local");

autoLoadEnv();

async function main() {
  const sources: LeadSource[] = ["Instagram", "LinkedIn", "Google Maps", "Google Meu Negócio"];

  const request: ProspectSearchRequest = {
    icp: "Clínicas de bem-estar premium",
    niche: "Estética",
    region: "São Paulo",
    sources,
    limitPerSource: 5,
  };

  console.log("Validando conectores de prospecção real...");
  console.log(
    `fontes: ${request.sources.join(", ")} | limite por fonte: ${request.limitPerSource}`
  );
  const timerStart = Date.now();

  try {
    const result = await searchProspects(request);
    const duration = Date.now() - timerStart;
    console.log(`→ requisição concluída em ${duration}ms  (${result.results.length} lead(s))`);
    console.table(
      request.sources.map((source: LeadSource) => ({
        fonte: source,
        status: result.connectorStatus[source] ?? "sem status",
        leads: result.results.filter((lead) => lead.source === source).length,
      }))
    );

    if (result.results.length === 0) {
      console.warn(
        "Nenhum lead retornado por nenhum conector. Verifique os logs abaixo e o .env.local."
      );
    }
  } catch (error) {
    console.error("Falha ao validar os conectores:", error);
    process.exit(1);
  }
}

function autoLoadEnv() {
  let raw: string;
  try {
    raw = readFileSync(envPath, "utf8");
  } catch (error) {
    console.warn(
      `.env.local não encontrado em ${envPath}; usando variáveis já definidas no ambiente.`
    );
    return;
  }

  for (const line of raw.split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalsPos = trimmed.indexOf("=");
    if (equalsPos === -1) continue;

    const key = trimmed.slice(0, equalsPos).trim();
    const value = trimmed.slice(equalsPos + 1).trim();

    if (key && value && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

await main();
