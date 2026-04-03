import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth-session";
import { checkWhatsAppNumber, isUazapiConfigured } from "@/lib/connectors/uazapi";
import { normalizePhoneForWhatsApp } from "@/lib/connectors/utils";

export type WhatsAppCheckResult =
  | { status: "found"; jid: string; phone: string }
  | { status: "not_found"; phone: string }
  | { status: "no_phone" }
  | { status: "uazapi_off" };

/**
 * GET /api/outreach/check?contact=...
 *
 * Recebe o campo `contact` de um lead (pode ser "website | phone" ou só phone)
 * e retorna se o número existe no WhatsApp.
 */
export async function GET(request: Request): Promise<NextResponse<WhatsAppCheckResult>> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ status: "uazapi_off" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const contact = searchParams.get("contact") ?? "";

  // Extrair telefone do campo contact (pode vir como "site.com | (11) 99999-9999")
  const phone = extractPhone(contact);
  if (!phone) {
    return NextResponse.json({ status: "no_phone" });
  }

  if (!isUazapiConfigured()) {
    return NextResponse.json({ status: "uazapi_off" });
  }

  const result = await checkWhatsAppNumber(phone);

  if (result.exists && result.jid) {
    return NextResponse.json({ status: "found", jid: result.jid, phone });
  }

  return NextResponse.json({ status: "not_found", phone });
}

function extractPhone(contact: string): string | null {
  const parts = contact.split("|").map((p) => p.trim());
  for (const part of parts) {
    const normalized = normalizePhoneForWhatsApp(part);
    if (normalized) return normalized;
  }
  return null;
}
