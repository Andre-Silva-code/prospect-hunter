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

const dataDirectory = path.join(process.cwd(), "data");
const leadsFilePath = path.join(dataDirectory, "leads.json");

export async function listLeads(userId: string): Promise<LeadRecord[]> {
  return getLeadStorage().listLeads(userId);
}

export async function createLead(userId: string, lead: LeadRecord): Promise<LeadRecord> {
  return getLeadStorage().createLead(userId, lead);
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
    createLead: async (_userId, lead) => {
      const leads = await listFileLeads();
      const nextLeads = [lead, ...leads];
      await persistFileLeads(nextLeads);
      return lead;
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
    createLead: async (_userId, lead) => {
      await fetch(`${supabaseUrl}/rest/v1/leads`, {
        method: "POST",
        headers: {
          ...baseHeaders,
          Prefer: "return=representation",
        },
        body: JSON.stringify(lead),
      });

      return lead;
    },
    listLeads: async (userId) => {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/leads?select=*&userId=eq.${encodeURIComponent(userId)}`,
        {
          headers: baseHeaders,
          cache: "no-store",
        }
      );
      const payload = (await response.json()) as unknown;

      if (!Array.isArray(payload)) {
        return [];
      }

      return payload.filter(isLeadRecord);
    },
    updateLeadRecord: async (userId, leadId, updates) => {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/leads?id=eq.${leadId}&userId=eq.${encodeURIComponent(userId)}`,
        {
          method: "PATCH",
          headers: {
            ...baseHeaders,
            Prefer: "return=representation",
          },
          body: JSON.stringify(updates),
        }
      );
      const payload = (await response.json()) as unknown;

      if (!Array.isArray(payload) || payload.length === 0) {
        return null;
      }

      const [updatedLead] = payload;
      return isLeadRecord(updatedLead) ? updatedLead : null;
    },
  };
}

async function listFileLeads(): Promise<LeadRecord[]> {
  try {
    const raw = await readFile(leadsFilePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isLeadRecord);
  } catch {
    return [];
  }
}

async function persistFileLeads(leads: LeadRecord[]): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(leadsFilePath, JSON.stringify(leads, null, 2));
}

function isLeadRecord(value: unknown): value is LeadRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === "string" &&
    typeof record.userId === "string" &&
    typeof record.company === "string" &&
    typeof record.niche === "string" &&
    typeof record.region === "string" &&
    typeof record.monthlyBudget === "string" &&
    typeof record.contact === "string" &&
    typeof record.trigger === "string" &&
    typeof record.stage === "string" &&
    typeof record.score === "number" &&
    typeof record.priority === "string" &&
    typeof record.message === "string" &&
    typeof record.contactStatus === "string" &&
    typeof record.createdAt === "string"
  );
}
