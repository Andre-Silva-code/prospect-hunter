import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProspectingPage from "@/app/(app)/prospecting/page";

describe("Prospecting page - GMN audit flow", () => {
  beforeEach(() => {
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("lead-created-1");
    window.localStorage.clear();
  });

  it("saves GMN lead with generated message after clicking 'Oferecer Análise'", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/leads" && method === "GET") {
        return {
          ok: true,
          status: 200,
          json: async () => [],
        } as Response;
      }

      if (url === "/api/auth/me" && method === "GET") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: "session-user-1" }),
        } as Response;
      }

      if (url === "/api/prospecting/search" && method === "POST") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [
              {
                id: "prospect-1",
                company: "Clinica GMN Teste",
                niche: "Estetica",
                region: "SP",
                monthlyBudget: "R$ 10k",
                score: 84,
                priority: "Alta",
                trigger: "Perfil sem otimização",
                source: "Google Meu Negócio",
                icp: "Clinicas esteticas premium",
                contact: "(11) 98888-7777",
              },
            ],
            connectorStatus: { "Google Meu Negócio": "ok: 1 lead" },
          }),
        } as Response;
      }

      if (url.startsWith("/api/outreach/check?contact=") && method === "GET") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: "found", phone: "5511988887777" }),
        } as Response;
      }

      if (url === "/api/leads" && method === "POST") {
        return {
          ok: true,
          status: 201,
          json: async () => ({}),
        } as Response;
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response;
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<ProspectingPage />);

    fireEvent.click(screen.getByRole("button", { name: /buscar oportunidades/i }));

    const offerButton = await screen.findByRole("button", { name: /oferecer análise/i });
    fireEvent.click(offerButton);

    await waitFor(() => {
      const hasCheckCall = fetchMock.mock.calls.some(([input]) =>
        String(input).startsWith("/api/outreach/check?contact=")
      );
      expect(hasCheckCall).toBe(true);
    });

    const postCalls = fetchMock.mock.calls.filter(
      ([input, init]) => String(input) === "/api/leads" && (init?.method ?? "GET") === "POST"
    );
    expect(postCalls).toHaveLength(1);

    const [, init] = postCalls[0];
    const payload = JSON.parse(String(init?.body)) as {
      userId: string;
      company: string;
      message: string;
      source: string;
      contact: string;
    };

    expect(payload.userId).toBe("session-user-1");
    expect(payload.company).toBe("Clinica GMN Teste");
    expect(payload.source).toBe("Google Meu Negócio");
    expect(payload.contact).toBe("(11) 98888-7777");
    expect(payload.message.trim().length).toBeGreaterThan(0);
  });
});
