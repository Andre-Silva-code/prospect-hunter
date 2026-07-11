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
