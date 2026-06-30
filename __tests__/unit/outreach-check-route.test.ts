import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/outreach/check/route";
import { getSessionUser } from "@/lib/auth-session";
import { checkWhatsAppNumber, isUazapiConfigured } from "@/lib/connectors/uazapi";

vi.mock("@/lib/auth-session", () => ({
  getSessionUser: vi.fn(),
}));

vi.mock("@/lib/connectors/uazapi", () => ({
  checkWhatsAppNumber: vi.fn(),
  isUazapiConfigured: vi.fn(),
}));

describe("GET /api/outreach/check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUser).mockResolvedValue({
      id: "user-1",
      name: "Owner",
      email: "owner@example.com",
    });
    vi.mocked(isUazapiConfigured).mockReturnValue(true);
  });

  it("uses phone query param directly", async () => {
    vi.mocked(checkWhatsAppNumber).mockResolvedValue({
      exists: true,
      jid: "5511988887777@s.whatsapp.net",
    });

    const response = await GET(
      new Request("http://localhost/api/outreach/check?phone=%2B55%2011%2098888-7777")
    );
    const payload = (await response.json()) as { status: string; phone?: string; jid?: string };

    expect(response.status).toBe(200);
    expect(payload.status).toBe("found");
    expect(payload.phone).toBe("5511988887777");
    expect(payload.jid).toBe("5511988887777@s.whatsapp.net");
    expect(checkWhatsAppNumber).toHaveBeenCalledWith("5511988887777");
  });

  it("extracts phone from contact with multiple separators", async () => {
    vi.mocked(checkWhatsAppNumber).mockResolvedValue({
      exists: false,
      jid: null,
    });

    const response = await GET(
      new Request("http://localhost/api/outreach/check?contact=site.com%20/%20(11)%2097777-6666")
    );
    const payload = (await response.json()) as { status: string; phone?: string };

    expect(response.status).toBe(200);
    expect(payload.status).toBe("not_found");
    expect(payload.phone).toBe("5511977776666");
    expect(checkWhatsAppNumber).toHaveBeenCalledWith("5511977776666");
  });

  it("returns no_phone when neither phone nor contact contain a valid number", async () => {
    const response = await GET(new Request("http://localhost/api/outreach/check?contact=@perfil"));
    const payload = (await response.json()) as { status: string };

    expect(response.status).toBe(200);
    expect(payload.status).toBe("no_phone");
    expect(checkWhatsAppNumber).not.toHaveBeenCalled();
  });
});
