import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth-session";
import { updateQueueItem, listUserOutreach } from "@/lib/outreach-queue";
import { verifyAndSchedule } from "@/lib/outreach-orchestrator";
import { logger } from "@/lib/logger";

export async function POST(request: Request): Promise<NextResponse> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { itemId?: string };
    if (!body.itemId) {
      return NextResponse.json({ error: "itemId required" }, { status: 400 });
    }

    const items = await listUserOutreach(sessionUser.id);
    const item = items.find((i) => i.id === body.itemId);

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (item.status !== "failed" && item.status !== "phone_invalid") {
      return NextResponse.json(
        { error: "Only failed or phone_invalid items can be retried" },
        { status: 400 }
      );
    }

    await updateQueueItem(item.id, {
      status: "pending",
      attemptCount: 0,
      lastError: null,
    });

    // Re-inicia o fluxo de verificação e agendamento
    const resetItem = { ...item, status: "pending" as const, attemptCount: 0, lastError: null };
    verifyAndSchedule(resetItem).catch((err) => {
      logger.error("Retry verify-and-schedule failed", {
        itemId: item.id,
        error: err instanceof Error ? err.message : "unknown",
      });
    });

    return NextResponse.json({ success: true, itemId: item.id });
  } catch (error) {
    logger.error("Retry error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
