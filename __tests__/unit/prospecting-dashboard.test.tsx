import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProspectingDashboard } from "@/components/prospecting-dashboard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("Prospecting dashboard", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue([]),
      } as unknown as Response)
    );
  });

  it("renders the paid traffic prospecting system content", async () => {
    render(
      <ProspectingDashboard
        sessionUser={{ id: "owner", name: "Operador 1", email: "owner@agency.com" }}
      />
    );

    expect(
      screen.getByRole("heading", {
        name: /pipeline enxuto para encontrar, qualificar e abordar clientes/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText(/clinicas estéticas premium/i)).toBeInTheDocument();
    expect(screen.getByText(/lista de oportunidades/i)).toBeInTheDocument();
    expect(screen.getByText(/oral prime jardins/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });
});
