/**
 * Hook de instrumentação do Next.js — executado uma vez quando o servidor sobe.
 * Usamos para iniciar o agendador interno de outreach (substitui o cron externo).
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register(): Promise<void> {
  // Só roda no runtime Node.js (nunca no Edge), pois usa timers/fetch de longa duração.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startOutreachScheduler } = await import("@/lib/outreach-scheduler");
    startOutreachScheduler();
  }
}
