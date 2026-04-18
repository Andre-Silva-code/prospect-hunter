import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

// Usa file storage local nos testes (sem Supabase)
process.env.USE_LOCAL_STORAGE = "true";

import { createLead, listLeads, updateLeadRecord } from "@/lib/leads-repository";
import type { LeadRecord } from "@/types/prospecting";

const dataDirectory = path.join(process.cwd(), "data");

function buildLead(id: string): LeadRecord {
  return {
    id,
    userId: "owner",
    company: `Lead ${id}`,
    niche: "Estetica",
    region: "Sao Paulo",
    monthlyBudget: "R$ 10k",
    contact: "@lead",
    trigger: "Anuncio ativo",
    stage: "Novo",
    score: 90,
    priority: "Alta",
    message: "Mensagem inicial",
    contactStatus: "Pendente",
    createdAt: "2026-03-10T00:00:00.000Z",
  };
}

describe("leads repository", () => {
  beforeEach(async () => {
    await mkdir(dataDirectory, { recursive: true });
    await rm(path.join(dataDirectory, "leads.json"), { force: true });
  });

  it("creates and lists leads from server storage", async () => {
    await createLead("owner", buildLead("lead-1"));

    const leads = await listLeads("owner");

    expect(leads).toHaveLength(1);
    expect(leads[0]?.company).toBe("Lead lead-1");
  });

  it("updates an existing lead", async () => {
    await createLead("owner", buildLead("lead-1"));

    const updatedLead = await updateLeadRecord("owner", "lead-1", {
      contactStatus: "Mensagem enviada",
      stage: "Contato",
    });

    expect(updatedLead?.contactStatus).toBe("Mensagem enviada");
    expect(updatedLead?.stage).toBe("Contato");
  });
});
