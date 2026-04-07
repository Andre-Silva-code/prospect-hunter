import { readFile } from "node:fs/promises";
import path from "node:path";

import type { OutreachQueueItem } from "@/types/outreach";

const queueFilePath = path.join(process.cwd(), "data", "outreach-queue.json");

/**
 * Busca um item na fila de outreach pelo JID do WhatsApp.
 * Retorna o primeiro item com status "sent", "follow_up_1" ou "follow_up_2".
 */
export async function listAllOutreachItems(whatsappJid: string): Promise<OutreachQueueItem | null> {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    return findByJidSupabase(whatsappJid);
  }
  return findByJidFile(whatsappJid);
}

async function findByJidFile(jid: string): Promise<OutreachQueueItem | null> {
  try {
    const raw = await readFile(queueFilePath, "utf8");
    const items = JSON.parse(raw) as OutreachQueueItem[];
    const activeStatuses = [
      "sent",
      "follow_up_1",
      "follow_up_2",
      "pdf_sent",
      "post_analysis_1",
      "post_analysis_2",
      "consulting_done",
      "post_consulting_1",
      "post_consulting_2",
    ];

    return items.find((i) => i.whatsappJid === jid && activeStatuses.includes(i.status)) ?? null;
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
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/outreach_queue?whatsapp_jid=eq.${encodeURIComponent(jid)}&status=in.(sent,follow_up_1,follow_up_2,pdf_sent,post_analysis_1,post_analysis_2,consulting_done,post_consulting_1,post_consulting_2)&limit=1`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        cache: "no-store",
      }
    );

    const payload = (await response.json()) as OutreachQueueItem[];
    return payload[0] ?? null;
  } catch {
    return null;
  }
}
