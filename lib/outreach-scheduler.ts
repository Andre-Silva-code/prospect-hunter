import { logger } from "@/lib/logger";

/**
 * Agendador interno de outreach.
 *
 * Substitui a necessidade de um cron externo (Vercel/EasyPanel): roda dentro do
 * próprio processo Node do Next.js e dispara periodicamente os endpoints de
 * outreach via HTTP local (reutilizando 100% da lógica já existente nas rotas).
 *
 * É iniciado uma única vez no boot do servidor, via instrumentation.ts.
 *
 * Controlado por env vars:
 *  - OUTREACH_SCHEDULER_ENABLED: "true" para ativar (default: ativo em produção).
 *  - OUTREACH_CRON_SECRET: usado para autenticar as chamadas locais.
 *  - PORT: porta local do servidor (default 3000).
 */

const PROCESS_INTERVAL_MS = 2 * 60 * 1000; // 2 min
const ENRICH_INTERVAL_MS = 30 * 60 * 1000; // 30 min
const FOLLOWUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h (o endpoint já filtra o que está devido)

// Guard de módulo: garante que o agendador só suba uma vez por processo,
// mesmo que instrumentation seja avaliado mais de uma vez.
let started = false;

function getBaseUrl(): string {
  const port = process.env.PORT ?? "3000";
  return `http://127.0.0.1:${port}`;
}

/**
 * Dispara um endpoint de outreach local. Falhas são logadas mas nunca
 * derrubam o agendador — o próximo ciclo tenta de novo.
 */
async function trigger(path: string): Promise<void> {
  const secret = process.env.OUTREACH_CRON_SECRET;
  if (!secret) {
    logger.warn("[scheduler] OUTREACH_CRON_SECRET ausente — pulando disparo", { path });
    return;
  }

  try {
    const res = await fetch(`${getBaseUrl()}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    if (!res.ok) {
      logger.warn("[scheduler] disparo retornou status não-ok", { path, status: res.status });
      return;
    }
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    logger.info("[scheduler] disparo concluído", { path, ...data });
  } catch (error) {
    logger.warn("[scheduler] falha ao disparar", {
      path,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

/**
 * Cria um loop com setInterval que evita sobreposição: se um ciclo ainda está
 * rodando quando o próximo tick chega, o novo tick é pulado.
 */
function scheduleLoop(path: string, intervalMs: number): void {
  let running = false;
  const run = async () => {
    if (running) {
      logger.info("[scheduler] ciclo anterior ainda em execução — pulando", { path });
      return;
    }
    running = true;
    try {
      await trigger(path);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => void run(), intervalMs);
  // Não impede o processo de encerrar (bom para graceful shutdown)
  if (typeof timer.unref === "function") timer.unref();
}

/**
 * Inicia o agendador interno. Idempotente: chamadas repetidas são ignoradas.
 */
export function startOutreachScheduler(): void {
  if (started) return;

  const explicitlyDisabled = process.env.OUTREACH_SCHEDULER_ENABLED === "false";
  const explicitlyEnabled = process.env.OUTREACH_SCHEDULER_ENABLED === "true";
  // Por padrão, roda em produção. Em dev, só roda se explicitamente habilitado.
  const isProd = process.env.NODE_ENV === "production";
  const shouldRun = explicitlyEnabled || (isProd && !explicitlyDisabled);

  if (!shouldRun) {
    logger.info("[scheduler] desativado neste ambiente", {
      nodeEnv: process.env.NODE_ENV,
      OUTREACH_SCHEDULER_ENABLED: process.env.OUTREACH_SCHEDULER_ENABLED ?? "(não definido)",
    });
    return;
  }

  started = true;
  logger.info("[scheduler] iniciando agendador interno de outreach", {
    processIntervalMin: PROCESS_INTERVAL_MS / 60000,
    enrichIntervalMin: ENRICH_INTERVAL_MS / 60000,
    followUpIntervalMin: FOLLOWUP_INTERVAL_MS / 60000,
  });

  // Pequeno atraso inicial para o servidor terminar de subir antes do 1º disparo.
  setTimeout(() => {
    scheduleLoop("/api/outreach/process", PROCESS_INTERVAL_MS);
    scheduleLoop("/api/outreach/enrich-phones", ENRICH_INTERVAL_MS);
    scheduleLoop("/api/outreach/follow-up", FOLLOWUP_INTERVAL_MS);
  }, 15_000);
}
