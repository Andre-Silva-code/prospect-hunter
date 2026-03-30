import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { LeadRecord } from "@/types/prospecting";

type LeadStorage = {
  createLead: (userId: string, lead: LeadRecord) => Promise<LeadRecord>;
  listLeads: (userId: string) => Promise<LeadRecord[]>;
  updateLeadRecord: (
    userId: string,
    leadId: string,
    updates: Partial<LeadRecord>
  ) => Promise<LeadRecord | null>;
};

type SupabaseLeadRow = {
  id: string;
  user_id: string;
  company: string;
  niche: string;
  region: string;
  monthly_budget: string;
  contact: string;
  trigger: string;
  stage: string;
  score: number;
  priority: string;
  message: string;
  contact_status: string;
  created_at: string;
  source?: string | null;
  icp?: string | null;
  follow_up_interval_days?: number | null;
  follow_up_step?: number | null;
  next_follow_up_at?: string | null;
  last_contact_at?: string | null;
};

const dataDirectory = path.join(process.cwd(), "data");
const leadsFilePath = path.join(dataDirectory, "leads.json");

export async function listLeads(userId: string): Promise<LeadRecord[]> {
  return getLeadStorage().listLeads(userId);
}

export async function createLead(userId: string, lead: LeadRecord): Promise<LeadRecord> {
  return getLeadStorage().createLead(userId, lead);
}

export async function getLeadById(userId: string, leadId: string): Promise<LeadRecord | null> {
  const leads = await listLeads(userId);
  return leads.find((l) => l.id === leadId) ?? null;
}

export async function updateLeadRecord(
  userId: string,
  leadId: string,
  updates: Partial<LeadRecord>
): Promise<LeadRecord | null> {
  return getLeadStorage().updateLeadRecord(userId, leadId, updates);
}

function getLeadStorage(): LeadStorage {
  if (process.env.LEADS_STORAGE_PROVIDER === "supabase" && canUseSupabaseStorage()) {
    return createSupabaseStorage();
  }

  return createFileStorage();
}

function canUseSupabaseStorage(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

function createFileStorage(): LeadStorage {
  return {
    createLead: async (userId, lead) => {
      const leads = await listFileLeads();
      const nextLead = { ...lead, userId };
      const nextLeads = [nextLead, ...leads];
      await persistFileLeads(nextLeads);
      return nextLead;
    },
    listLeads: async (userId) => {
      const leads = await listFileLeads();
      return leads.filter((lead) => lead.userId === userId);
    },
    updateLeadRecord: async (userId, leadId, updates) => {
      const leads = await listFileLeads();
      const leadIndex = leads.findIndex((lead) => lead.id === leadId && lead.userId === userId);

      if (leadIndex === -1) {
        return null;
      }

      const nextLead = {
        ...leads[leadIndex],
        ...updates,
        id: leads[leadIndex].id,
        userId: leads[leadIndex].userId,
      };

      if (!isLeadRecord(nextLead)) {
        return null;
      }

      leads[leadIndex] = nextLead;
      await persistFileLeads(leads);

      return nextLead;
    },
  };
}

function createSupabaseStorage(): LeadStorage {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
  const baseHeaders = {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
    "Content-Type": "application/json",
  };

  return {
    createLead: async (userId, lead) => {
      const nextLead = { ...lead, userId };
      const response = await fetch(`${supabaseUrl}/rest/v1/leads`, {
        method: "POST",
        headers: {
          ...baseHeaders,
          Prefer: "return=representation",
        },
        body: JSON.stringify(toSupabaseLeadRow(nextLead)),
      });

      if (!response.ok) {
        throw new Error(`supabase insert failed with status ${response.status}`);
      }

      const payload = (await response.json()) as unknown;
      if (!Array.isArray(payload) || payload.length === 0) {
        throw new Error("supabase insert returned empty payload");
      }

      const createdLead = normalizeLeadRecord(payload[0]);
      if (!createdLead) {
        throw new Error("supabase insert returned invalid lead payload");
      }

      return createdLead;
    },
    listLeads: async (userId) => {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/leads?select=id,userId:user_id,company,niche,region,monthlyBudget:monthly_budget,contact,trigger,stage,score,priority,message,contactStatus:contact_status,createdAt:created_at,source,icp,followUpIntervalDays:follow_up_interval_days,followUpStep:follow_up_step,nextFollowUpAt:next_follow_up_at,lastContactAt:last_contact_at&user_id=eq.${encodeURIComponent(userId)}`,
        {
          headers: baseHeaders,
          cache: "no-store",
        }
      );
      const payload = (await response.json()) as unknown;

      if (!Array.isArray(payload)) {
        return [];
      }

      return payload
        .map((item) => normalizeLeadRecord(item))
        .filter((lead): lead is LeadRecord => lead !== null);
    },
    updateLeadRecord: async (userId, leadId, updates) => {
      const updatePayload = toSupabaseLeadPatch(updates);
      const response = await fetch(
        `${supabaseUrl}/rest/v1/leads?id=eq.${encodeURIComponent(leadId)}&user_id=eq.${encodeURIComponent(userId)}`,
        {
          method: "PATCH",
          headers: {
            ...baseHeaders,
            Prefer: "return=representation",
          },
          body: JSON.stringify(updatePayload),
        }
      );

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as unknown;

      if (!Array.isArray(payload) || payload.length === 0) {
        return null;
      }

      const [updatedLead] = payload;
      return normalizeLeadRecord(updatedLead);
    },
  };
}

function toSupabaseLeadRow(lead: LeadRecord): SupabaseLeadRow {
  return {
    id: lead.id,
    user_id: lead.userId,
    company: lead.company,
    niche: lead.niche,
    region: lead.region,
    monthly_budget: lead.monthlyBudget,
    contact: lead.contact,
    trigger: lead.trigger,
    stage: lead.stage,
    score: lead.score,
    priority: lead.priority,
    message: lead.message,
    contact_status: lead.contactStatus,
    created_at: lead.createdAt,
    source: lead.source ?? null,
    icp: lead.icp ?? null,
    follow_up_interval_days: lead.followUpIntervalDays ?? null,
    follow_up_step: lead.followUpStep ?? null,
    next_follow_up_at: lead.nextFollowUpAt ?? null,
    last_contact_at: lead.lastContactAt ?? null,
  };
}

function toSupabaseLeadPatch(updates: Partial<LeadRecord>): Partial<SupabaseLeadRow> {
  const patch: Partial<SupabaseLeadRow> = {};

  if (typeof updates.company === "string") patch.company = updates.company;
  if (typeof updates.niche === "string") patch.niche = updates.niche;
  if (typeof updates.region === "string") patch.region = updates.region;
  if (typeof updates.monthlyBudget === "string") patch.monthly_budget = updates.monthlyBudget;
  if (typeof updates.contact === "string") patch.contact = updates.contact;
  if (typeof updates.trigger === "string") patch.trigger = updates.trigger;
  if (typeof updates.stage === "string") patch.stage = updates.stage;
  if (typeof updates.score === "number") patch.score = updates.score;
  if (typeof updates.priority === "string") patch.priority = updates.priority;
  if (typeof updates.message === "string") patch.message = updates.message;
  if (typeof updates.contactStatus === "string") patch.contact_status = updates.contactStatus;
  if (typeof updates.createdAt === "string") patch.created_at = updates.createdAt;
  if (typeof updates.source === "string") patch.source = updates.source;
  if (typeof updates.icp === "string") patch.icp = updates.icp;
  if (typeof updates.followUpIntervalDays === "number") {
    patch.follow_up_interval_days = updates.followUpIntervalDays;
  }
  if (typeof updates.followUpStep === "number") patch.follow_up_step = updates.followUpStep;
  if (typeof updates.nextFollowUpAt === "string" || updates.nextFollowUpAt === null) {
    patch.next_follow_up_at = updates.nextFollowUpAt;
  }
  if (typeof updates.lastContactAt === "string" || updates.lastContactAt === null) {
    patch.last_contact_at = updates.lastContactAt;
  }

  return patch;
}

async function listFileLeads(): Promise<LeadRecord[]> {
  try {
    const raw = await readFile(leadsFilePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => normalizeLeadRecord(item))
      .filter((lead): lead is LeadRecord => lead !== null);
  } catch {
    return [];
  }
}

async function persistFileLeads(leads: LeadRecord[]): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(leadsFilePath, JSON.stringify(leads, null, 2));
}

function isLeadRecord(value: unknown): value is LeadRecord {
  return normalizeLeadRecord(value) !== null;
}

function normalizeLeadRecord(value: unknown): LeadRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  const id = getString(record, "id");
  const userId = getString(record, "userId", "user_id");
  const company = getString(record, "company");
  const niche = getString(record, "niche");
  const region = getString(record, "region");
  const monthlyBudget = getString(record, "monthlyBudget", "monthly_budget");
  const contact = getString(record, "contact");
  const trigger = getString(record, "trigger");
  const stage = getString(record, "stage");
  const score = getNumber(record, "score");
  const priority = getString(record, "priority");
  const message = getString(record, "message");
  const contactStatus = getString(record, "contactStatus", "contact_status");
  const createdAt = getString(record, "createdAt", "created_at");

  if (
    !id ||
    !userId ||
    !company ||
    !niche ||
    !region ||
    !monthlyBudget ||
    !contact ||
    !trigger ||
    !stage ||
    score === null ||
    !priority ||
    message === null ||
    message === undefined ||
    !contactStatus ||
    !createdAt
  ) {
    return null;
  }

  const source = getString(record, "source") ?? "Instagram";
  const icp = getString(record, "icp") ?? "Clinicas esteticas premium";

  return {
    id,
    userId,
    company,
    niche,
    region,
    monthlyBudget,
    contact,
    trigger,
    stage: stage as LeadRecord["stage"],
    score,
    priority: priority as LeadRecord["priority"],
    message,
    contactStatus: contactStatus as LeadRecord["contactStatus"],
    createdAt,
    source: source as LeadRecord["source"],
    icp: icp as LeadRecord["icp"],
    followUpIntervalDays: getNumber(record, "followUpIntervalDays", "follow_up_interval_days") ?? 2,
    followUpStep: getNumber(record, "followUpStep", "follow_up_step") ?? 0,
    nextFollowUpAt: getNullableString(record, "nextFollowUpAt", "next_follow_up_at"),
    lastContactAt: getNullableString(record, "lastContactAt", "last_contact_at"),
  };
}

function getString(record: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") {
      return value;
    }
  }

  return null;
}

function getNullableString(record: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" || value === null) {
      return value;
    }
  }

  return null;
}

function getNumber(record: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}
