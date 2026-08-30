import { notifyOwner } from "@/lib/outreach-orchestrator";
import { logger } from "@/lib/logger";

/**
 * Controle central de disponibilidade do Apify.
 *
 * O Apify é opcional e pode ser desligado (ex.: para economizar, quando a conta
 * está sem créditos e retorna 402). Quando desativado, todos os conectores que
 * dependem dele devem pular silenciosamente, sem gerar erros nos logs.
 *
 * Regras:
 *  - Se APIFY_ENABLED="false" → desativado (independente de ter token).
 *  - Senão, ativo somente se houver APIFY_TOKEN.
 */
export function isApifyEnabled(): boolean {
  if (process.env.APIFY_ENABLED === "false") return false;
  return (process.env.APIFY_TOKEN ?? "").length > 0;
}

/**
 * Estado em memória para não spammar o dono com alertas de crédito baixo.
 * Guarda o timestamp do último alerta enviado (cooldown de 1h), no mesmo padrão
 * do alerta de desconexão do WhatsApp.
 */
let lastCreditAlertAt = 0;
const CREDIT_ALERT_COOLDOWN_MS = 60 * 60 * 1000; // 1h

/**
 * Consulta o crédito restante da conta Apify e alerta o dono via WhatsApp quando
 * ele fica abaixo do limiar. Importante porque as Camadas 3 e 4 do enriquecimento
 * de WhatsApp dependem do Apify: quando o crédito acaba (a API retorna 402), essas
 * camadas passam a pular silenciosamente e a busca perde cobertura sem erro visível.
 *
 * - Limiar configurável via APIFY_CREDIT_ALERT_THRESHOLD_USD (default: US$ 1).
 * - Falha graciosamente: qualquer erro de rede/parse apenas loga e retorna, sem
 *   interromper o fluxo que a chamou.
 * - Respeita cooldown de 1h para não repetir o alerta a cada lead processado.
 */
export async function checkApifyCredit(): Promise<void> {
  if (!isApifyEnabled()) return;

  const token = process.env.APIFY_TOKEN ?? "";
  const base = process.env.APIFY_API_BASE_URL ?? "https://api.apify.com";
  const threshold = parseFloatEnv("APIFY_CREDIT_ALERT_THRESHOLD_USD", 1);

  try {
    const response = await fetch(`${base}/v2/users/me/limits?token=${token}`, {
      cache: "no-store",
    });
    if (!response.ok) return;

    const payload = (await response.json()) as {
      data?: {
        current?: { monthlyUsageUsd?: number };
        limits?: { maxMonthlyUsageUsd?: number };
      };
    };

    const used = payload.data?.current?.monthlyUsageUsd;
    const max = payload.data?.limits?.maxMonthlyUsageUsd;
    if (typeof used !== "number" || typeof max !== "number") return;

    const remaining = max - used;
    if (remaining > threshold) return;

    logger.warn("Crédito Apify baixo", { used, max, remaining, threshold });

    const now = Date.now();
    if (now - lastCreditAlertAt < CREDIT_ALERT_COOLDOWN_MS) return;
    lastCreditAlertAt = now;

    await notifyOwner(
      `🟡 Crédito Apify baixo — restam US$ ${remaining.toFixed(2)} de US$ ${max.toFixed(2)}.\n\n` +
        `As Camadas 3 (Google) e 4 (Instagram) da busca de WhatsApp dependem do Apify. ` +
        `Quando o crédito acabar, elas param de rodar silenciosamente e a busca perde cobertura.\n\n` +
        `Recarregue ou faça upgrade do plano no painel da Apify para manter a busca completa.`
    );
  } catch (error) {
    // Falha graciosa: monitoração nunca deve quebrar o fluxo principal.
    logger.warn("Falha ao verificar crédito Apify", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

function parseFloatEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}
