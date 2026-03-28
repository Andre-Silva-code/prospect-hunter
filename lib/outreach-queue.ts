import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { OutreachQueueItem, OutreachStatus } from "@/types/outreach";

type OutreachStorage = {
  enqueue: (item: OutreachQueueItem) => Promise<OutreachQueueItem>;
  getByLeadId: (leadId: string) => Promise<OutreachQueueItem | null>;
  getByStatus: (userId: string, status: OutreachStatus) => Promise<OutreachQueueItem[]>;
  getDueItems: () => Promise<OutreachQueueItem[]>;
  getFollowUpDue: (afterStatus: OutreachStatus, daysOld: number) => Promise<OutreachQueueItem[]>;
  update: (id: string, updates: Partial<OutreachQueueItem>) => Promise<OutreachQueueItem | null>;
  listByUser: (userId: string) => Promise<OutreachQueueItem[]>;
};

type SupabaseOutreachRow = {
  id: string;
  lead_id: string;
  user_id: string;
  phone: string;
  whatsapp_jid: string | null;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  message_id: string | null;
  pdf_generated: boolean;
  attempt_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

const dataDirectory = path.join(process.cwd(), "data");
const queueFilePath = path.join(dataDirectory, "outreach-queue.json");

// --- Public API ---

export async function enqueueOutreach(
  userId: string,
  leadId: string,
  phone: string
): Promise<OutreachQueueItem> {
  const existing = await getStorage().getByLeadId(leadId);
  if (existing) return existing;

  const now = new Date().toISOString();
  const item: OutreachQueueItem = {
    id: `oq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    leadId,
    userId,
    phone,
    whatsappJid: null,
    status: "pending",
    scheduledAt: null,
    sentAt: null,
    messageId: null,
    pdfGenerated: false,
    attemptCount: 0,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  };

  return getStorage().enqueue(item);
}

export async function getQueueItemByLeadId(leadId: string): Promise<OutreachQueueItem | null> {
  return getStorage().getByLeadId(leadId);
}

export async function getQueueItemsByStatus(
  userId: string,
  status: OutreachStatus
): Promise<OutreachQueueItem[]> {
  return getStorage().getByStatus(userId, status);
}

export async function getDueOutreachItems(): Promise<OutreachQueueItem[]> {
  return getStorage().getDueItems();
}

export async function getFollowUpDueItems(
  afterStatus: OutreachStatus,
  daysOld: number
): Promise<OutreachQueueItem[]> {
  return getStorage().getFollowUpDue(afterStatus, daysOld);
}

export async function updateQueueItem(
  id: string,
  updates: Partial<OutreachQueueItem>
): Promise<OutreachQueueItem | null> {
  const merged = { ...updates };
  if (!merged.updatedAt) {
    merged.updatedAt = new Date().toISOString();
  }
  return getStorage().update(id, merged);
}

export async function listUserOutreach(userId: string): Promise<OutreachQueueItem[]> {
  return getStorage().listByUser(userId);
}

// --- Storage selection ---

function getStorage(): OutreachStorage {
  if (process.env.LEADS_STORAGE_PROVIDER === "supabase" && canUseSupabase()) {
    return createSupabaseStorage();
  }
  return createFileStorage();
}

function canUseSupabase(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

// --- File storage ---

function createFileStorage(): OutreachStorage {
  return {
    enqueue: async (item) => {
      const items = await readFileQueue();
      items.push(item);
      await persistFileQueue(items);
      return item;
    },

    getByLeadId: async (leadId) => {
      const items = await readFileQueue();
      return items.find((i) => i.leadId === leadId) ?? null;
    },

    getByStatus: async (userId, status) => {
      const items = await readFileQueue();
      return items.filter((i) => i.userId === userId && i.status === status);
    },

    getDueItems: async () => {
      const now = new Date().toISOString();
      const items = await readFileQueue();
      return items.filter(
        (i) => i.status === "scheduled" && i.scheduledAt !== null && i.scheduledAt <= now
      );
    },

    getFollowUpDue: async (afterStatus, daysOld) => {
      const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
      const items = await readFileQueue();
      return items.filter((i) => i.status === afterStatus && i.updatedAt <= cutoff);
    },

    update: async (id, updates) => {
      const items = await readFileQueue();
      const index = items.findIndex((i) => i.id === id);
      if (index === -1) return null;

      const updated = { ...items[index], ...updates, id: items[index].id };
      items[index] = updated;
      await persistFileQueue(items);
      return updated;
    },

    listByUser: async (userId) => {
      const items = await readFileQueue();
      return items.filter((i) => i.userId === userId);
    },
  };
}

async function readFileQueue(): Promise<OutreachQueueItem[]> {
  try {
    const raw = await readFile(queueFilePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isOutreachQueueItem);
  } catch {
    return [];
  }
}

async function persistFileQueue(items: OutreachQueueItem[]): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(queueFilePath, JSON.stringify(items, null, 2));
}

function isOutreachQueueItem(value: unknown): value is OutreachQueueItem {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.leadId === "string" &&
    typeof record.userId === "string" &&
    typeof record.phone === "string" &&
    typeof record.status === "string"
  );
}

// --- Supabase storage ---

function createSupabaseStorage(): OutreachStorage {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
  const baseHeaders = {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
    "Content-Type": "application/json",
  };

  return {
    enqueue: async (item) => {
      const response = await fetch(`${supabaseUrl}/rest/v1/outreach_queue`, {
        method: "POST",
        headers: { ...baseHeaders, Prefer: "return=representation" },
        body: JSON.stringify(toSupabaseRow(item)),
      });
      if (!response.ok) throw new Error(`supabase insert failed (${response.status})`);
      const payload = (await response.json()) as unknown[];
      return normalizeRow(payload[0]) ?? item;
    },

    getByLeadId: async (leadId) => {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/outreach_queue?lead_id=eq.${encodeURIComponent(leadId)}&limit=1`,
        { headers: baseHeaders, cache: "no-store" }
      );
      const payload = (await response.json()) as unknown[];
      if (!Array.isArray(payload) || payload.length === 0) return null;
      return normalizeRow(payload[0]);
    },

    getByStatus: async (userId, status) => {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/outreach_queue?user_id=eq.${encodeURIComponent(userId)}&status=eq.${encodeURIComponent(status)}`,
        { headers: baseHeaders, cache: "no-store" }
      );
      const payload = (await response.json()) as unknown[];
      if (!Array.isArray(payload)) return [];
      return payload.map(normalizeRow).filter((i): i is OutreachQueueItem => i !== null);
    },

    getDueItems: async () => {
      const now = new Date().toISOString();
      const response = await fetch(
        `${supabaseUrl}/rest/v1/outreach_queue?status=eq.scheduled&scheduled_at=lte.${encodeURIComponent(now)}`,
        { headers: baseHeaders, cache: "no-store" }
      );
      const payload = (await response.json()) as unknown[];
      if (!Array.isArray(payload)) return [];
      return payload.map(normalizeRow).filter((i): i is OutreachQueueItem => i !== null);
    },

    getFollowUpDue: async (afterStatus, daysOld) => {
      const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
      const response = await fetch(
        `${supabaseUrl}/rest/v1/outreach_queue?status=eq.${encodeURIComponent(afterStatus)}&updated_at=lte.${encodeURIComponent(cutoff)}`,
        { headers: baseHeaders, cache: "no-store" }
      );
      const payload = (await response.json()) as unknown[];
      if (!Array.isArray(payload)) return [];
      return payload.map(normalizeRow).filter((i): i is OutreachQueueItem => i !== null);
    },

    update: async (id, updates) => {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/outreach_queue?id=eq.${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: { ...baseHeaders, Prefer: "return=representation" },
          body: JSON.stringify(toSupabasePatch(updates)),
        }
      );
      if (!response.ok) return null;
      const payload = (await response.json()) as unknown[];
      if (!Array.isArray(payload) || payload.length === 0) return null;
      return normalizeRow(payload[0]);
    },

    listByUser: async (userId) => {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/outreach_queue?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc`,
        { headers: baseHeaders, cache: "no-store" }
      );
      const payload = (await response.json()) as unknown[];
      if (!Array.isArray(payload)) return [];
      return payload.map(normalizeRow).filter((i): i is OutreachQueueItem => i !== null);
    },
  };
}

function toSupabaseRow(item: OutreachQueueItem): SupabaseOutreachRow {
  return {
    id: item.id,
    lead_id: item.leadId,
    user_id: item.userId,
    phone: item.phone,
    whatsapp_jid: item.whatsappJid,
    status: item.status,
    scheduled_at: item.scheduledAt,
    sent_at: item.sentAt,
    message_id: item.messageId,
    pdf_generated: item.pdfGenerated,
    attempt_count: item.attemptCount,
    last_error: item.lastError,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

function toSupabasePatch(updates: Partial<OutreachQueueItem>): Partial<SupabaseOutreachRow> {
  const patch: Partial<SupabaseOutreachRow> = {};
  if (updates.whatsappJid !== undefined) patch.whatsapp_jid = updates.whatsappJid;
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.scheduledAt !== undefined) patch.scheduled_at = updates.scheduledAt;
  if (updates.sentAt !== undefined) patch.sent_at = updates.sentAt;
  if (updates.messageId !== undefined) patch.message_id = updates.messageId;
  if (updates.pdfGenerated !== undefined) patch.pdf_generated = updates.pdfGenerated;
  if (updates.attemptCount !== undefined) patch.attempt_count = updates.attemptCount;
  if (updates.lastError !== undefined) patch.last_error = updates.lastError;
  if (updates.updatedAt !== undefined) patch.updated_at = updates.updatedAt;
  return patch;
}

function normalizeRow(value: unknown): OutreachQueueItem | null {
  if (!value || typeof value !== "object") return null;
  const r = value as Record<string, unknown>;

  const id = str(r, "id");
  const leadId = str(r, "lead_id", "leadId");
  const userId = str(r, "user_id", "userId");
  const phone = str(r, "phone");
  const status = str(r, "status");

  if (!id || !leadId || !userId || !phone || !status) return null;

  return {
    id,
    leadId,
    userId,
    phone,
    whatsappJid: nullStr(r, "whatsapp_jid", "whatsappJid"),
    status: status as OutreachStatus,
    scheduledAt: nullStr(r, "scheduled_at", "scheduledAt"),
    sentAt: nullStr(r, "sent_at", "sentAt"),
    messageId: nullStr(r, "message_id", "messageId"),
    pdfGenerated: r.pdf_generated === true || r.pdfGenerated === true,
    attemptCount: num(r, "attempt_count", "attemptCount") ?? 0,
    lastError: nullStr(r, "last_error", "lastError"),
    createdAt: str(r, "created_at", "createdAt") ?? new Date().toISOString(),
    updatedAt: str(r, "updated_at", "updatedAt") ?? new Date().toISOString(),
  };
}

function str(record: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    if (typeof record[key] === "string") return record[key] as string;
  }
  return null;
}

function nullStr(record: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const v = record[key];
    if (typeof v === "string" || v === null) return v as string | null;
  }
  return null;
}

function num(record: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const v = record[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}
