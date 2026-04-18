import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { unlink } from "node:fs/promises";
import path from "node:path";

// Usa file storage local nos testes (sem Supabase)
process.env.USE_LOCAL_STORAGE = "true";

import {
  enqueueOutreach,
  getQueueItemByLeadId,
  getQueueItemsByStatus,
  getDueOutreachItems,
  getFollowUpDueItems,
  updateQueueItem,
  listUserOutreach,
} from "@/lib/outreach-queue";

const queueFilePath = path.join(process.cwd(), "data", "outreach-queue.json");

async function cleanupQueue(): Promise<void> {
  try {
    await unlink(queueFilePath);
  } catch {
    // file may not exist
  }
}

describe("outreach-queue (file storage)", () => {
  beforeEach(async () => {
    await cleanupQueue();
  });

  afterEach(async () => {
    await cleanupQueue();
  });

  it("enqueues a new outreach item", async () => {
    const item = await enqueueOutreach("user-1", "lead-1", "5511987654321");

    expect(item.leadId).toBe("lead-1");
    expect(item.userId).toBe("user-1");
    expect(item.phone).toBe("5511987654321");
    expect(item.status).toBe("pending");
    expect(item.id).toMatch(/^oq-/);
  });

  it("prevents duplicate enqueue for the same lead", async () => {
    const first = await enqueueOutreach("user-1", "lead-1", "5511987654321");
    const second = await enqueueOutreach("user-1", "lead-1", "5511987654321");

    expect(second.id).toBe(first.id);
  });

  it("retrieves item by lead ID", async () => {
    await enqueueOutreach("user-1", "lead-abc", "5511999990000");

    const found = await getQueueItemByLeadId("lead-abc");
    expect(found).not.toBeNull();
    expect(found!.phone).toBe("5511999990000");
  });

  it("returns null for unknown lead ID", async () => {
    const found = await getQueueItemByLeadId("nonexistent");
    expect(found).toBeNull();
  });

  it("filters by user and status", async () => {
    const item = await enqueueOutreach("user-1", "lead-1", "5511987654321");
    await updateQueueItem(item.id, { status: "scheduled" });

    const pending = await getQueueItemsByStatus("user-1", "pending");
    const scheduled = await getQueueItemsByStatus("user-1", "scheduled");

    expect(pending).toHaveLength(0);
    expect(scheduled).toHaveLength(1);
  });

  it("getDueOutreachItems returns items past scheduled time", async () => {
    const item = await enqueueOutreach("user-1", "lead-1", "5511987654321");
    const pastTime = new Date(Date.now() - 60000).toISOString();
    await updateQueueItem(item.id, { status: "scheduled", scheduledAt: pastTime });

    const due = await getDueOutreachItems();
    expect(due).toHaveLength(1);
    expect(due[0].leadId).toBe("lead-1");
  });

  it("getDueOutreachItems excludes items not yet due", async () => {
    const item = await enqueueOutreach("user-1", "lead-2", "5511987654321");
    const futureTime = new Date(Date.now() + 3600000).toISOString();
    await updateQueueItem(item.id, { status: "scheduled", scheduledAt: futureTime });

    const due = await getDueOutreachItems();
    expect(due).toHaveLength(0);
  });

  it("updates queue item fields", async () => {
    const item = await enqueueOutreach("user-1", "lead-1", "5511987654321");

    const updated = await updateQueueItem(item.id, {
      status: "phone_verified",
      whatsappJid: "5511987654321@s.whatsapp.net",
    });

    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("phone_verified");
    expect(updated!.whatsappJid).toBe("5511987654321@s.whatsapp.net");
    expect(updated!.updatedAt).toBeDefined();
  });

  it("returns null when updating nonexistent item", async () => {
    const result = await updateQueueItem("nonexistent", { status: "failed" });
    expect(result).toBeNull();
  });

  it("lists all outreach items for a user", async () => {
    await enqueueOutreach("user-1", "lead-a", "5511111111111");
    await enqueueOutreach("user-1", "lead-b", "5522222222222");
    await enqueueOutreach("user-2", "lead-c", "5533333333333");

    const user1Items = await listUserOutreach("user-1");
    const user2Items = await listUserOutreach("user-2");

    expect(user1Items).toHaveLength(2);
    expect(user2Items).toHaveLength(1);
  });

  it("getFollowUpDueItems returns items older than N days", async () => {
    const item = await enqueueOutreach("user-1", "lead-1", "5511987654321");
    // Simular que foi enviado há 4 dias
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
    await updateQueueItem(item.id, {
      status: "sent",
      sentAt: fourDaysAgo,
      updatedAt: fourDaysAgo,
    });

    const due = await getFollowUpDueItems("sent", 3);
    expect(due).toHaveLength(1);
  });

  it("getFollowUpDueItems excludes items that are too recent", async () => {
    const item = await enqueueOutreach("user-1", "lead-1", "5511987654321");
    await updateQueueItem(item.id, { status: "sent", sentAt: new Date().toISOString() });

    const due = await getFollowUpDueItems("sent", 3);
    expect(due).toHaveLength(0);
  });
});
