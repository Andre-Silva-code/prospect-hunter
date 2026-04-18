import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { unlink } from "node:fs/promises";
import path from "node:path";

// Usa file storage local nos testes (sem Supabase)
process.env.USE_LOCAL_STORAGE = "true";

import type { LeadRecord } from "@/types/prospecting";
import type { OutreachQueueItem } from "@/types/outreach";

const queueFilePath = path.join(process.cwd(), "data", "outreach-queue.json");

// Mock do GBP Check capture (evita abrir Chrome nos testes)
vi.mock("@/lib/pdf/gbpcheck-capture", () => {
  return {
    captureGbpCheckReport: () =>
      Promise.resolve({
        success: true,
        pdfBuffer: Buffer.from("%PDF-1.4 mock pdf content"),
        score: 72,
      }),
  };
});

async function cleanup(): Promise<void> {
  try {
    await unlink(queueFilePath);
  } catch {
    /* noop */
  }
}

const sampleLead: LeadRecord = {
  id: "lead-gmn-1",
  userId: "user-1",
  company: "Clinica Aurora",
  niche: "Estetica premium",
  region: "Sao Paulo, SP",
  monthlyBudget: "R$ 10k",
  contact: "+55 11 98765-4321",
  trigger: "Perfil com nota 4.8 e 256 avaliacao(oes) no Google.",
  stage: "Novo",
  score: 82,
  priority: "Alta",
  message: "",
  contactStatus: "Pendente",
  createdAt: "2026-03-28T00:00:00.000Z",
  source: "Google Meu Negócio",
  icp: "Clinicas esteticas premium",
};

describe("outreach-orchestrator", () => {
  const originalEnv = process.env;

  beforeEach(async () => {
    await cleanup();
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      UAZAPI_API_URL: "https://api.uazapi.test",
      UAZAPI_API_TOKEN: "test-token",
      UAZAPI_INSTANCE_ID: "test-instance",
      LEADS_STORAGE_PROVIDER: "file",
    };
  });

  afterEach(async () => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    await cleanup();
  });

  it("initiateGmnOutreach rejects non-GMN leads", async () => {
    const { initiateGmnOutreach } = await import("@/lib/outreach-orchestrator");
    const instagramLead = { ...sampleLead, source: "Instagram" as const };

    const result = await initiateGmnOutreach("user-1", instagramLead);
    expect(result.queued).toBe(false);
    expect(result.reason).toContain("nao e GMN");
  });

  it("initiateGmnOutreach rejects leads without phone", async () => {
    const { initiateGmnOutreach } = await import("@/lib/outreach-orchestrator");
    const noPhoneLead = { ...sampleLead, contact: "https://clinicaaurora.com.br" };

    const result = await initiateGmnOutreach("user-1", noPhoneLead);
    expect(result.queued).toBe(false);
    expect(result.reason).toContain("Telefone invalido");
  });

  it("initiateGmnOutreach rejects when Uazapi is not configured", async () => {
    process.env.UAZAPI_API_URL = "";
    const { initiateGmnOutreach } = await import("@/lib/outreach-orchestrator");

    const result = await initiateGmnOutreach("user-1", sampleLead);
    expect(result.queued).toBe(false);
    expect(result.reason).toContain("nao configurado");
  });

  it("initiateGmnOutreach enqueues valid GMN lead", async () => {
    // Mock fetch para o checkWhatsAppNumber (fire-and-forget)
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ exists: true, jid: "5511987654321@s.whatsapp.net" }),
      })
    );

    const { initiateGmnOutreach } = await import("@/lib/outreach-orchestrator");

    const result = await initiateGmnOutreach("user-1", sampleLead);
    expect(result.queued).toBe(true);
    expect(result.reason).toContain("Enfileirado");
  });

  it("verifyAndSchedule marks phone_invalid when number not on WhatsApp", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ exists: false }),
      })
    );

    const { verifyAndSchedule } = await import("@/lib/outreach-orchestrator");
    const { enqueueOutreach, getQueueItemByLeadId } = await import("@/lib/outreach-queue");

    const item = await enqueueOutreach("user-1", "lead-inv", "5511987654321");
    await verifyAndSchedule(item);

    const updated = await getQueueItemByLeadId("lead-inv");
    expect(updated!.status).toBe("phone_invalid");
  });

  it("verifyAndSchedule sets scheduled status with future time", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [
          { query: "5511987654321", isInWhatsapp: true, jid: "5511987654321@s.whatsapp.net" },
        ],
      })
    );

    const { verifyAndSchedule } = await import("@/lib/outreach-orchestrator");
    const { enqueueOutreach, getQueueItemByLeadId } = await import("@/lib/outreach-queue");

    const item = await enqueueOutreach("user-1", "lead-sch", "5511987654321");
    await verifyAndSchedule(item);

    const updated = await getQueueItemByLeadId("lead-sch");
    expect(updated!.status).toBe("scheduled");
    expect(updated!.whatsappJid).toBe("5511987654321@s.whatsapp.net");
    expect(new Date(updated!.scheduledAt!).getTime()).toBeGreaterThan(Date.now());
  });

  it("processScheduledOutreach sends PDF and marks as sent", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ messageId: "msg-pdf-001", status: "sent" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { processScheduledOutreach } = await import("@/lib/outreach-orchestrator");

    const item: OutreachQueueItem = {
      id: "oq-test-1",
      leadId: sampleLead.id,
      userId: "user-1",
      phone: "5511987654321",
      whatsappJid: "5511987654321@s.whatsapp.net",
      status: "scheduled",
      scheduledAt: new Date(Date.now() - 60000).toISOString(),
      sentAt: null,
      messageId: null,
      pdfGenerated: false,
      attemptCount: 0,
      lastError: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Enqueue para que updateQueueItem encontre o item
    const { enqueueOutreach, getQueueItemByLeadId } = await import("@/lib/outreach-queue");
    await enqueueOutreach("user-1", sampleLead.id, "5511987654321");

    const queueItem = await getQueueItemByLeadId(sampleLead.id);
    const patched = { ...queueItem!, ...item, id: queueItem!.id };

    const result = await processScheduledOutreach(patched, sampleLead);
    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
  });

  it("processScheduledOutreach retries on send failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { processScheduledOutreach } = await import("@/lib/outreach-orchestrator");
    const { enqueueOutreach, getQueueItemByLeadId } = await import("@/lib/outreach-queue");

    await enqueueOutreach("user-1", "lead-fail", "5511987654321");
    const queueItem = await getQueueItemByLeadId("lead-fail");

    const item: OutreachQueueItem = {
      ...queueItem!,
      whatsappJid: "5511987654321@s.whatsapp.net",
      status: "scheduled",
      attemptCount: 0,
    };

    const result = await processScheduledOutreach(item, sampleLead);
    expect(result.success).toBe(false);

    const updated = await getQueueItemByLeadId("lead-fail");
    expect(updated!.attemptCount).toBe(1);
    expect(updated!.status).toBe("scheduled"); // Reagendado, não falhou
  });

  it("processFollowUp sends text message for step 1", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ messageId: "msg-fu-001", status: "sent" }),
      })
    );

    const { processFollowUp } = await import("@/lib/outreach-orchestrator");
    const { enqueueOutreach, getQueueItemByLeadId } = await import("@/lib/outreach-queue");

    await enqueueOutreach("user-1", "lead-fu", "5511987654321");
    const queueItem = await getQueueItemByLeadId("lead-fu");

    const item: OutreachQueueItem = {
      ...queueItem!,
      whatsappJid: "5511987654321@s.whatsapp.net",
      status: "sent",
    };

    const result = await processFollowUp(item, sampleLead, 1);
    expect(result.success).toBe(true);

    const updated = await getQueueItemByLeadId("lead-fu");
    expect(updated!.status).toBe("follow_up_1");
  });

  it("markAsReplied updates status to replied", async () => {
    const { markAsReplied } = await import("@/lib/outreach-orchestrator");
    const { enqueueOutreach, getQueueItemByLeadId } = await import("@/lib/outreach-queue");

    await enqueueOutreach("user-1", "lead-reply", "5511987654321");
    const item = await getQueueItemByLeadId("lead-reply");

    await markAsReplied(item!);

    const updated = await getQueueItemByLeadId("lead-reply");
    expect(updated!.status).toBe("replied");
  });
});

// --- Message tests ---

describe("WhatsApp message templates", () => {
  it("generateGmnWhatsAppMessage includes company and region", async () => {
    const { generateGmnWhatsAppMessage } = await import("@/lib/outreach-message");
    const msg = generateGmnWhatsAppMessage({
      company: "Clinica Aurora",
      region: "Sao Paulo, SP",
    });

    expect(msg).toContain("Clinica Aurora");
    expect(msg).toContain("Sao Paulo, SP");
    expect(msg).toContain("gratuito");
    expect(msg).toContain("SIM");
  });

  it("generateGmnFollowUpMessage step 1", async () => {
    const { generateGmnFollowUpMessage } = await import("@/lib/outreach-message");
    const msg = generateGmnFollowUpMessage({ company: "Clinica Aurora" }, 1);

    expect(msg).toContain("Clinica Aurora");
    expect(msg).toContain("ha alguns dias");
  });

  it("generateGmnFollowUpMessage step 2", async () => {
    const { generateGmnFollowUpMessage } = await import("@/lib/outreach-message");
    const msg = generateGmnFollowUpMessage({ company: "Clinica Aurora" }, 2);

    expect(msg).toContain("Clinica Aurora");
    expect(msg).toContain("ainda esta disponivel");
  });
});
