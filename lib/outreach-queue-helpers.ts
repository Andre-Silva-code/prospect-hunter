import { readFile } from "node:fs/promises";
import path from "node:path";

import type { OutreachQueueItem } from "@/types/outreach";
import { getSupabaseUrl, getSupabaseAnonKey } from "@/lib/leads-repository";

const queueFilePath = path.join(process.cwd(), "data", "outreach-queue.json");

// Todos os statuses em que o lead ainda pode responder e o webhook deve reagir
const ACTIVE_STATUSES = [
  "sent",
  "follow_up_1",
  "follow_up_2",
  "awaiting_qualification", // lead demorou para responder à pergunta de qualificação
  "pdf_sent",
  "post_analysis_1",
  "post_analysis_2",
  "consulting_done",
  "post_consulting_1",
  "post_consulting_2",
];

/**
 * Busca um item na fila de outreach pelo JID do WhatsApp.
 * Inclui "awaiting_qualification" para capturar respostas tardias à pergunta de qualificação.
 */
/**
 * Extrai os dígitos "de telefone" de um JID do WhatsApp. Para o formato padrão
 * (5511999998888@s.whatsapp.net) retorna os dígitos do número. Para o formato
 * @lid (144770546561049@lid) os dígitos NÃO são o telefone, então devolve "".
 */
export function phoneDigitsFromJid(jid: string | null | undefined): string {
  if (!jid) return "";
  if (/@lid$/i.test(jid)) return ""; // lid não é telefone
  const digits = jid.split("@")[0].replace(/\D/g, "");
  return digits;
}

/**
 * Compara dois números de telefone de forma tolerante ao 9º dígito de celular
 * brasileiro e a variações de formato. Ex.: 5511988887777 ≈ 551188887777.
 */
export function phonesMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  // Compara os últimos 8 dígitos (assinante), que são estáveis independente de
  // DDI/DDD/9º dígito — reduz falsos negativos sem colidir na prática.
  const tailA = a.slice(-8);
  const tailB = b.slice(-8);
  return tailA.length === 8 && tailA === tailB;
}

export async function listAllOutreachItems(whatsappJid: string): Promise<OutreachQueueItem | null> {
  if (getSupabaseUrl() && getSupabaseAnonKey()) {
    return findByJidSupabase(whatsappJid);
  }
  return findByJidFile(whatsappJid);
}

/**
 * Casa um item da fila com o remetente da resposta. Tenta, em ordem:
 *  1) JID idêntico ao salvo;
 *  2) telefone do remetente (dígitos do JID) ≈ campo `phone` do item.
 * Isso tolera o WhatsApp entregar o `from` em formato diferente do salvo
 * (ex.: @s.whatsapp.net vs variações do número).
 */
function itemMatchesSender(item: OutreachQueueItem, senderJid: string): boolean {
  if (!ACTIVE_STATUSES.includes(item.status)) return false;
  if (item.whatsappJid && item.whatsappJid === senderJid) return true;

  const senderDigits = phoneDigitsFromJid(senderJid);
  if (senderDigits && item.phone) {
    return phonesMatch(senderDigits, item.phone.replace(/\D/g, ""));
  }
  return false;
}

async function findByJidFile(jid: string): Promise<OutreachQueueItem | null> {
  try {
    const raw = await readFile(queueFilePath, "utf8");
    const items = JSON.parse(raw) as OutreachQueueItem[];
    return items.find((i) => itemMatchesSender(i, jid)) ?? null;
  } catch {
    return null;
  }
}

/**
 * Busca um item na fila de outreach pelo leadId.
 */
export async function getOutreachItemByLeadId(
  userId: string,
  leadId: string
): Promise<OutreachQueueItem | null> {
  try {
    const raw = await readFile(queueFilePath, "utf8");
    const items = JSON.parse(raw) as OutreachQueueItem[];
    return items.find((i) => i.userId === userId && i.leadId === leadId) ?? null;
  } catch {
    return null;
  }
}

async function findByJidSupabase(jid: string): Promise<OutreachQueueItem | null> {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const statusList = ACTIVE_STATUSES.join(",");
  const headers = {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${serviceRoleKey ?? supabaseAnonKey}`,
  };

  try {
    // 1) Tentativa rápida: JID idêntico ao salvo.
    const exact = await fetch(
      `${supabaseUrl}/rest/v1/outreach_queue?whatsapp_jid=eq.${encodeURIComponent(jid)}&status=in.(${statusList})&limit=1`,
      { headers, cache: "no-store" }
    );
    if (exact.ok) {
      const rows = (await exact.json()) as OutreachQueueItem[];
      if (rows[0]) return rows[0];
    }

    // 2) Fallback: casa pelo telefone do remetente (tolera formatos de JID
    //    diferentes do salvo, ex.: variações de número). Busca os itens ativos
    //    e compara em memória.
    const senderDigits = phoneDigitsFromJid(jid);
    if (!senderDigits) return null;

    const active = await fetch(
      `${supabaseUrl}/rest/v1/outreach_queue?status=in.(${statusList})&order=updated_at.desc&limit=200`,
      { headers, cache: "no-store" }
    );
    if (!active.ok) return null;

    const rows = (await active.json()) as Array<Record<string, unknown>>;
    const match = rows.find((r) => {
      const phone = String(r.phone ?? "").replace(/\D/g, "");
      return phonesMatch(senderDigits, phone);
    });
    return (match as OutreachQueueItem | undefined) ?? null;
  } catch {
    return null;
  }
}
