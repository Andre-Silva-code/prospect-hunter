import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProspectingWorkspace } from "@/components/prospecting-workspace";
import type { LeadRecord } from "@/types/prospecting";

function createResponse(payload: unknown) {
  return {
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response;
}

function mockFetch(initialLeads: LeadRecord[]) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url === "/api/leads" && method === "GET") {
      return Promise.resolve(createResponse(initialLeads));
    }

    if (url === "/api/leads" && method === "POST") {
      return Promise.resolve(createResponse({}));
    }

    if (url.startsWith("/api/leads/") && method === "PATCH") {
      return Promise.resolve(createResponse({}));
    }

    return Promise.resolve(createResponse([]));
  });

  vi.stubGlobal("fetch", fetchMock);
}

function buildLead(overrides: Partial<LeadRecord>): LeadRecord {
  return {
    id: "lead-1",
    userId: "owner",
    company: "Clinica Alpha",
    niche: "Estetica premium",
    region: "Sao Paulo",
    monthlyBudget: "R$ 12k",
    contact: "instagram @alpha",
    trigger: "Anuncio ativo e funil simples",
    stage: "Novo",
    score: 90,
    priority: "Alta",
    message: "Oi, time da Clinica Alpha.",
    contactStatus: "Pendente",
    createdAt: "2026-03-10T00:00:00.000Z",
    ...overrides,
  };
}

describe("Prospecting workspace", () => {
  beforeEach(() => {
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("lead-1");
    window.localStorage.setItem(
      "prospect-hunter-user",
      JSON.stringify({ id: "owner", name: "Operador 1" })
    );
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("creates a lead and advances it through the pipeline", async () => {
    mockFetch([]);

    render(
      <ProspectingWorkspace
        sessionUser={{ id: "owner", name: "Operador 1", email: "owner@agency.com" }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Leads totais")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Empresa"), {
      target: { value: "Nova Clinica Performance" },
    });
    fireEvent.change(screen.getByLabelText("Nicho"), {
      target: { value: "Estetica" },
    });
    fireEvent.change(screen.getByLabelText("Região"), {
      target: { value: "Sao Paulo" },
    });
    fireEvent.change(screen.getByLabelText("Verba mensal"), {
      target: { value: "R$ 10k" },
    });
    fireEvent.change(screen.getByLabelText("Contato"), {
      target: { value: "instagram @novaclinica" },
    });
    fireEvent.change(screen.getByLabelText("Gatilho de abordagem"), {
      target: { value: "Anuncios com oferta fraca e sem remarketing." },
    });

    fireEvent.click(screen.getByRole("button", { name: /adicionar lead/i }));

    const novoColumn = await screen
      .findByRole("heading", { name: "Novo" })
      .then((node) => node.closest("section"));
    expect(novoColumn).not.toBeNull();
    expect(
      within(novoColumn as HTMLElement).getByText("Nova Clinica Performance")
    ).toBeInTheDocument();
    expect(within(novoColumn as HTMLElement).getByText(/alta/i)).toBeInTheDocument();
    expect(within(novoColumn as HTMLElement).getByText(/pendente/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /avançar etapa/i }));

    const contatoColumn = screen.getByRole("heading", { name: "Contato" }).closest("section");
    expect(contatoColumn).not.toBeNull();
    expect(
      within(contatoColumn as HTMLElement).getByText("Nova Clinica Performance")
    ).toBeInTheDocument();
  });

  it("generates a contextual outreach message for a lead", async () => {
    mockFetch([buildLead({})]);

    render(
      <ProspectingWorkspace
        sessionUser={{ id: "owner", name: "Operador 1", email: "owner@agency.com" }}
      />
    );
    await screen.findAllByText("Clinica Alpha");

    fireEvent.click(screen.getByRole("button", { name: /gerar mensagem/i }));

    expect(screen.getByText(/mensagem sugerida/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/oi, time da clinica alpha/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/mensagem do lead clinica alpha/i), {
      target: { value: "Mensagem editada para Clinica Alpha" },
    });
    fireEvent.click(screen.getByRole("button", { name: /copiar mensagem/i }));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "Mensagem editada para Clinica Alpha"
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /marcar enviada/i }));
    expect(screen.getByText(/^mensagem enviada$/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /marcar respondeu/i }));
    expect(screen.getByText(/^respondeu$/i)).toBeInTheDocument();
  });

  it("filters leads by search and priority", async () => {
    mockFetch([
      buildLead({}),
      buildLead({
        id: "lead-2",
        company: "Studio Beta",
        niche: "Pilates",
        region: "Curitiba",
        monthlyBudget: "R$ 2k",
        contact: "site",
        trigger: "Sem midia ativa",
        score: 45,
        priority: "Baixa",
        message: "Mensagem Beta",
      }),
    ]);

    render(
      <ProspectingWorkspace
        sessionUser={{ id: "owner", name: "Operador 1", email: "owner@agency.com" }}
      />
    );
    await screen.findAllByText("Clinica Alpha");

    fireEvent.change(screen.getByLabelText("Buscar lead"), {
      target: { value: "Alpha" },
    });
    expect(screen.getAllByText("Clinica Alpha").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Studio Beta")).toHaveLength(0);

    fireEvent.change(screen.getByLabelText("Buscar lead"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Prioridade"), {
      target: { value: "Baixa" },
    });

    expect(screen.getAllByText("Studio Beta").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Clinica Alpha")).toHaveLength(0);
  });

  it("shows operational metrics and the prioritized follow-up queue", async () => {
    mockFetch([
      buildLead({ contactStatus: "Mensagem enviada", stage: "Contato" }),
      buildLead({
        id: "lead-2",
        company: "Studio Beta",
        niche: "Pilates",
        region: "Curitiba",
        monthlyBudget: "R$ 2k",
        contact: "site",
        trigger: "Sem midia ativa",
        score: 45,
        priority: "Baixa",
        message: "Mensagem Beta",
      }),
      buildLead({
        id: "lead-3",
        company: "Oral Prime",
        niche: "Odonto premium",
        region: "Rio",
        monthlyBudget: "R$ 15k",
        contact: "whatsapp",
        trigger: "Campanha ativa e sem follow-up forte",
        stage: "Diagnóstico",
        score: 95,
        priority: "Alta",
        message: "Mensagem Oral Prime",
      }),
      buildLead({
        id: "lead-4",
        company: "Melo Advogados",
        niche: "Juridico",
        region: "Belo Horizonte",
        monthlyBudget: "R$ 8k",
        contact: "site",
        trigger: "Funil consultivo sem mídia estável",
        stage: "Proposta",
        score: 72,
        priority: "Media",
        message: "Mensagem Melo",
        contactStatus: "Respondeu",
      }),
    ]);

    render(
      <ProspectingWorkspace
        sessionUser={{ id: "owner", name: "Operador 1", email: "owner@agency.com" }}
      />
    );
    await screen.findByText("Leads totais");

    expect(screen.getByText("Leads totais")).toBeInTheDocument();
    expect(screen.getByText("Taxa de resposta")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText(/follow-ups prioritários/i)).toBeInTheDocument();
    expect(screen.getAllByText("Oral Prime").length).toBeGreaterThan(0);
    expect(screen.getByText(/#1 da fila/i)).toBeInTheDocument();
  });
});
